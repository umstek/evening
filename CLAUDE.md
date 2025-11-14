# CLAUDE.md - Evening Project Guide for AI Assistants

> Last Updated: 2025-11-14
> Project: Evening - Content Scraping & Intelligent Memoization System

## Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Reference](#quick-reference)
3. [Codebase Structure](#codebase-structure)
4. [Technology Stack](#technology-stack)
5. [Core Architecture](#core-architecture)
6. [Development Setup](#development-setup)
7. [Key Conventions](#key-conventions)
8. [Working with the Code](#working-with-the-code)
9. [Database Operations](#database-operations)
10. [Testing Guidelines](#testing-guidelines)
11. [Git Workflow](#git-workflow)
12. [Common Tasks](#common-tasks)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview

### What is Evening?

Evening is a **content scraping system with intelligent memoization**. It treats all scraping operations as pure functions where the same input produces the same output (unless explicitly invalidated). The system automatically caches all fetched content (JSON, images, videos) in a content-addressed storage system backed by SQLite.

### Project Vision

The system should:
- Start scraping from a given entry point
- Analyze site structure with AI perspective
- Extract data as structured JSON
- Intelligently follow links (with user confirmation)
- Auto-generate code to fetch media
- Automatically discover data types and generate TypeScript types with quicktype
- Use AI to analyze and rename types
- Generate validation schemas (zod/arctype)

### Current Status

- **Stage**: Early development with core infrastructure complete
- **Code Size**: ~464 lines of TypeScript
- **Recent Focus**: Core caching infrastructure, error handling improvements, type generation setup
- **Active Providers**: Reddit (fully implemented)
- **Historical Providers**: Twitter (partially implemented)

---

## Quick Reference

### Essential Commands

```bash
# Install dependencies
bun install

# Database operations
bun db:generate                    # Generate SQL from schema
bun db:migrate                     # Run migrations
bun run initialize.ts              # Initialize database

# Run providers
bun run src/reddit/index.ts        # Test Reddit provider

# Code quality (handled automatically by Biome)
# No separate lint/format commands needed
```

### Key File Locations

```
/home/user/evening/
├── src/core/cache/               # Memoization & storage core
├── src/reddit/index.ts           # Reddit provider implementation
├── docs/architecture.md          # Detailed architecture guide (252 lines)
├── data/                         # Runtime data (gitignored)
│   ├── db.sqlite                 # SQLite database
│   └── scraped/                  # Content-addressed files
```

### Quick Facts

| Aspect | Details |
|--------|---------|
| Runtime | Bun (not Node.js) |
| Language | TypeScript with experimental decorators |
| Database | SQLite with Drizzle ORM |
| Code Style | Tabs, double quotes (enforced by Biome) |
| Key Pattern | Decorator-based memoization |
| Storage Strategy | Content-addressed files + SQLite index |

---

## Codebase Structure

### Directory Layout

```
/home/user/evening/
├── src/                           # Main source code
│   ├── index.ts                   # Entry point (currently minimal)
│   ├── logger.ts                  # Pino logger instance
│   │
│   ├── core/                      # Core infrastructure
│   │   └── cache/                 # Caching & memoization system
│   │       ├── index.ts           # Public exports
│   │       ├── db.ts              # Drizzle ORM schema (45 lines)
│   │       ├── storage.ts         # Content I/O operations (112 lines)
│   │       ├── memoize.ts         # Decorator implementation (140 lines)
│   │       └── inspect.ts         # Cache inspection utility
│   │
│   └── reddit/                    # Reddit provider
│       └── index.ts               # Reddit API client (125 lines)
│
├── docs/
│   └── architecture.md            # Comprehensive architecture guide
│
├── drizzle/                       # Database migrations
│   ├── 0000_glamorous_sleeper.sql # Initial schema
│   └── meta/_journal.json         # Migration tracking
│
├── data/                          # Runtime data (gitignored)
│   ├── db.sqlite                  # SQLite database
│   └── scraped/                   # Content-addressed storage
│       ├── {hash}.json            # Cached JSON responses
│       ├── {hash}.jpg             # Cached images
│       └── {hash}.mp4             # Cached videos
│
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript configuration
├── biome.json                     # Code formatter/linter config
├── initialize.ts                  # Database initialization
└── README.md                      # Project vision
```

### Module Organization

The codebase follows a **layered, feature-based organization**:

- **`src/core/`**: Shared infrastructure and cross-cutting concerns
- **`src/{provider}/`**: Domain-specific providers (reddit, twitter, etc.)
- **Top-level utilities**: Shared utilities like logger

---

## Technology Stack

### Core Technologies

- **Runtime**: Bun (modern JavaScript runtime with native TypeScript support)
- **Language**: TypeScript 5.x with experimental decorators enabled
- **Database**: SQLite (embedded, file-based)
- **ORM**: Drizzle ORM v0.44.7 (lightweight, fully typed)
- **Logger**: Pino v10.1.0 (high-performance JSON logger)

### Development Tools

- **Code Quality**: Biome v2.3.0 (Rust-based formatter/linter, replaces ESLint + Prettier)
- **TypeScript Config**: @total-typescript/tsconfig v1.0.4 (strict, bundler-optimized)
- **Type Generation**: quicktype-core v23.2.6 (auto-generate TS types from JSON)
- **Migrations**: Drizzle Kit v0.31.5

### Why These Choices?

- **Bun**: Fast runtime with native TypeScript, no build step needed
- **SQLite**: Embedded database, no separate server, easy backup/portability
- **Drizzle**: Lightweight ORM with excellent TypeScript inference
- **Biome**: All-in-one tool (faster than ESLint + Prettier combined)
- **Pino**: High-performance structured logging

---

## Core Architecture

### Memoization-First Design

The entire architecture revolves around treating scraping operations as **pure, memoizable functions**:

```
┌─────────────────────────────────────────────────────────┐
│          Application Layer (Providers)                  │
│  Reddit, Twitter, or other provider classes             │
└────────────────────┬────────────────────────────────────┘
                     │ @memoize decorator
┌────────────────────▼────────────────────────────────────┐
│          Memoization Decorator (memoize.ts)             │
│  • Hash args: sha256(function_name + JSON(args))        │
│  • Check cache in database                              │
│  • Execute function on cache miss                       │
│  • Store result in content-addressed storage            │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────────────┐  ┌──────▼──────────────┐
│  Content Storage     │  │  SQLite Database    │
│  (storage.ts)        │  │  (db.ts)            │
│                      │  │                     │
│  data/scraped/       │  │  Tables:            │
│  ├── {hash}.json     │  │  • calls (index)    │
│  ├── {hash}.jpg      │  │  • content (meta)   │
│  └── {hash}.mp4      │  │                     │
└──────────────────────┘  └─────────────────────┘
```

### Key Architectural Principles

1. **Content-Addressed Storage**: All files named by SHA256(content)
   - Same content from different sources = 1 file
   - Automatic deduplication
   - Immutable content (hash changes if content changes)

2. **Function-Level Memoization**: Each API call is a memoized function
   - Natural granularity (one function = one API endpoint)
   - Composable (complex operations use multiple memoized calls)
   - Zero boilerplate for cache management

3. **SQLite for Index, Files for Content**
   - Database: Fast lookups (O(1) by args_hash)
   - Files: Flexible content (JSON, binary, large files)
   - Avoids SQLite blob inefficiency

4. **Provider Pattern**: Each content source is a separate class
   - Encapsulation per provider
   - Independent iteration
   - Shared memoization infrastructure

5. **No Explicit Graph Storage**: Relationships stored in JSON
   - Parse cached responses to find links
   - Traverse by recursive memoized calls
   - Simpler schema, no duplication

### Database Schema

#### `calls` Table (Function Call Index)

```typescript
{
  args_hash: string (PK)           // sha256(function_name + args_json)
  function_name: string            // e.g., 'reddit.getPost'
  args_json: string                // JSON.stringify(args) - CONSISTENT KEY ORDER!
  content_hash: string             // FK to content.hash

  created_at: timestamp            // First fetch time
  last_accessed: timestamp         // Most recent cache hit
  fetch_duration_ms: number        // Initial fetch duration (metrics)
}

Indexes:
- function_name_idx ON function_name
- content_hash_idx ON content_hash
```

**Critical Note**: `args_json` must have consistent key order for cache hits!

#### `content` Table (Content Registry)

```typescript
{
  hash: string (PK)                // sha256 of file content
  file_path: string                // Relative path: scraped/{hash}.{ext}
  size_bytes: number               // File size
  mime_type: string                // Content type (determines extension)
  reference_count: number          // For garbage collection
}
```

**Key Features**:
- Reference counting enables safe cleanup
- Multiple calls can reference same content (deduplication)
- MIME type is single source of truth

---

## Development Setup

### Prerequisites

- **Bun**: Install from [bun.sh](https://bun.sh)
- **Git**: For version control

### Initial Setup

```bash
# Clone repository (if needed)
git clone <repo-url>
cd evening

# Install dependencies
bun install

# Initialize database
bun run initialize.ts

# Test the system (run Reddit provider)
bun run src/reddit/index.ts
```

### Project Structure After Setup

```
data/
├── db.sqlite              # Created after initialize.ts
└── scraped/               # Created on first content save
    └── (content files)    # Populated by memoized calls
```

---

## Key Conventions

### TypeScript Configuration

**File**: `tsconfig.json`

```json
{
  "extends": "@total-typescript/tsconfig/bundler/no-dom/app",
  "compilerOptions": {
    "experimentalDecorators": true  // REQUIRED for @memoize
  }
}
```

**Key Settings**:
- Strict mode enabled (via @total-typescript)
- No DOM types (server-side only)
- Experimental decorators enabled (critical for memoization)

### Code Style (Enforced by Biome)

**File**: `biome.json`

**Rules**:
- **Indentation**: Tabs (not spaces)
- **Quotes**: Double quotes for strings
- **Import Organization**: Automatic sorting
- **Git Integration**: Respects .gitignore
- **Auto-fixing**: Enabled on save

**Running Biome** (usually automatic in editors):
```bash
bunx biome format --write .    # Format all files
bunx biome lint .              # Lint all files
bunx biome check --apply .     # Format + lint + auto-fix
```

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Classes | PascalCase | `Reddit`, `RedditProvider` |
| Functions | camelCase | `hashContent`, `saveContent` |
| Tables | lowercase, plural | `calls`, `content` |
| Files | lowercase, kebab-case | `memoize.ts`, `db.ts` |
| Decorators | camelCase with @ | `@memoize` |
| Constants | UPPER_SNAKE_CASE | `UA` (User-Agent) |

### Error Handling Pattern

**Always follow this pattern**:

```typescript
try {
	// I/O operation
	const result = await riskyOperation();
	logger.info({ result }, "Operation successful");
	return result;
} catch (error) {
	// Capture error with context
	logger.error({ error, context: "relevant info" }, "Operation failed");
	throw error; // Re-throw after logging
}
```

**Example from reddit/index.ts:125-137**:

```typescript
if (!response.ok) {
	let bodyText = "";
	try {
		bodyText = await response.text();
	} catch (e) {
		logger.warn({ error: e }, "Failed to read error response body");
	}

	const errorMessage = `Reddit API returned ${response.status}: ${bodyText}`;
	logger.error({ status: response.status, bodyText }, errorMessage);
	throw new Error(errorMessage);
}
```

### Logging Convention

**Use structured logging with Pino**:

```typescript
import { defaultLogger } from '../logger';

// Create child logger with module context
const logger = defaultLogger.child({ module: 'storage' });

// Log with context objects
logger.info({ args, argsHash }, "Cache hit");
logger.error({ error, filePath }, "Failed to save content");
logger.debug({ duration, size }, "Operation complete");
```

**Log Levels**:
- `debug`: Development/diagnostic info
- `info`: Normal operations (cache hits, saves)
- `warn`: Recoverable issues (retry attempts)
- `error`: Unrecoverable failures (throw exceptions)

---

## Working with the Code

### Adding a New Provider

**Pattern**: Follow the Reddit provider structure

1. **Create provider directory**: `src/{provider}/`
2. **Create index.ts** with provider class
3. **Use `@memoize` decorator** on all API methods
4. **Follow small, focused methods** (one endpoint per method)

**Example**:

```typescript
// src/twitter/index.ts
import { memoize } from "../core/cache";
import { defaultLogger } from "../logger";

const logger = defaultLogger.child({ module: "twitter" });

export class Twitter {
	@memoize({ provider: "twitter" })
	async getTweet({ id }: { id: string }) {
		logger.info({ id }, "Fetching tweet");

		const response = await fetch(`https://api.twitter.com/2/tweets/${id}`);

		if (!response.ok) {
			throw new Error(`Twitter API error: ${response.status}`);
		}

		return response.json();
	}
}

// Test main function
async function main() {
	const twitter = new Twitter();
	const tweet = await twitter.getTweet({ id: "123" });
	console.log(tweet);
}

if (import.meta.main) {
	main();
}
```

### Using the Memoization Decorator

**Import**:
```typescript
import { memoize } from './core/cache';
```

**Basic Usage**:
```typescript
@memoize({ provider: 'myProvider' })
async myFunction(args: MyArgs) {
	// Function logic
	return result;
}
```

**Behavior**:
1. First call: Execute function, cache result
2. Subsequent calls: Return cached result instantly
3. Different args: New cache entry
4. Same args: Cache hit

**Cache Invalidation Options**:

```typescript
// Option 1: Version in args (creates new cache entry)
await reddit.getPost({ subreddit: 'x', id: 'y', version: '2024-11-14' });

// Option 2: Manual database cleanup
// Delete specific calls from the database

// Option 3: Delete content files
// Remove files from data/scraped/
```

### Working with Content Storage

**Save Content**:
```typescript
import { saveContent } from './core/cache/storage';

const buffer = Buffer.from(data);
const hash = await saveContent(buffer, 'application/json');
// Returns: content hash
// Saves to: data/scraped/{hash}.json
```

**Load Content**:
```typescript
import { loadContent } from './core/cache/storage';

const buffer = await loadContent(hash);
// Returns: Buffer with file contents
```

**Content is Automatically Managed**:
- Memoization decorator handles all storage operations
- You rarely need to call storage functions directly
- Storage handles deduplication automatically

### Composing Complex Operations

**Pattern**: Combine multiple memoized calls

```typescript
class Reddit {
	@memoize({ provider: 'reddit' })
	async getPost({ subreddit, id, title }: GetPostParams) {
		// Cached
	}

	@memoize({ provider: 'reddit' })
	async getImage(url: string) {
		// Cached
	}

	// Composite operation (NOT memoized - composes memoized calls)
	async getPostWithImages({ subreddit, id, title }: GetPostParams) {
		// Get post (cached if previously fetched)
		const post = await this.getPost({ subreddit, id, title });

		// Extract image URLs from JSON
		const imageUrls = extractImageUrls(post);

		// Fetch each image (cached individually)
		const images = await Promise.all(
			imageUrls.map(url => this.getImage(url))
		);

		return { post, images };
	}
}
```

**Key Principle**: Complex operations compose simple memoized calls, not memoized themselves.

---

## Database Operations

### Schema Location

**File**: `src/core/cache/db.ts`

### Generating Migrations

```bash
bun db:generate
```

**What it does**:
- Reads schema from `src/core/cache/db.ts`
- Generates SQL migration in `drizzle/`
- Updates migration journal

### Running Migrations

```bash
bun db:migrate
# Or
bun run initialize.ts
```

**What it does**:
- Creates `data/db.sqlite` if not exists
- Runs pending migrations
- Initializes tables and indexes

### Querying the Database

**Use Drizzle ORM** (type-safe queries):

```typescript
import { db, callsTable, contentTable } from './core/cache/db';
import { eq, and } from 'drizzle-orm';

// Find call by args hash
const call = await db
	.select()
	.from(callsTable)
	.where(eq(callsTable.argsHash, hash))
	.get();

// Find all calls for a function
const calls = await db
	.select()
	.from(callsTable)
	.where(eq(callsTable.functionName, 'reddit.getPost'))
	.all();

// Get content metadata
const content = await db
	.select()
	.from(contentTable)
	.where(eq(contentTable.hash, contentHash))
	.get();
```

### Direct SQLite Access (for debugging)

```bash
bun sqlite3 data/db.sqlite

# List tables
.tables

# Schema
.schema calls
.schema content

# Query
SELECT * FROM calls LIMIT 10;
SELECT COUNT(*) FROM content;
```

---

## Testing Guidelines

### Current Status

**No automated tests currently exist**. The project uses manual testing via:
- Main functions in provider files
- Direct execution with `bun run src/{provider}/index.ts`

### Manual Testing Pattern

**Example from reddit/index.ts:156-162**:

```typescript
async function main() {
	const reddit = new Reddit();
	const result = await reddit.getPost({
		subreddit: "LocalLLaMA",
		id: "1gqy7dc",
		title: "leaked_deepseek_v3_has_685b_parameters",
	});

	console.log(result);
}

if (import.meta.main) {
	main();
}
```

### Testing Best Practices for Future

When implementing tests:

1. **Unit Tests** (recommended framework: Bun's built-in test runner)
   - Test memoization decorator behavior
   - Test content hashing functions
   - Test storage operations

2. **Integration Tests**
   - Test database operations
   - Test provider API calls with mocks
   - Test cache hit/miss scenarios

3. **Provider Tests**
   - Mock HTTP responses
   - Test error handling
   - Test cache deduplication

**Example Test Structure** (future):

```typescript
// tests/cache/memoize.test.ts
import { test, expect } from 'bun:test';

test('memoize decorator caches results', async () => {
	// Test implementation
});
```

---

## Git Workflow

### Branch Naming Convention

**Pattern**: `claude/claude-md-{unique-id}`

**Active Branch**: `claude/claude-md-mhz5tawt763wqerm-01JjD7sjZaKTR2fA3ZWTfZp2`

### Commit Message Style

**Analyze recent commits to match style**:

```bash
git log --oneline -10
```

**Recent patterns**:
- `feat(deps): add quicktype-core for automatic type generation`
- `refactor(db): replace migration script with initialization setup`
- `fix(reddit): add comprehensive error handling for API requests`

**Format**: `<type>(<scope>): <description>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `docs`: Documentation
- `test`: Tests
- `chore`: Maintenance

### Pushing Changes

**IMPORTANT**: Always push to the designated branch

```bash
# Push to current branch
git push -u origin claude/claude-md-mhz5tawt763wqerm-01JjD7sjZaKTR2fA3ZWTfZp2

# If network errors occur, retry with exponential backoff
# (2s, 4s, 8s, 16s delays)
```

### Pre-Commit Checklist

Before committing:

1. **Run the code**: Ensure it executes without errors
2. **Check formatting**: Biome handles this automatically
3. **Review changes**: `git diff` to verify changes
4. **Write clear commit message**: Follow project conventions
5. **No secrets**: Don't commit `.env`, credentials, etc.

---

## Media Handling Patterns

### Overview

The Reddit provider implements comprehensive media handling for all Reddit content types:
- **Single Images**: Direct image posts
- **Galleries**: Multiple images in a single post
- **Videos**: Reddit-hosted videos (with DASH, HLS, and fallback URLs)
- **Previews**: Multiple resolution versions of images
- **Thumbnails**: Small preview images

### Architecture Pattern: Two-Phase Media Processing

**Phase 1: Memoized API Calls**
```typescript
// Each API call is memoized independently
@memoize({ provider: 'reddit' })
async getPost({ subreddit, id, title }: GetPostParams) { ... }

@memoize({ provider: 'reddit' })
async getMedia({ url }: GetMediaParams): Promise<Buffer> { ... }
```

**Phase 2: Extraction & Composition**
```typescript
// NOT memoized - parses cached data
extractMedia(postData: any): ExtractedMedia { ... }

// Composite operation - uses multiple memoized calls
async fetchPostWithMedia(params: GetPostParams) { ... }
```

### Media Types Handled

#### 1. Single Images
```typescript
// Reddit post with post_hint: "image"
const post = await reddit.getPost({ subreddit, id, title });
const media = reddit.extractMedia(post);

// media.mainMedia contains the primary image URL
for (const item of media.mainMedia) {
	const buffer = await reddit.getMedia({ url: item.url });
	// Save or process buffer
}
```

#### 2. Gallery Posts
```typescript
// Reddit post with is_gallery: true
const post = await reddit.getPost({ subreddit, id, title });
const media = reddit.extractMedia(post);

// media.galleryItems contains all gallery images
for (const item of media.galleryItems) {
	console.log(`Gallery item ${item.mediaId}: ${item.width}x${item.height}`);
	const buffer = await reddit.getMedia({ url: item.url });
}
```

#### 3. Reddit-Hosted Videos
```typescript
// Reddit post with is_video: true
const post = await reddit.getPost({ subreddit, id, title });
const media = reddit.extractMedia(post);

// media.videoData contains fallback, DASH, and HLS URLs
for (const video of media.videoData) {
	console.log(`Video: ${video.url} (${video.width}x${video.height})`);
	const buffer = await reddit.getMedia({ url: video.url });
}
```

#### 4. Preview Images (Multiple Resolutions)
```typescript
// Every post may have preview images in different resolutions
const post = await reddit.getPost({ subreddit, id, title });
const media = reddit.extractMedia(post);

// media.previews contains source + all resolutions
for (const preview of media.previews) {
	console.log(`Preview: ${preview.width}x${preview.height} - ${preview.url}`);
}
```

### Complete Example: Fetch Post with All Media

```typescript
import { Reddit } from './reddit';

const reddit = new Reddit();

// Composite operation that:
// 1. Fetches post (memoized)
// 2. Extracts all media URLs
// 3. Downloads each media item (each download memoized)
const result = await reddit.fetchPostWithMedia({
	subreddit: 'pics',
	id: '1abc123',
	title: 'amazing_photo',
});

console.log(`Post fetched: ${!!result.post}`);
console.log(`Media items found: ${result.media.mainMedia.length + result.media.galleryItems.length}`);
console.log(`Successfully downloaded: ${result.downloadedMedia.size}`);

// Access downloaded media
for (const [url, buffer] of result.downloadedMedia) {
	console.log(`${url}: ${buffer.length} bytes`);
}
```

### Extraction Utility Reference

The `extractMedia()` method returns:

```typescript
interface ExtractedMedia {
	mainMedia: MediaItem[];      // Primary images/videos from post.url
	previews: MediaItem[];       // All preview resolutions from post.preview
	thumbnails: MediaItem[];     // Thumbnail from post.thumbnail
	galleryItems: MediaItem[];   // All gallery images from post.media_metadata
	videoData: MediaItem[];      // Video URLs (fallback, DASH, HLS)
}

interface MediaItem {
	url: string;                 // Direct URL to media
	type: "image" | "video" | "gallery_image" | "preview" | "thumbnail";
	width?: number;              // Dimensions if available
	height?: number;
	caption?: string;            // Future: gallery captions
	mediaId?: string;            // Gallery item ID
}
```

### Additional Provider Methods

#### Fetch Subreddit Listing
```typescript
// Get hot posts from a subreddit
const listing = await reddit.getSubreddit({
	name: 'pics',
	sort: 'hot',      // 'hot' | 'new' | 'top' | 'rising'
	limit: 25,        // Number of posts
	after: 't3_xyz',  // Pagination cursor (optional)
});

// Iterate through posts
const posts = listing.data.children;
for (const postWrapper of posts) {
	const post = postWrapper.data;
	console.log(`${post.title} - ${post.url}`);
}
```

#### Fetch User Profile
```typescript
// Get user's recent posts
const userData = await reddit.getUser({
	username: 'example_user',
	sort: 'new',      // 'new' | 'hot' | 'top' | 'controversial'
	limit: 25,
});

const userPosts = userData.data.children;
for (const post of userPosts) {
	console.log(`${post.data.title} in r/${post.data.subreddit}`);
}
```

### Design Principles

1. **Granular Memoization**: Each API call is memoized separately
   - `getPost()` - Memoized by post ID
   - `getMedia()` - Memoized by URL
   - `getSubreddit()` - Memoized by subreddit + params
   - `getUser()` - Memoized by username + params

2. **Extraction Not Memoized**: Parsing logic runs on cached data
   - No API calls, so no need for memoization
   - Fast operation on local JSON
   - Can be updated without invalidating cache

3. **Composition Over Complexity**: Complex operations compose simple ones
   - `fetchPostWithMedia()` uses `getPost()` + `getMedia()`
   - Each piece is independently cached
   - Flexible - can mix and match as needed

4. **Graceful Degradation**: Errors don't block entire operation
   - If one media item fails, others continue
   - Logging for debugging
   - Returns partial results

### Pattern for New Providers

When implementing a new provider (Twitter, Instagram, etc.):

```typescript
class MyProvider {
	// 1. Memoize individual API calls
	@memoize({ provider: 'myprovider' })
	async getContent({ id }: { id: string }) {
		const response = await fetch(url);
		return response.json();
	}

	@memoize({ provider: 'myprovider' })
	async getMedia({ url }: { url: string }): Promise<Buffer> {
		const response = await fetch(url);
		return Buffer.from(await response.arrayBuffer());
	}

	// 2. Extraction utilities (not memoized)
	extractMedia(data: any): ExtractedMedia {
		// Parse JSON to find media URLs
		// Return structured media information
	}

	// 3. Composite operations (uses memoized methods)
	async fetchContentWithMedia({ id }: { id: string }) {
		const content = await this.getContent({ id });
		const media = this.extractMedia(content);

		const downloadedMedia = new Map();
		for (const item of media.allItems) {
			const buffer = await this.getMedia({ url: item.url });
			downloadedMedia.set(item.url, buffer);
		}

		return { content, media, downloadedMedia };
	}
}
```

---

## Common Tasks

### Task: Add Error Handling to a Function

**Pattern** (from reddit/index.ts):

```typescript
async myFunction() {
	const logger = defaultLogger.child({ module: 'myModule' });

	try {
		const response = await fetch(url);

		if (!response.ok) {
			let bodyText = "";
			try {
				bodyText = await response.text();
			} catch (e) {
				logger.warn({ error: e }, "Failed to read error response");
			}

			const errorMessage = `API error ${response.status}: ${bodyText}`;
			logger.error({ status: response.status, bodyText }, errorMessage);
			throw new Error(errorMessage);
		}

		return await response.json();
	} catch (error) {
		logger.error({ error }, "Function failed");
		throw error;
	}
}
```

### Task: Add a New API Endpoint to Existing Provider

1. **Add method to provider class**:
   ```typescript
   @memoize({ provider: 'reddit' })
   async getSubreddit({ name }: { name: string }) {
   	const url = `https://www.reddit.com/r/${name}/about.json`;
   	const response = await fetch(url, UA);

   	if (!response.ok) {
   		throw new Error(`Failed: ${response.status}`);
   	}

   	return response.json();
   }
   ```

2. **Test manually**:
   ```typescript
   const reddit = new Reddit();
   const subreddit = await reddit.getSubreddit({ name: 'LocalLLaMA' });
   console.log(subreddit);
   ```

3. **Verify caching**:
   ```bash
   # First call: Logs "Cache miss", fetches from API
   # Second call: Logs "Cache hit", returns instantly
   ```

### Task: Inspect Cache Contents

**Using inspect utility** (if available in src/core/cache/inspect.ts):

```typescript
import { inspectCache } from './core/cache/inspect';

// List all cached calls
const calls = await inspectCache.listCalls();

// Find calls for specific function
const reddits = await inspectCache.findCalls('reddit.getPost');

// Get cache statistics
const stats = await inspectCache.getStats();
console.log(`Total calls: ${stats.totalCalls}`);
console.log(`Total content: ${stats.totalContent}`);
console.log(`Total size: ${stats.totalSize} bytes`);
```

**Direct database query**:

```bash
bun sqlite3 data/db.sqlite "SELECT function_name, COUNT(*) FROM calls GROUP BY function_name;"
```

### Task: Clear Cache for Specific Function

```typescript
import { db, callsTable } from './core/cache/db';
import { eq } from 'drizzle-orm';

// Delete all calls for a function
await db
	.delete(callsTable)
	.where(eq(callsTable.functionName, 'reddit.getPost'))
	.run();
```

**Note**: This doesn't delete content files (by design). Content cleanup is a separate operation based on reference counting.

### Task: Add Type Generation for New Provider

**Using quicktype-core**:

1. **Collect sample JSON responses**:
   ```typescript
   const response = await provider.getData();
   await Bun.write('samples/provider-data.json', JSON.stringify(response));
   ```

2. **Generate types with quicktype**:
   ```typescript
   import { quicktype, InputData, JSONSchemaInput } from 'quicktype-core';

   // Generate TypeScript types from JSON
   const { lines } = await quicktype({
   	inputData,
   	lang: 'typescript',
   	rendererOptions: { 'just-types': 'true' }
   });

   const types = lines.join('\n');
   await Bun.write('src/provider/types.ts', types);
   ```

3. **Refine types with AI** (future feature):
   - Analyze generated types
   - Rename for clarity
   - Generate Zod schemas

---

## Troubleshooting

### Issue: Cache Not Working

**Symptoms**: Every call fetches from API, no cache hits

**Possible Causes**:

1. **Inconsistent argument order**:
   ```typescript
   // These are DIFFERENT cache entries:
   await fn({ id: '1', name: 'x' });
   await fn({ name: 'x', id: '1' });  // Different key order!
   ```

   **Solution**: Always use consistent key order, or use a single parameter object:
   ```typescript
   type Params = { id: string; name: string };
   async fn(params: Params) { ... }
   ```

2. **Database not initialized**:
   ```bash
   bun run initialize.ts
   ```

3. **Missing decorator**:
   ```typescript
   // Missing @memoize decorator
   async myFunction() { ... }  // NOT cached!
   ```

### Issue: "experimentalDecorators" Error

**Error**: `Decorators are not valid here`

**Solution**: Ensure `tsconfig.json` has:
```json
{
	"compilerOptions": {
		"experimentalDecorators": true
	}
}
```

### Issue: Database Locked

**Error**: `database is locked`

**Cause**: Multiple processes accessing SQLite simultaneously

**Solution**:
- Close other connections
- Ensure only one process runs at a time
- Consider connection pooling (future enhancement)

### Issue: Content File Not Found

**Error**: `ENOENT: no such file or directory, open 'data/scraped/{hash}.json'`

**Cause**: Database and filesystem out of sync

**Solution**:
1. Check if file exists: `ls data/scraped/{hash}.json`
2. Query database: `SELECT * FROM content WHERE hash = '{hash}'`
3. If record exists but file missing, content was manually deleted
4. Re-fetch by clearing cache entry and calling function again

### Issue: Import Errors

**Error**: `Cannot find module './core/cache'`

**Cause**: Relative path issues

**Solution**: Use absolute imports or correct relative paths:
```typescript
// From src/reddit/index.ts
import { memoize } from '../core/cache';  // Correct

// From src/index.ts
import { memoize } from './core/cache';  // Correct
```

### Issue: Biome Formatting Conflicts

**Symptoms**: Code keeps reformatting unexpectedly

**Solution**:
- Check `biome.json` settings
- Ensure editor uses Biome (not Prettier)
- Run `bunx biome check --apply .` to fix all at once

---

## Additional Resources

### Documentation Files

- **README.md**: Project vision and high-level overview
- **docs/architecture.md**: Detailed 252-line architecture guide
- **src/core/cache/db.ts**: Database schema with comments
- **src/core/cache/memoize.ts**: Memoization decorator implementation

### External Resources

- [Bun Documentation](https://bun.sh/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Pino Logger Documentation](https://getpino.io)
- [Biome Documentation](https://biomejs.dev)
- [quicktype Documentation](https://quicktype.io)

### Key Architectural Decisions

Refer to **docs/architecture.md** for detailed rationale on:
- Why content-addressed storage?
- Why SQLite + files (not all-database)?
- Why no separate graph/edges table?
- Why function-level memoization?

---

## Summary for AI Assistants

When working with this codebase:

### DO:
- ✅ Use the `@memoize` decorator on all provider API methods
- ✅ Follow the provider pattern (one class per content source)
- ✅ Use structured logging with Pino
- ✅ Handle errors comprehensively with try-catch and logging
- ✅ Use tabs for indentation and double quotes for strings
- ✅ Keep functions small and focused (one API endpoint per method)
- ✅ Compose complex operations from simple memoized calls
- ✅ Check cache behavior manually with console logs
- ✅ Commit with conventional commit messages
- ✅ Push to the designated claude/* branch

### DON'T:
- ❌ Modify the core memoization system without careful consideration
- ❌ Store binary data in the database (use files)
- ❌ Create explicit graph/edges tables (relationships are in JSON)
- ❌ Use spaces for indentation (use tabs)
- ❌ Skip error handling on I/O operations
- ❌ Assume cache works without testing (verify with multiple calls)
- ❌ Manually manage cache (let decorator handle it)
- ❌ Commit secrets or credentials
- ❌ Push to wrong branch

### When in Doubt:
1. Check **docs/architecture.md** for design decisions
2. Look at **src/reddit/index.ts** for implementation patterns
3. Review **src/core/cache/memoize.ts** for decorator behavior
4. Test manually with `bun run` before committing

---

**Last Updated**: 2025-11-14
**Maintainers**: Open source project
**License**: (Check repository for license file)

