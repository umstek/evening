# Reddit Provider

Comprehensive Reddit content scraper with intelligent memoization and media handling.

## Overview

The Reddit provider implements a complete scraping solution for Reddit content with support for:
- Posts (text, images, videos, galleries)
- Subreddit listings with pagination
- User profiles and post history
- All media types (images, galleries, videos, previews)
- Automatic caching and deduplication

## API Methods

### Core Methods (Memoized)

#### `getPost({ subreddit, id, title })`

Fetch a complete Reddit post with all its data.

**Parameters:**
```typescript
{
	subreddit: string;  // Subreddit name (without r/)
	id: string;         // Post ID (e.g., '1abc123')
	title: string;      // Post title slug
}
```

**Returns:** Complete post JSON including comments

**Example:**
```typescript
const post = await reddit.getPost({
	subreddit: 'pics',
	id: '92dd8',
	title: 'test_post_please_ignore',
});
```

---

#### `getMedia({ url })`

Fetch media content from a URL (images, videos, etc.).

**Parameters:**
```typescript
{
	url: string;  // Direct URL to media file
}
```

**Returns:** `Buffer` containing the raw media data

**Example:**
```typescript
const imageBuffer = await reddit.getMedia({
	url: 'https://i.redd.it/example.jpg',
});
```

---

#### `getSubreddit({ name, sort, limit, after })`

Fetch posts from a subreddit listing.

**Parameters:**
```typescript
{
	name: string;                              // Subreddit name
	sort?: 'hot' | 'new' | 'top' | 'rising';  // Sort order (default: 'hot')
	limit?: number;                            // Posts per page (default: 25)
	after?: string;                            // Pagination cursor (optional)
}
```

**Returns:** Subreddit listing with posts

**Example:**
```typescript
const listing = await reddit.getSubreddit({
	name: 'pics',
	sort: 'hot',
	limit: 50,
});

// Access posts
const posts = listing.data.children;
for (const { data: post } of posts) {
	console.log(`${post.title}: ${post.url}`);
}

// Pagination
const nextPage = await reddit.getSubreddit({
	name: 'pics',
	sort: 'hot',
	limit: 50,
	after: listing.data.after,  // Use 'after' cursor
});
```

---

#### `getUser({ username, sort, limit })`

Fetch user profile and post history.

**Parameters:**
```typescript
{
	username: string;                                      // Reddit username
	sort?: 'new' | 'hot' | 'top' | 'controversial';       // Sort order (default: 'new')
	limit?: number;                                        // Posts per page (default: 25)
}
```

**Returns:** User data with posts

**Example:**
```typescript
const userData = await reddit.getUser({
	username: 'example_user',
	sort: 'top',
	limit: 10,
});

const posts = userData.data.children;
for (const { data: post } of posts) {
	console.log(`${post.title} in r/${post.subreddit}`);
}
```

---

### Media Extraction (Not Memoized)

#### `extractMedia(postData)`

Extract all media URLs from a post response.

**Parameters:**
- `postData`: Raw post data from `getPost()`

**Returns:**
```typescript
{
	mainMedia: MediaItem[];       // Primary images/videos from post.url
	previews: MediaItem[];        // All preview resolutions
	thumbnails: MediaItem[];      // Post thumbnail
	galleryItems: MediaItem[];    // Gallery images (if is_gallery)
	videoData: MediaItem[];       // Video URLs (fallback, DASH, HLS)
}
```

**MediaItem Structure:**
```typescript
{
	url: string;
	type: 'image' | 'video' | 'gallery_image' | 'preview' | 'thumbnail';
	width?: number;
	height?: number;
	caption?: string;
	mediaId?: string;
}
```

**Example:**
```typescript
const post = await reddit.getPost({ subreddit, id, title });
const media = reddit.extractMedia(post);

console.log(`Found ${media.mainMedia.length} main media items`);
console.log(`Found ${media.galleryItems.length} gallery items`);
console.log(`Found ${media.previews.length} preview images`);
console.log(`Found ${media.videoData.length} video URLs`);
```

