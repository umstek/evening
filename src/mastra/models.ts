/**
 * Model configuration for different AI providers
 *
 * NOTE: Mastra bundles AI SDK providers internally as -v5 versions.
 * No need to install @ai-sdk packages separately!
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
 * const model = google("gemini-2.5-flash-lite", {
 *   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
 * });
 *
 * // Cerebras (requires createOpenAI for custom base URL)
 * const cerebras = createOpenAI({
 *   apiKey: process.env.CEREBRAS_API_KEY,
 *   baseURL: "https://api.cerebras.ai/v1",
 * });
 * const model = cerebras("gpt-oss-120b");
 *
 * // Zhipu AI (custom base URL for GLM Coding Plan)
 * const zhipuAi = createOpenAI({
 *   apiKey: process.env.ZHIPU_AI_API_KEY,
 *   baseURL: "https://api.z.ai/api/coding/paas/v4/",
 * });
 * const model = zhipuAi("glm-4.6");
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
		model: "gemini-2.5-flash-lite",
		config: `google("gemini-2.5-flash-lite", { apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })`,
	},
	cerebras: {
		provider: "@ai-sdk/openai-v5",
		model: "gpt-oss-120b",
		config: `createOpenAI({ apiKey: process.env.CEREBRAS_API_KEY, baseURL: "https://api.cerebras.ai/v1" })("gpt-oss-120b")`,
	},
	zhipuAi: {
		provider: "@ai-sdk/openai-v5",
		model: "glm-4.6",
		config: `createOpenAI({ apiKey: process.env.ZHIPU_AI_API_KEY, baseURL: "https://api.z.ai/api/coding/paas/v4/" })("glm-4.6")`,
	},
};
