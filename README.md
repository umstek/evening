# Evening

An intelligent web crawler and scraper with content-addressed storage and automatic memoization.

## Features

- **Intelligent Caching**: All scraping operations automatically cached using content-addressed storage
- **Automatic Deduplication**: Same content from different sources = single cached file
- **Type Discovery**: Automatically analyze JSON structures and generate TypeScript types
- **AI-Powered**: Designed to integrate with AI agents for intelligent crawling decisions

## Quick Start

```bash
# Install dependencies
bun install

# Initialize database
bun run db:init

# Run the scraper
bun run dev

# Inspect cached content
bun run db:inspect
```

## Project Vision

Evening is a crawler/scraper that:
1. Fetches content and automatically caches it (JSON, images, videos)
2. Analyzes JSON structures and discovers types using quicktype
3. Identifies URLs, media, and safe download targets
4. Uses AI to make intelligent scraping decisions
5. Provides building blocks for media extraction (images, videos, galleries)

## Available Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Run the Reddit scraper example |
| `bun run lint` | Check code quality with Biome |
| `bun run lint:fix` | Auto-fix linting issues |
| `bun run format` | Format code with Biome |
| `bun run db:init` | Initialize database |
| `bun run db:inspect` | Inspect cached content |

## Architecture

- **Content-Addressed Storage**: All content stored by SHA256 hash
- **Memoization-First**: Every scraping function is cached automatically
- **Provider Pattern**: Each source (Reddit, Twitter, etc.) is a modular provider
- **Reference Counting**: Track content usage for safe cleanup

See `docs/architecture.md` for detailed design decisions.

## Current Status

✅ Core caching infrastructure
✅ Reddit provider with media methods
✅ yt-dlp integration for video downloads
🚧 Dynamic type discovery with quicktype
🚧 AI-powered crawling logic
🚧 Automatic URL and media identification

## Technology Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Database**: SQLite with Drizzle ORM
- **Code Quality**: Biome
- **Logging**: Pino
- **Video Downloads**: yt-dlp

## License

Private project