---

### Composite Operations

#### `fetchPostWithMedia(params)`

Fetch a post and download all its media in one operation.

**Parameters:** Same as `getPost()`

**Returns:**
```typescript
{
	post: any;                           // Complete post data
	media: ExtractedMedia;               // Extracted media structure
	downloadedMedia: Map<string, Buffer>; // URL -> Buffer mapping
}
```

**Example:**
```typescript
const result = await reddit.fetchPostWithMedia({
	subreddit: 'pics',
	id: '1abc123',
	title: 'amazing_photo',
});

console.log(`Downloaded ${result.downloadedMedia.size} media items`);

// Save media to disk
for (const [url, buffer] of result.downloadedMedia) {
	const filename = url.split('/').pop();
	await Bun.write(`./output/${filename}`, buffer);
}
```

---

## Media Types Support

### Single Images

Posts with `post_hint: "image"` or direct image URLs.

**Detection:**
- `post.post_hint === 'image'`
- URL ends with `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

**Location:** `post.url`

**Extraction:** `media.mainMedia[0]`

---

### Gallery Posts

Posts with multiple images (`is_gallery: true`).

**Detection:**
- `post.is_gallery === true`
- `post.media_metadata` exists

**Location:** `post.media_metadata` object

**Extraction:** `media.galleryItems`

**Example:**
```typescript
const media = reddit.extractMedia(post);

if (media.galleryItems.length > 0) {
	console.log(`Gallery with ${media.galleryItems.length} images`);

	for (const item of media.galleryItems) {
		console.log(`- ${item.mediaId}: ${item.width}x${item.height}`);
		const buffer = await reddit.getMedia({ url: item.url });
		await Bun.write(`./gallery/${item.mediaId}.jpg`, buffer);
	}
}
```

---

### Reddit-Hosted Videos

Videos hosted on Reddit (`is_video: true`).

**Detection:**
- `post.is_video === true`
- `post.media.reddit_video` exists

**Formats Available:**
1. **Fallback URL**: MP4 video (most compatible)
2. **DASH URL**: MPEG-DASH streaming
3. **HLS URL**: HTTP Live Streaming

**Location:** `post.media.reddit_video`

**Extraction:** `media.videoData`

**Example:**
```typescript
const media = reddit.extractMedia(post);

if (media.videoData.length > 0) {
	// Download fallback MP4 (most compatible)
	const fallbackVideo = media.videoData.find(v =>
		v.url.includes('DASH')
	);

	if (fallbackVideo) {
		const buffer = await reddit.getMedia({ url: fallbackVideo.url });
		await Bun.write('./video.mp4', buffer);
	}
}
```

---

### Preview Images

Multiple resolution versions of images.

**Detection:**
- `post.preview.images` exists

**Resolutions:**
- `source`: Original/highest quality
- `resolutions[]`: Smaller versions (640px, 320px, 108px, etc.)

**Location:** `post.preview.images`

**Extraction:** `media.previews`

**Example:**
```typescript
const media = reddit.extractMedia(post);

// Get highest quality preview
const highestQuality = media.previews
	.filter(p => p.type === 'preview')
	.sort((a, b) => (b.width || 0) - (a.width || 0))[0];

if (highestQuality) {
	const buffer = await reddit.getMedia({ url: highestQuality.url });
	console.log(`Downloaded ${highestQuality.width}x${highestQuality.height} preview`);
}
```

---

### Thumbnails

Small preview images for posts.

**Detection:**
- `post.thumbnail` starts with `http`

**Location:** `post.thumbnail`

**Extraction:** `media.thumbnails[0]`

---

## Usage Patterns

### Pattern 1: Scrape Single Post

```typescript
import { Reddit } from './reddit';

const reddit = new Reddit();

