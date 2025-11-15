# Evening - Development Guide for Claude

This document provides guidance for Claude Code when working on the Evening project.

## Project Overview

Evening is a content scraping system with intelligent memoization and content-addressed storage. It treats all scraping operations as pure functions with automatic caching, deduplication, and reference counting.

**Key Technologies:**
- **Runtime**: Bun
- **Language**: TypeScript
- **Database**: SQLite with Drizzle ORM
- **Logging**: Pino
- **Code Quality**: Biome (linting & formatting)
- **External Tools**: yt-dlp (video downloads)

## Quick Start

```bash
# Install dependencies
bun install

# Initialize database
bun run db:init

# Run the Reddit scraper
bun run dev

# Inspect cached content
bun run db:inspect
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Run the Reddit scraper |
| `bun run lint` | Check code quality with Biome |
| `bun run lint:fix` | Auto-fix linting issues |
| `bun run format` | Format code with Biome |
| `bun run db:init` | Initialize database |
| `bun run db:inspect` | Inspect cached content |
| `bun run db:generate` | Generate database migrations |
| `bun run db:migrate` | Run database migrations |

## Project Structure

```
evening/
├── src/
│   ├── reddit/          # Reddit provider implementation
│   │   └── index.ts     # Reddit scraper with media methods
│   ├── core/
│   │   └── cache/       # Caching infrastructure
│   │       ├── db.ts    # Database schema (Drizzle ORM)
│   │       ├── memoize.ts  # Memoization decorator
│   │       ├── storage.ts  # Content-addressed storage
│   │       └── inspect.ts  # Database inspection utility
│   ├── utils/
│   │   └── yt-dlp.ts    # yt-dlp integration for videos
│   ├── logger.ts        # Pino logger configuration
│   └── index.ts         # Entry point
├── data/
│   ├── db.sqlite        # SQLite database (cached calls & content)
│   ├── scraped/         # Content-addressed media files
│   └── bin/             # Downloaded binaries (yt-dlp)
├── docs/
│   └── architecture.md  # Detailed architecture documentation
└── drizzle/             # Database migrations
```

## Core Architecture Principles

### 1. Memoization-First Design

Every scraping function is automatically cached:
- Cache key: `sha256(function_name + JSON.stringify(args))`
- Same input → cached result (until explicitly invalidated)
- Content stored in `./data/scraped/{hash}.{ext}`

### 2. Content-Addressed Storage

All content is stored by SHA256 hash:
- Automatic deduplication (same image from 10 posts = 1 file)
- Immutable content (hash changes if content changes)
- Reference counting for safe cleanup

### 3. Provider Pattern

Each content source (Reddit, Twitter, etc.) is a class with memoized methods:
- Methods are small, focused, and independently cacheable
- Complex operations compose multiple memoized calls
- No manual cache management needed

## Reddit Provider Methods

### Core Methods

```typescript
// Fetch post JSON
await reddit.getPost({ subreddit, id, title });

// Fetch binary media (images, videos)
await reddit.getMedia({ url });

// Fetch video with yt-dlp (audio+video merged)
await reddit.getVideoWithYtDlp({ url });
```

### High-Level Media Methods

```typescript
// Get single image from post
const { metadata, content } = await reddit.getImage(params);

// Get video with audio (uses yt-dlp, falls back to direct download)
const { metadata, content } = await reddit.getVideo(params);

