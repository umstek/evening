# Evening - Claude Code Development Guide

Evening is an intelligent web **crawler/scraper** with content-addressed storage and memoization.

## Project Vision

This is NOT just a media downloader. It's a dynamic crawler that:

1. Fetches content (JSON, media) and caches automatically
2. **Dynamically analyzes JSON** structures using quicktype
3. **Identifies URLs and media** automatically
4. **Determines safe downloads** (same-site vs external, media types)
5. Eventually uses **AI agents** for intelligent scraping decisions

The Reddit provider's media methods (getImage, getVideo, getGallery) are **building blocks**, not the end goal. The real vision is dynamic, intelligent crawling.

## Quick Reference

See `README.md` for user-facing docs and getting started.

### Commands

- `bun run dev` - Run scraper
- `bun run lint:fix` - Fix linting (run before commits)
- `bun run db:init` - Initialize database
- `bun run db:inspect` - View cached content

### Key Files

- `src/reddit/index.ts` - Reddit provider with media methods
- `src/core/cache/` - Memoization and content-addressed storage
- `src/utils/yt-dlp.ts` - Video download utility
- `docs/architecture.md` - Detailed design decisions

## Architecture Principles

1. **Memoization-First**: Every scraping function cached by `sha256(function_name + args)`
2. **Content-Addressed Storage**: All content stored as `./data/scraped/{hash}.{ext}`
3. **Automatic Deduplication**: Same content = single file, reference counted
4. **Provider Pattern**: Each source is a class with `@memoize` decorated methods

## Development Guidelines

### Code Style

- Clean, readable, maintainable code (KISS, YAGNI, POLA)
- TypeScript with full typing
- Comprehensive error handling and logging
- Always run `bun run lint:fix` before committing

### Solution Priority Order

1. Cross-compatible JavaScript
2. Built-in Node.js APIs
3. Bun-native APIs
4. External library (when battle-tested value exists)
5. Custom code

### When to Use Libraries

- **Complex domains**: Date/time, URL parsing, cryptography
- **Security-critical**: Input validation, sanitization, crypto
- **Battle-tested**: Thousands of users + tests catch edge cases
- **Write yourself**: Simple lookups, when you need flexibility

**Example**: MIME mapping uses simple map (10 types, no edge cases). Cryptography ALWAYS uses libraries.

## Getting Up-to-Date Documentation

Use **Context7 API** to fetch current library documentation (prevents using outdated APIs):

```bash
# Search for a library
curl "https://context7.com/api/v1/search?query=mastra" \
  -H "Authorization: Bearer $CONTEXT7_API_KEY"

# Get docs for specific topic
curl "https://context7.com/api/v1/mastra-ai/mastra?type=txt&topic=tool+execute&tokens=5000" \
  -H "Authorization: Bearer $CONTEXT7_API_KEY"
```

**Parameters**: `type` (txt/json), `topic` (search filter), `tokens` (limit)

## Database Schema

### `calls` Table

- `args_hash` (PK): sha256(function_name + args_json)
- `function_name`: e.g., 'reddit.getPost'
- `content_hash` (FK): References content.hash
- `created_at`, `last_accessed`, `fetch_duration_ms`

### `content` Table

- `hash` (PK): sha256 of file content
- `file_path`: scraped/{hash}.{ext}
- `mime_type`, `size_bytes`, `reference_count`

## Adding New Methods

```typescript
@memoize({ provider: "reddit" })
async getComments({ postId }: GetCommentsParams) {
  logger.info({ postId }, "fetching comments");
  const response = await fetch(url, UA);

  if (!response.ok) {
    logger.error({ postId, statusCode: response.status }, "fetch failed");
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  return await response.json();
}
```

1. Decorate with `@memoize({ provider: "name" })`
2. Return `ArrayBuffer` for binary, objects for JSON
3. Add structured logging
4. Handle errors comprehensively
5. Export types

## Key Design Decisions

See `docs/architecture.md` for full rationale.

- **Why content-addressed?** Automatic deduplication, immutability, integrity
- **Why no graph table?** Relationships in JSON, traverse by parsing
- **Why function-level memoization?** Natural granularity, composable, automatic
- **Why yt-dlp?** Reddit separates audio/video streams, yt-dlp merges them

## Notes

- Data directory created automatically on init
- All media is deduplicated via content-addressed storage
- Cache is automatic, don't manage it manually
- Prefer editing existing files over creating new ones
- Readability > brevity