// Fetch post
const post = await reddit.getPost({
	subreddit: 'earthporn',
	id: '1abc123',
	title: 'beautiful_landscape',
});

// Extract and download media
const media = reddit.extractMedia(post);

for (const item of media.mainMedia) {
	const buffer = await reddit.getMedia({ url: item.url });
	await Bun.write(`./downloads/${item.type}.jpg`, buffer);
}
```

---

### Pattern 2: Scrape Subreddit

```typescript
const reddit = new Reddit();

// Fetch first page
let listing = await reddit.getSubreddit({
	name: 'pics',
	sort: 'hot',
	limit: 25,
});

let processedCount = 0;

while (listing && processedCount < 100) {
	const posts = listing.data.children;

	for (const { data: post } of posts) {
		console.log(`Processing: ${post.title}`);

		// Fetch full post with media
		const result = await reddit.fetchPostWithMedia({
			subreddit: post.subreddit,
			id: post.id,
			title: post.title.toLowerCase().replace(/\s+/g, '_'),
		});

		console.log(`  Downloaded ${result.downloadedMedia.size} media items`);
		processedCount++;
	}

	// Next page
	if (listing.data.after) {
		listing = await reddit.getSubreddit({
			name: 'pics',
			sort: 'hot',
			limit: 25,
			after: listing.data.after,
		});
	} else {
		break;
	}
}

console.log(`Processed ${processedCount} posts`);
```

---

### Pattern 3: Scrape User History

```typescript
const reddit = new Reddit();

const userData = await reddit.getUser({
	username: 'example_user',
	sort: 'top',
	limit: 50,
});

const posts = userData.data.children;

for (const { data: post } of posts) {
	// Only process posts with images
	if (post.post_hint === 'image' || post.is_gallery) {
		const result = await reddit.fetchPostWithMedia({
			subreddit: post.subreddit,
			id: post.id,
			title: post.title.toLowerCase().replace(/\s+/g, '_'),
		});

		console.log(`${post.title}: ${result.downloadedMedia.size} items`);
	}
}
```

---

### Pattern 4: Download Gallery

```typescript
const reddit = new Reddit();

const post = await reddit.getPost({
	subreddit: 'pics',
	id: 'gallery123',
	title: 'my_photo_gallery',
});

const media = reddit.extractMedia(post);

if (media.galleryItems.length > 0) {
	console.log(`Downloading gallery with ${media.galleryItems.length} images`);

	for (let i = 0; i < media.galleryItems.length; i++) {
		const item = media.galleryItems[i];
		const buffer = await reddit.getMedia({ url: item.url });

		const filename = `gallery_${String(i + 1).padStart(2, '0')}.jpg`;
		await Bun.write(`./gallery/${filename}`, buffer);

		console.log(`  ${i + 1}/${media.galleryItems.length}: ${filename}`);
	}

	console.log('Gallery download complete');
}
```

---

## Caching Behavior

All methods decorated with `@memoize` are automatically cached:

### Cache Keys

- **getPost**: `sha256('reddit.getPost' + JSON({ subreddit, id, title }))`
- **getMedia**: `sha256('reddit.getMedia' + JSON({ url }))`
- **getSubreddit**: `sha256('reddit.getSubreddit' + JSON({ name, sort, limit, after }))`
- **getUser**: `sha256('reddit.getUser' + JSON({ username, sort, limit }))`

### Cache Storage

- **Database**: `./data/db.sqlite` (call metadata, timestamps)
- **Files**: `./data/scraped/{content_hash}.{ext}` (actual content)

### Cache Hits

Second and subsequent calls with identical parameters return instantly from cache:

```typescript
// First call: Fetches from Reddit API, saves to cache
const post1 = await reddit.getPost({ subreddit: 'pics', id: 'abc', title: 'test' });
// Takes ~500ms

