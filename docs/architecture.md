# Evening - Content Scraping & Caching Architecture

## Overview

Evening is a content scraping system with intelligent memoization. It treats all scraping operations as pure functions: same input → same output (unless explicitly invalidated). The system caches all fetched content (JSON, images, videos) in a content-addressed storage system backed by SQLite.

## Core Concepts

### Memoization-First Design

Every scraping function is memoized:

- Function calls are identified by `sha256(function_name + JSON.stringify(args))`
- **IMPORTANT**: Object arguments must have keys in a consistent order for cache hits
- Results are stored in content-addressed files: `data/scraped/{content_hash}.{ext}`
- Same content from different calls = single file (deduplication)

### Content-Addressed Storage

All scraped content is stored by content hash:

```
data/
├── db.sqlite              # Index of function calls and content
└── scraped/
    ├── {hash}.json        # JSON responses
    ├── {hash}.jpg         # Images
    ├── {hash}.mp4         # Videos
    └── ...
```

Benefits:

- Automatic deduplication (same image from 10 URLs = 1 file)
- Immutable content (hash changes if content changes)
- Easy to identify orphaned content via reference counting

## Database Schema

### `calls` Table

Tracks memoized function invocations.

```typescript
{
  args_hash: string (PK)           // sha256(function_name + args_json)
  function_name: string            // e.g., 'reddit.getPost', 'reddit.getImage'
  args_json: string                // JSON.stringify(args) - MUST have consistent key order!
  content_hash: string             // FK to content.hash

  // Timing metadata
  created_at: timestamp            // First fetch time
  last_accessed: timestamp         // Most recent cache hit
  fetch_duration_ms: number        // Initial fetch duration
}
```

**Key Notes:**

- `args_json` must have object keys in the same order for cache hits
- Cache hits update `last_accessed` but not `fetch_duration_ms`
- `function_name` scopes the cache (same args, different functions = different cache entries)

### `content` Table

Registry of all scraped content files.

```typescript
{
  hash: string (PK)                // sha256 of file content
  file_path: string                // Relative path: scraped/{hash}.{ext}
  size_bytes: number               // File size
  mime_type: string                // Content type (image/jpeg, application/json, etc.)
  reference_count: number          // How many calls reference this content
}
```

**Key Notes:**

- `reference_count` enables safe garbage collection
- Multiple `calls` can point to same `content` (deduplication)
- `mime_type` is the single source of truth for content type

## Memoization Decorator

### Basic Usage

```typescript
import { memoize } from './core/cache';

class Reddit {
  @memoize({ provider: 'reddit' })
  async getPost({ subreddit, id, title }: GetPostParams) {
    const response = await fetch(url, headers);
    return response.json();
  }

  @memoize({ provider: 'reddit' })
  async getImage(url: string) {
    const response = await fetch(url);
    return response.arrayBuffer();
  }
}
```

### Behavior

1. **Cache Hit**: Returns cached content immediately
2. **Cache Miss**:
   - Executes function
   - Hashes result content
   - Checks if content hash exists (deduplication)
   - Saves content if new
   - Records call in database
   - Returns result

### Cache Invalidation

```typescript
// Option 1: Add version to args
await reddit.getPost({ subreddit: 'x', id: 'y', version: '2024-10-26' });

// Option 2: Force refresh flag
await reddit.getPost({ subreddit: 'x', id: 'y' }, { ignoreCache: true });

// Option 3: Manual database cleanup
db.deleteCalls({ function_name: 'reddit.getPost', ... });
```

## Provider Pattern

Each content source (Reddit, Twitter, etc.) is a provider with memoized methods.

```typescript
// src/reddit/index.ts
export class Reddit {
  @memoize({ provider: 'reddit' })
  async getPost(params: GetPostParams) {
    // Fetches post JSON from Reddit API
  }

  @memoize({ provider: 'reddit' })
  async getMedia({ url }: GetMediaParams) {
    // Fetches binary media content (images, videos)
    // Returns ArrayBuffer
  }

  async getImage(params: GetPostParams) {
    // Extracts image URL from post and fetches it
    // Returns { metadata, content: ArrayBuffer }
  }

  async getVideo(params: GetPostParams) {
    // Extracts video URL from post and fetches it
    // Returns { metadata, content: ArrayBuffer }
  }

  async getGallery(params: GetPostParams) {
    // Extracts all images from gallery post and fetches them
    // Returns Array<{ metadata, content: ArrayBuffer }>
  }
}
```

**Key Principles:**

- Each provider lives in `src/{provider}/`
- Methods are small, focused, and memoizable
- Complex operations (e.g., "get post + all comments + all images") compose multiple memoized calls
- No separate "session" or "scrape" tracking - just cached function calls

