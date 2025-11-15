import { Mastra } from "@mastra/core";
import { inferValueTypeTool } from "./tools/infer-value-type";
import { typescriptToZodTool } from "./tools/typescript-to-zod";

/**
 * Central Mastra configuration for Evening crawler
 *
 * This is the entry point for all AI agents, tools, and workflows.
 * Tools are used directly by agents, not registered globally in newer Mastra versions.
 */
export const mastra = new Mastra({});

export { inferValueTypeTool, typescriptToZodTool };
