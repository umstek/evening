/**
 * Model configuration for different AI providers
 *
 * NOTE: Mastra bundles AI SDK providers internally. Import from -v5 versions:
 *   import { google } from "@ai-sdk/google-v5";
 *   import { createOpenAI } from "@ai-sdk/openai-v5";
 *
 * Supported providers:
 * - Google Gemini (GOOGLE_GENERATIVE_AI_API_KEY)
 * - Cerebras (CEREBRAS_API_KEY)
 * - Zhipu AI / ZAI GLM Coding Plan (ZHIPU_AI_API_KEY)
 *
 * Example usage:
 *
 * ```typescript
 * import { google } from "@ai-sdk/google-v5";
 * import { createOpenAI } from "@ai-sdk/openai-v5";
 * import { Agent } from "@mastra/core";
 *
 * // Google Gemini
 * const model = google("gemini-1.5-flash", {
 *   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
 * });
 *
 * // Cerebras (requires createOpenAI for custom base URL)
 * const cerebras = createOpenAI({
 *   apiKey: process.env.CEREBRAS_API_KEY,
 *   baseURL: "https://api.cerebras.ai/v1",
 * });
 * const model = cerebras("llama3.1-8b");
 *
 * // Zhipu AI (custom base URL for GLM Coding Plan)
 * const zhipuAi = createOpenAI({
 *   apiKey: process.env.ZHIPU_AI_API_KEY,
 *   baseURL: "https://api.z.ai/api/coding/paas/v4/",
 * });
 * const model = zhipuAi("glm-4-plus");
 *
 * // Use with Agent
 * const agent = new Agent({
 *   name: "my-agent",
 *   instructions: "You are a helpful assistant",
 *   model,
 * });
 * ```
 *
 * Note: The TypeScript-to-Zod tool works without AI models.
 * See examples/reddit-schema-example.ts for tool-only usage.
 */

export const modelExamples = {
	gemini: {
		provider: "@ai-sdk/google-v5",
		model: "gemini-1.5-flash",
		config: `google("gemini-1.5-flash", { apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })`,
	},
	cerebras: {
		provider: "@ai-sdk/openai-v5",
		model: "llama3.1-8b",
		config: `createOpenAI({ apiKey: process.env.CEREBRAS_API_KEY, baseURL: "https://api.cerebras.ai/v1" })("llama3.1-8b")`,
	},
	zhipuAi: {
		provider: "@ai-sdk/openai-v5",
		model: "glm-4-plus",
		config: `createOpenAI({ apiKey: process.env.ZHIPU_AI_API_KEY, baseURL: "https://api.z.ai/api/coding/paas/v4/" })("glm-4-plus")`,
	},
};
