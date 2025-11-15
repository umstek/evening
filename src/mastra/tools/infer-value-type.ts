import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Infers Zod type for leaf values (primitives only)
 * Takes multiple samples and only narrows down if 100% match
 *
 * Does NOT handle nested objects/arrays - only primitive values
 */
function inferLeafType(sampleValues: unknown[]): string {
	if (sampleValues.length === 0) {
		return "z.unknown()";
	}

	// Filter out null/undefined for type analysis
	const definedValues = sampleValues.filter(
		(v) => v !== null && v !== undefined,
	);
	if (definedValues.length === 0) {
		return "z.unknown()";
	}

	// Only handle primitive types - no objects or arrays
	const allStrings = definedValues.every((v) => typeof v === "string");
	if (allStrings) {
		const strings = definedValues as string[];

		// Only narrow down if 100% of samples pass validation
		// Use Zod v4 API (top-level functions)
		if (strings.every((s) => z.url().safeParse(s).success)) {
			return "z.url()";
		}
		if (strings.every((s) => z.email().safeParse(s).success)) {
			return "z.email()";
		}
		if (strings.every((s) => z.uuid().safeParse(s).success)) {
			return "z.uuid()";
		}
		if (strings.every((s) => z.iso.datetime().safeParse(s).success)) {
			return "z.iso.datetime()";
		}
		return "z.string()";
	}

	const allNumbers = definedValues.every((v) => typeof v === "number");
	if (allNumbers) {
		const numbers = definedValues as number[];

		if (numbers.every((n) => Number.isInteger(n))) {
			if (numbers.every((n) => n > 0)) {
				return "z.number().int().positive()";
			}
			if (numbers.every((n) => n >= 0)) {
				return "z.number().int().nonnegative()";
			}
			return "z.number().int()";
		}

		if (numbers.every((n) => n > 0)) {
			return "z.number().positive()";
		}
		if (numbers.every((n) => n >= 0)) {
			return "z.number().nonnegative()";
		}
		return "z.number()";
	}

	const allBooleans = definedValues.every((v) => typeof v === "boolean");
	if (allBooleans) {
		return "z.boolean()";
	}

	// Reject non-primitive types
	return "z.unknown()";
}

/**
 * Tool that infers Zod schema for primitive values only
 *
 * Use case: Identify URLs, dates, numbers, etc. when crawling
 * Does NOT handle nested objects/arrays - only leaf values
 */
export const inferValueTypeTool = createTool({
	id: "infer-value-type",
	description:
		"Infers Zod schema for primitive/leaf values (strings, numbers, booleans). Takes multiple samples and only narrows down if 100% match. Use for identifying URLs, dates, integers, etc. Does NOT handle nested objects or arrays.",
	inputSchema: z.object({
		samples: z
			.array(z.union([z.string(), z.number(), z.boolean()]))
			.min(1)
			.describe(
				"Array of sample values (primitives only). More samples = better inference. Algorithm requires 100% match to narrow types.",
			),
	}),
	outputSchema: z.object({
		zodType: z
			.string()
			.describe(
				"The inferred Zod schema string (e.g., 'z.string().url()', 'z.number().int().positive()')",
			),
		confidence: z
			.enum(["high", "medium", "low"])
			.describe(
				"Confidence level based on sample size and consistency (high: 10+ samples, medium: 3-9, low: 1-2)",
			),
	}),
	execute: async ({ context }) => {
		const { samples } = context;

		const zodType = inferLeafType(samples);

		// Determine confidence based on sample size
		let confidence: "high" | "medium" | "low";
		if (samples.length >= 10) {
			confidence = "high";
		} else if (samples.length >= 3) {
			confidence = "medium";
		} else {
			confidence = "low";
		}

		return {
			zodType,
			confidence,
		};
	},
});
