# Mastra AI Integration

This directory contains the Mastra AI framework integration for Evening. Mastra provides agents, tools, and workflows for intelligent web scraping and data processing.

## Overview

Mastra is a TypeScript AI framework that enables building autonomous agents with tools, memory, and workflows. We're integrating it carefully to enhance Evening's scraping capabilities with AI-powered decision-making.

## Directory Structure

```text
src/mastra/
├── index.ts           # Mastra configuration and exports
├── tools/             # Custom tools for agents
│   ├── infer-value-type.ts    # Infer Zod type for primitive values (recommended)
│   └── typescript-to-zod.ts   # TypeScript → Zod (complex, nested objects broken)
├── agents/            # AI agents (to be added)
└── workflows/         # Multi-step workflows (to be added)
```

## Getting Started

### 1. Dependencies (Already Installed)

- `@mastra/core` - Core Mastra framework (includes AI SDK providers internally)
- `zod` - Schema validation

**Note:** Mastra bundles AI SDK providers internally as `-v5` versions. No need to install `@ai-sdk/*` packages separately!

### 2. Configure Environment

Copy `.env.example` to `.env` and add your AI provider API key:

```bash
cp .env.example .env
```

Available keys (you only need one):

- `GOOGLE_GENERATIVE_AI_API_KEY` - Google Gemini (free tier available)
- `CEREBRAS_API_KEY` - Cerebras (free tier available)
- `ZHIPU_AI_API_KEY` - Zhipu AI / ZAI GLM Coding Plan

### 3. Try the Examples

Run the Reddit schema generation example:

```bash
bun run src/mastra/examples/reddit-schema-example.ts
```

### 4. (Optional) Run Mastra Studio

Start the development studio to interact with tools and agents:

```bash
bun run mastra:dev
```

Access the studio at: <http://localhost:4111>

## Available Tools

### Value Type Inference (Recommended)

Infers Zod schema for **primitive/leaf values only** (strings, numbers, booleans). Analyzes multiple samples and only narrows down types if 100% match.

**Use Case:** When crawling, identify URLs to download, detect integers for validation, etc.

**Features:**

- Only handles primitives (no nested objects/arrays)
- Uses Zod's `.safeParse()` for validation (not regex)
- Requires 100% of samples to match before narrowing
- Returns confidence level based on sample size

**Usage Example:**

```typescript
import { inferValueTypeTool } from './tools/infer-value-type';

// Found URLs in JSON - should we download them?
const result = await inferValueTypeTool.execute({
  context: {
    samples: [
      "https://i.redd.it/abc.jpg",
      "https://v.redd.it/def.mp4",
      "https://i.redd.it/ghi.png"
    ]
  },
  runtimeContext: new RuntimeContext()
});

console.log(result.zodType);      // "z.string().url()"
console.log(result.confidence);   // "medium"
// → These are URLs! Download and check MIME type
```

**Examples:**

```bash
bun run src/mastra/examples/infer-value-type-test-example.ts
bun run src/mastra/examples/infer-value-type-example.ts
```

### TypeScript to Zod Schema Generator (Complex)

⚠️ **Note:** This tool has issues with nested objects. Use `inferValueTypeTool` for simpler, more reliable type inference on leaf values.

Converts TypeScript interfaces into Zod schemas with intelligent validation based on multiple sample data objects.

## Examples

### Value Type Inference for Crawling

See `src/mastra/examples/infer-value-type-example.ts` for practical examples of using type inference to make crawling decisions.

Run it:

```bash
bun run src/mastra/examples/infer-value-type-example.ts
```

This example shows:

- Identifying URLs to download (check MIME type, file magic)
- Detecting positive integers for validation
- Distinguishing non-negative integers (includes zero) from positive
- Making decisions based on inferred types

### Reddit Schema Generation (Complex)

See `src/mastra/examples/reddit-schema-example.ts` for TypeScript-to-Zod examples with Reddit data.

```bash
bun run src/mastra/examples/reddit-schema-example.ts
```

## Next Steps

As we build out the AI integration, we'll add:

1. **Agents** - Autonomous scrapers that make intelligent decisions
2. **Workflows** - Multi-step scraping orchestrations
3. **Memory** - Persistent context across scraping sessions
4. **RAG** - Knowledge base for scraping patterns and strategies

## Important Notes

⚠️ **Mastra can be delicate** - Changes should be tested thoroughly. Always:

- Run `bun run lint:fix` before committing
- Test tools with the test files before using in production
- Check Mastra's changelog for breaking changes when updating

**AI Provider Status:**

- ✅ **Tools work perfectly** - TypeScript-to-Zod tool is fully functional without AI
- ⚠️ **AI Agents** - Provider integration needs further configuration (API endpoint compatibility)
- The integration code is correct - see `src/mastra/models.ts` for examples with correct model names

## Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [Mastra GitHub](https://github.com/mastra-ai/mastra)
- [Zod Documentation](https://zod.dev)