// Get all images from gallery post
const items = await reddit.getGallery(params);
```

## Database Schema

### `calls` Table
Tracks memoized function invocations.

| Column | Type | Description |
|--------|------|-------------|
| `args_hash` | text (PK) | sha256(function_name + args_json) |
| `function_name` | text | e.g., 'reddit.getPost' |
| `args_json` | text | JSON.stringify(args) |
| `content_hash` | text (FK) | References content.hash |
| `created_at` | integer | First fetch timestamp |
| `last_accessed` | integer | Most recent cache hit |
| `fetch_duration_ms` | integer | Initial fetch duration |

### `content` Table
Registry of all scraped content files.

| Column | Type | Description |
|--------|------|-------------|
| `hash` | text (PK) | sha256 of file content |
| `file_path` | text | Relative path: scraped/{hash}.{ext} |
| `size_bytes` | integer | File size |
| `mime_type` | text | Content type |
| `reference_count` | integer | Deduplication counter |

## Development Guidelines

### Code Style

- **Clean & readable**: Prioritize human readability over cleverness
- **No emojis**: Unless explicitly requested
- **TypeScript**: Fully typed with proper interfaces
- **Error handling**: Comprehensive with structured logging
- **Comments**: JSDoc for public methods

### Choosing Solutions: Priority Order

When solving a problem, follow this priority order:

1. **Cross-compatible JavaScript** - If simple enough, use plain JS that works in browser/Node
2. **Built-in Node.js APIs** - Prefer Node.js standard library over external packages
3. **Bun-native APIs** - Use Bun-specific features when they provide clear benefits
4. **External library or adapted code** - Only if above options don't work
   - Document the source if adapting code from repos/Stack Overflow
5. **Write custom code** - Last resort for complex requirements

**Above all else:**
- Keep it **simple** and **maintainable**
- Follow **KISS** (Keep It Simple, Stupid)
- Follow **YAGNI** (You Aren't Gonna Need It)
- Follow **POLA** (Principle of Least Astonishment)

### When Libraries Win: The Battle-Tested Argument

**Libraries provide real value when:**
- **Complex domains**: Date/time, URL parsing, file paths have subtle edge cases
- **Security-critical**: Crypto, input validation, HTML sanitization require expertise
- **Standards compliance**: HTTP clients, JSON parsers need strict spec adherence
- **Battle-tested reliability**: Thousands of users + unit tests catch bugs you'd miss
- **Maintenance burden**: Timezone handling, internationalization are ongoing work

**Examples where libraries are the right choice:**
- Cryptography: NEVER roll your own (use built-in crypto or proven libraries)
- Date/time: Use `date-fns` or built-in `Temporal` (when available)
- URL parsing: Use built-in `URL` class (battle-tested, handles edge cases)
- Input sanitization: Use proven libraries (security bugs are costly)

**Write it yourself when:**
- **Genuinely simple**: Lookup tables, basic string manipulation
- **Need flexibility**: Library doesn't support your exact use case
- **Adds bloat**: Importing 1000 MIME types when you need 10
- **Easily validated**: You can write simple tests to verify correctness
- **No hidden complexity**: Problem domain is well-understood

**The lifecycle pattern:**
1. Start simple: Hand-written code works for basic case
2. Hit complexity: Adopt library when edge cases emerge
3. Hit rigidity: Library can't do what you need, write comprehensive custom solution

**The key:** Match the solution to the **problem's inherent complexity**, not just your current needs.

**Example:** MIME type mapping in `src/core/cache/storage.ts`
- Uses a simple map instead of `mime-types` library
- Domain is simple: 10 mappings, no edge cases, no security implications
- Only includes MIME types we actually use (YAGNI)
- No external dependencies, fast O(1) lookup, easy to extend
- If we needed comprehensive MIME detection from file content, we'd use a library

### Adding New Methods

1. Decorate with `@memoize({ provider: "name" })` for caching
2. Return `ArrayBuffer` for binary content, objects for JSON
3. Add structured logging (info, warn, error)
4. Handle errors with descriptive messages
5. Export types for external use

Example:
```typescript
@memoize({ provider: "reddit" })
async getComments({ postId }: GetCommentsParams) {
  logger.info({ postId }, "fetching comments");
  const response = await fetch(url, UA);

  if (!response.ok) {
    logger.error({ postId, statusCode: response.status }, "fetch failed");
    throw new Error(`Failed to fetch comments: ${response.status}`);
  }

  logger.info({ postId }, "fetched comments");
  return await response.json();
}
```

### Running Biome

Biome handles both linting and formatting:

```bash
# Check for issues
bun run lint

# Auto-fix issues
bun run lint:fix

# Format code
bun run format
```

**Important**: Always run `bun run lint:fix` before committing.

### Working with Migrations

When modifying database schema:

```bash
# 1. Edit src/core/cache/db.ts
# 2. Generate migration
bun run db:generate

# 3. Apply migration
bun run db:migrate
```

## yt-dlp Integration

Evening uses yt-dlp for robust video downloads:

- **Lazy download**: Binary auto-downloaded on first use
- **Platform detection**: Correct binary for OS/architecture
- **Audio+video merging**: Handles Reddit's separate streams
- **Fallback**: Direct HTTP download if yt-dlp fails

Binary location: `./data/bin/yt-dlp*`

## Testing

```bash
# Run the scraper to test
bun run dev

# Inspect cached data
bun run db:inspect
```

## Common Tasks

### Add a new provider

1. Create `src/{provider}/index.ts`
2. Implement class with `@memoize` decorated methods
3. Export class and types
4. Add to main entry point if needed

### Add a new media type

1. Define TypeScript interface for metadata
2. Create extraction method (parses post JSON)
3. Use `getMedia()` or `getVideoWithYtDlp()` for fetching
4. Return `{ metadata, content }` structure

### Debug cache behavior

```bash
# Inspect database
bun run db:inspect

# Check cached files
ls -lh ./data/scraped/

# View logs (structured JSON)
bun run dev | bunyan  # if bunyan is installed
```

## Git Workflow

```bash
# Check status
git status

# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add new feature"

# Push to feature branch
git push -u origin <branch-name>
```

**Commit message format**:
- `feat:` new feature
- `fix:` bug fix
- `refactor:` code restructuring
- `docs:` documentation changes
- `chore:` maintenance tasks

## Additional Resources

- **Architecture docs**: `docs/architecture.md`
- **Database schema**: `drizzle/0000_glamorous_sleeper.sql`
- **Biome config**: `biome.json`
- **TypeScript config**: `tsconfig.json`

## Dependencies

Current major dependencies:
- `@biomejs/biome` - Linting & formatting
- `drizzle-orm` + `drizzle-kit` - Database ORM
- `pino` - Structured logging
- `quicktype-core` - Type generation
- `@total-typescript/tsconfig` - TypeScript config

Update dependencies: `bun update`

## Notes for Claude

- **Always lint before committing**: `bun run lint:fix`
- **Prefer existing files**: Edit rather than create new files
- **Follow patterns**: Study existing code before implementing new features
- **Content-addressed**: All media is deduplicated automatically
- **Memoization**: Cache is automatic, don't manage it manually
- **Clean code**: Readability > brevity

## Questions?

Refer to:
1. `docs/architecture.md` for detailed design decisions
2. Existing code in `src/reddit/index.ts` for implementation patterns
3. Database schema in `src/core/cache/db.ts` for data structures
