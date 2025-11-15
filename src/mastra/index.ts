import { Mastra } from "@mastra/core";
import { typescriptToZodTool } from "./tools/typescript-to-zod";

/**
 * Central Mastra configuration for Evening crawler
 *
 * This is the entry point for all AI agents, tools, and workflows.
 * As we add more capabilities, they should be registered here.
 */
export const mastra = new Mastra({
	tools: {
		typescriptToZod: typescriptToZodTool,
	},
});

export { typescriptToZodTool };