// Second call: Returns from cache instantly
const post2 = await reddit.getPost({ subreddit: 'pics', id: 'abc', title: 'test' });
// Takes ~5ms
```

### Cache Invalidation

To refetch content:

1. **Add version parameter**: Creates new cache entry
   ```typescript
   const post = await reddit.getPost({
   	subreddit: 'pics',
   	id: 'abc',
   	title: 'test',
   	version: '2025-11-14',  // Forces new fetch
   });
   ```

2. **Clear from database**: Delete specific cache entries
   ```bash
   bun sqlite3 data/db.sqlite "DELETE FROM calls WHERE function_name = 'reddit.getPost' AND args_json LIKE '%abc%';"
   ```

---

## Error Handling

All methods implement comprehensive error handling:

### HTTP Errors

```typescript
try {
	const post = await reddit.getPost({ subreddit, id, title });
} catch (error) {
	// Error includes status code and response body
	console.error(`Failed to fetch post: ${error.message}`);
	// Example: "Reddit API error: 404 Not Found - Post not found"
}
```

### Media Download Errors

The `fetchPostWithMedia()` method continues on individual media failures:

```typescript
const result = await reddit.fetchPostWithMedia(params);

// Some media may have failed - check downloadedMedia size vs total URLs
const totalUrls = result.media.mainMedia.length +
	result.media.galleryItems.length +
	result.media.videoData.length;

const successRate = result.downloadedMedia.size / totalUrls;
console.log(`Success rate: ${(successRate * 100).toFixed(1)}%`);
```

### JSON Parsing Errors

```typescript
try {
	const post = await reddit.getPost(params);
} catch (error) {
	if (error.message.includes('Failed to parse JSON')) {
		// Reddit returned non-JSON response (rate limit, server error, etc.)
		console.error('Invalid JSON response from Reddit');
	}
}
```

---

## Logging

All operations are logged with structured data:

```json
{"level":30,"module":"reddit","subreddit":"pics","id":"abc","msg":"Fetching post from Reddit API"}
{"level":30,"module":"reddit","statusCode":200,"msg":"Successfully fetched post"}
{"level":30,"module":"reddit","url":"https://i.redd.it/example.jpg","sizeBytes":524288,"msg":"Successfully fetched media"}
```

Log levels:
- `info` (30): Normal operations
- `warn` (40): Recoverable errors (failed media item)
- `error` (50): Unrecoverable errors (API failure)

---

## Type Definitions

```typescript
interface GetPostParams {
	subreddit: string;
	id: string;
	title: string;
}

interface GetMediaParams {
	url: string;
}

interface MediaItem {
	url: string;
	type: "image" | "video" | "gallery_image" | "preview" | "thumbnail";
	width?: number;
	height?: number;
	caption?: string;
	mediaId?: string;
}

interface ExtractedMedia {
	mainMedia: MediaItem[];
	previews: MediaItem[];
	thumbnails: MediaItem[];
	galleryItems: MediaItem[];
	videoData: MediaItem[];
}
```

---

## Testing

Run the provider with examples:

```bash
bun run src/reddit/index.ts
```

The main function demonstrates:
1. Fetching a single post
2. Extracting media from post
3. Downloading specific media
4. Fetching subreddit listings
5. Composite operation (post + all media)

---

## Best Practices

1. **Use composite operations**: `fetchPostWithMedia()` handles everything
2. **Check media type**: Different post types have different media structures
3. **Handle errors gracefully**: Some media may fail, continue with others
4. **Respect rate limits**: Cache prevents repeated API calls
5. **Use pagination cursors**: For subreddit/user scraping
6. **Save incrementally**: Write media to disk as you download

---

## Future Enhancements

- [ ] Comment scraping with media
- [ ] Search API support
- [ ] Crosspost handling
- [ ] Award/flair metadata
- [ ] Rate limit detection and backoff
- [ ] Batch operations with concurrency control
- [ ] Media type detection from content-type header
- [ ] Support for external embeds (YouTube, Twitter, etc.)