### Media Methods

The Reddit provider implements specialized methods for different media types:

#### `getMedia({ url })`

Low-level method that fetches binary content from any URL. Decorated with `@memoize` to cache downloaded media by URL.

```typescript
const content = await reddit.getMedia({ url: 'https://i.redd.it/...' });
// Returns: ArrayBuffer
```

#### `getImage(params)`

Extracts and downloads a single image from a Reddit post. Handles two cases:

1. **Preview images**: Uses `post.preview.images[0].source.url` for high-quality versions
2. **Direct links**: Falls back to `post.url` if it's a direct image link

```typescript
const { metadata, content } = await reddit.getImage({
  subreddit: 'pics',
  id: '1abc123',
  title: 'beautiful_sunset',
});
// metadata: { url, width?, height?, type: 'image' }
// content: ArrayBuffer
```

#### `getVideo(params)`

Extracts and downloads a video from a Reddit post. Uses `post.media.reddit_video.fallback_url` for the video file.

```typescript
const { metadata, content } = await reddit.getVideo({
  subreddit: 'videos',
  id: '1xyz789',
  title: 'amazing_video',
});
// metadata: { url, fallbackUrl?, hlsUrl?, dashUrl?, width?, height?, duration? }
// content: ArrayBuffer
```

#### `getGallery(params)`

Extracts and downloads all images from a Reddit gallery post. Processes `post.media_metadata` to find all gallery items.

**Important**: Reddit gallery URLs contain `amp;` encoding that must be removed for valid URLs.

```typescript
const items = await reddit.getGallery({
  subreddit: 'pics',
  id: '1def456',
  title: 'photo_collection',
});
// Returns: Array<{ metadata: GalleryItem, content: ArrayBuffer }>
// Each item has: { id, url, width?, height? }
```

**Key Features:**

- All media methods compose `getPost` + `getMedia` calls
- Both calls are independently memoized (deduplication)
- Same image from different posts = single cached file
- Metadata extraction happens in the method, not cached
- Binary content cached via `getMedia`

## Export & Traversal

Since content relationships are stored in the JSON itself:

```typescript
// Fetch post (cached)
const post = await reddit.getPost({ subreddit: 'x', id: 'y' });

// Parse to find media URLs
const imageUrls = extractImageUrls(post);

// Fetch each image (cached if previously fetched)
for (const url of imageUrls) {
  await reddit.getMedia(url);
}

// Export: Copy all referenced content
exportSubgraph(postHash); // Parses JSON, follows refs, copies files
```

No explicit graph storage needed - traverse by parsing cached JSON responses.

## Future Considerations

### Versioning

Track content changes over time:

- Store multiple hashes per URL
- Add `version` or `fetched_at` to track evolution

### Cache Eviction

- Manual: Delete by `args_hash`, `function_name`, or date range
- Automatic: LRU eviction based on `last_accessed` and size limits
- Orphan cleanup: Delete content where `reference_count = 0`

### HTTP Caching Headers

Respect `etag`, `last-modified`, `cache-control`:

- Store in `calls` table
- Conditional requests on cache miss
- Update only if content changed

### Pagination

Handle paginated results transparently:

```typescript
@memoize()
async getComments({ postId, cursor = null }) {
  // Each page is cached separately
  // cursor in args ensures different cache entries
}
```

## Implementation Checklist

- [x] Set up Drizzle ORM with bun:sqlite
- [x] Create database schema (`calls`, `content`)
- [x] Implement content storage (hash, save to `scraped/`)
- [x] Implement memoize decorator
- [x] Migrate Reddit provider to use memoization
- [x] Implement media methods (getImage, getVideo, getGallery)
- [ ] Add cache invalidation options
- [x] Implement reference counting
- [ ] Add export/traversal utilities
- [x] Error handling and logging
- [ ] Tests

## Design Decisions

### Why content-addressed storage?

- Automatic deduplication across providers and time
- Immutable content enables confident caching
- Easy to verify integrity (rehash and compare)

### Why single database + files?

- Database for fast lookups (O(1) by args_hash)
- Files for flexible content (JSON, binary, any size)
- Avoids blob storage in SQLite (performance, portability)

### Why no separate graph/edges table?

- Relationships already in JSON responses
- Traversal = parse + recursive memoized calls
- Simpler schema, less duplication
- Export can reconstruct graph on-demand

### Why function-level memoization?

- Natural granularity (each API call = function)
- Composable (complex operations = multiple calls)
- No manual cache management
- Works across different workflows automatically
