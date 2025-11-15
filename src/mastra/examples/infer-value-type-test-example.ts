import { RuntimeContext } from "@mastra/core/runtime-context";
import { inferValueTypeTool } from "../tools/infer-value-type";

/**
 * Example: Demonstrates the value type inference tool
 *
 * This is a demonstration script, not a unit test.
 * Run with: bun run src/mastra/examples/infer-value-type-test-example.ts
 */
async function demonstrateInferValueType() {
	console.log("Demonstrating value type inference...\n");

	const tests = [
		{
			name: "URLs",
			samples: [
				"https://example.com",
				"https://reddit.com/r/programming",
				"https://github.com/user/repo",
			],
			expected: "z.url()",
		},
		{
			name: "Positive integers (scores)",
			samples: [42, 128, 7, 1234],
			expected: "z.number().int().positive()",
		},
		{
			name: "Non-negative integers (counts with zero)",
			samples: [0, 5, 12, 0, 3],
			expected: "z.number().int().nonnegative()",
		},
		{
			name: "Mixed strings (not URLs)",
			samples: ["abc123", "def456", "user_name"],
			expected: "z.string()",
		},
		{
			name: "Booleans",
			samples: [true, false, true],
			expected: "z.boolean()",
		},
	];

	for (const test of tests) {
		const result = await inferValueTypeTool.execute({
			context: { samples: test.samples },
			runtimeContext: new RuntimeContext(),
		});

		const passed = result.zodType === test.expected;
		const icon = passed ? "✅" : "❌";

		console.log(`${icon} ${test.name}`);
		console.log(`   Samples: ${test.samples.length}`);
		console.log(`   Expected: ${test.expected}`);
		console.log(`   Got: ${result.zodType}`);
		console.log(`   Confidence: ${result.confidence}\n`);
	}
}

// Only run if executed directly (not imported)
if (import.meta.main) {
	demonstrateInferValueType().catch(console.error);
}

export { demonstrateInferValueType };
