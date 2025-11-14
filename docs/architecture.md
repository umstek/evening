# Evening - Architecture Documentation

## Overview
Evening is a Tampermonkey userscript for OSINT data gathering from social media platforms. It extracts and persists data locally using IndexedDB.

## Architecture Pattern

### Core Components

1. **Platform Classes** (e.g., `Twitter`, `Reddit`)
   - Encapsulate platform-specific data extraction logic
   - Use private methods for DOM querying and data extraction
   - Persist data to IndexedDB via localforage
   - Run on periodic intervals (default: 1000ms)

2. **Data Types**
   - TypeScript interfaces define structured data models
   - Each platform has specific types (e.g., `UserCellData`, `TweetData`, `PostData`)

3. **Storage Strategy**
   - LocalForage (IndexedDB wrapper) for persistent storage
   - Separate store instances per platform
   - Key format: `${path}/__${type}_${uniqueId}`
   - In-memory Map cache to prevent duplicate storage

### Method Patterns

#### getPost Pattern
```typescript
async #getPost() {
  // 1. Query DOM for post elements
  const posts = document.querySelectorAll('selector');

  // 2. Extract data from each element
  for (const post of posts) {
    const data = {
      // Extract relevant fields
    };

    // 3. Create unique key
    const key = `${path}/__post_${uniqueId}`;

    // 4. Check cache and store if new
    if (!this.#cache.has(key)) {
      this.#cache.set(key, data);
      await this.#store.setItem(key, data);
    }
  }
}
```

#### getMedia Pattern
```typescript
async #getMedia() {
  // Extract media URLs (photos, videos, galleries)
  // Store with metadata (type, dimensions, alt text)
}
```

### Public API Methods

- `downloadAll()` - Export all stored data as JSON
- `clear()` - Reset storage and restart collection
- `[Symbol.dispose]()` - Cleanup on destroy

## Platform Implementation: Reddit

### Data Types

**PostData**
- `id` - Reddit post ID
- `subreddit` - Subreddit name
- `title` - Post title
- `author` - Username
- `text` - Post content
- `score` - Upvote count
- `created` - Timestamp
- `url` - Post URL
- `media` - Media metadata

**MediaData**
- `postId` - Parent post ID
- `type` - 'image' | 'video' | 'gallery'
- `url` - Media URL
- `thumbnail` - Thumbnail URL
- `width` - Dimensions
- `height` - Dimensions

**CommentData**
- `id` - Comment ID
- `postId` - Parent post ID
- `author` - Username
- `text` - Comment content
- `score` - Vote count
- `created` - Timestamp
- `depth` - Comment depth

### Key Methods

1. `#getPost()` - Extract post data including metadata
2. `#getMedia()` - Extract photos, videos, galleries
3. `#getComment()` - Extract comment threads

## Best Practices

1. **Clean Code**
   - Use nullish coalescing (`??`) for defaults
   - Optional chaining (`?.`) for safe DOM queries
   - Extract constants for selectors
   - Type safety with TypeScript

2. **Performance**
   - Cache in-memory to avoid duplicate processing
   - Batch DOM queries
   - Async storage operations

3. **Robustness**
   - Handle missing elements gracefully
   - Validate extracted data
   - Use fallback values
