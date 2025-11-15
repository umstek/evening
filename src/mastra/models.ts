/**
 * Model configuration for different AI providers
 *
 * To use agents, install the AI SDK provider packages:
 *   bun add @ai-sdk/google @ai-sdk/openai
 *
 * Supported providers:
 * - Google Gemini (GOOGLE_GENERATIVE_AI_API_KEY)
 * - Cerebras (CEREBRAS_API_KEY)
 * - Zhipu AI / ZAI GLM Coding Plan (ZHIPU_AI_API_KEY)
 *
 * Example usage:
 *
 * ```typescript
 * import { openai } from "@ai-sdk/openai";
 * import { google } from "@ai-sdk/google";
 *
 * // Google Gemini
 * const geminiFlash = google("gemini-2.0-flash-exp", {
 *   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
 * });
 *
 * // Cerebras
 * const cerebrasLlama = openai("llama3.1-8b", {
 *   apiKey: process.env.CEREBRAS_API_KEY,
 *   baseURL: "https://api.cerebras.ai/v1",
 * });
 *
 * // Zhipu AI (custom base URL for coding plan)
 * const zhipuCoding = openai("glm-4-plus", {
 *   apiKey: process.env.ZHIPU_AI_API_KEY,
 *   baseURL: "https://api.z.ai/api/coding/paas/v4/",
 * });
 * ```
 */

export const modelExamples = {
	gemini: {
		provider: "@ai-sdk/google",
		config: `google("gemini-2.0-flash-exp", { apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })`,
	},
	cerebras: {
		provider: "@ai-sdk/openai",
		config: `openai("llama3.1-8b", { apiKey: process.env.CEREBRAS_API_KEY, baseURL: "https://api.cerebras.ai/v1" })`,
	},
	zhipuAi: {
		provider: "@ai-sdk/openai",
		config: `openai("glm-4-plus", { apiKey: process.env.ZHIPU_AI_API_KEY, baseURL: "https://api.z.ai/api/coding/paas/v4/" })`,
	},
};
