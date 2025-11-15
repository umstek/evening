import { RuntimeContext } from "@mastra/core/runtime-context";
import { inferValueTypeTool } from "../tools/infer-value-type";

/**
 * Example: Using value type inference for crawling decisions
 *
 * When scraping JSON responses, you encounter various values.
 * This tool helps identify what type they are (URLs, integers, dates, etc.)
 * so you can decide what to do next (download, validate, etc.)
 */
async function demonstrateValueTypeInference() {
	console.log("🔍 Value Type Inference Examples\n");

	// Example 1: Found URLs in JSON - should we crawl them?
	console.log("1️⃣  Analyzing URLs found in Reddit JSON...\n");

	const urlSamples = [
		"https://i.redd.it/abc123.jpg",
		"https://v.redd.it/def456/DASH_720.mp4",
		"https://i.redd.it/ghi789.png",
		"https://preview.redd.it/thumb.jpg",
	];

	const urlResult = await inferValueTypeTool.execute({
		context: { samples: urlSamples },
		runtimeContext: new RuntimeContext(),
	});

	console.log(`   Type: ${urlResult.zodType}`);
	console.log(`   Confidence: ${urlResult.confidence}`);
	console.log(
		"   → These are URLs! Download and check extension/magic bytes\n",
	);

	// Example 2: Score values - are they always positive?
	console.log("2️⃣  Analyzing Reddit post scores...\n");

	const scoreSamples = [42, 1234, 7, 89, 5, 128];

	const scoreResult = await inferValueTypeTool.execute({
		context: { samples: scoreSamples },
		runtimeContext: new RuntimeContext(),
	});

	console.log(`   Type: ${scoreResult.zodType}`);
	console.log(`   Confidence: ${scoreResult.confidence}`);
	console.log("   → All positive integers, can use stricter validation\n");

	// Example 3: Comment counts - includes zero
	console.log("3️⃣  Analyzing comment counts...\n");

	const countSamples = [0, 5, 12, 0, 3, 1, 0];

	const countResult = await inferValueTypeTool.execute({
		context: { samples: countSamples },
		runtimeContext: new RuntimeContext(),
	});

	console.log(`   Type: ${countResult.zodType}`);
	console.log(`   Confidence: ${countResult.confidence}`);
	console.log("   → Non-negative (includes zero), not positive\n");

	console.log("✅ Value type inference helps make crawling decisions:");
	console.log("   - URLs → download and check MIME type");
	console.log("   - Integers → validate ranges");
	console.log("   - Dates → parse and store as timestamps");
}

if (import.meta.main) {
	demonstrateValueTypeInference().catch(console.error);
}

export { demonstrateValueTypeInference };
