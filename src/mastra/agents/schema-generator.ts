import { Agent } from "@mastra/core/agent";
import type { MastraModelConfig } from "@mastra/core/llm";
import { typescriptToZodTool } from "../tools/typescript-to-zod";

/**
 * Example agent that helps generate Zod schemas from TypeScript interfaces
 *
 * This demonstrates how to create an agent that uses our custom tools.
 * The agent can be configured with different AI providers (Gemini, Cerebras, etc.)
 */
export function createSchemaGeneratorAgent(model: MastraModelConfig) {
	return new Agent({
		name: "schema-generator",
		instructions: `You are a helpful assistant that generates Zod schemas from TypeScript interfaces.

When given a TypeScript interface, you should:
1. Ask for sample data if not provided (you need examples to infer validators)
2. Use the typescript-to-zod tool to generate the schema
3. Explain the generated validations (URLs, emails, integers, etc.)

Be concise and focus on helping users understand the schema validations.`,
		model,
		tools: {
			typescriptToZod: typescriptToZodTool,
		},
	});
}
