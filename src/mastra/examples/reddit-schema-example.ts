import { typescriptToZodTool } from "../tools/typescript-to-zod";

/**
 * Practical example: Generate Zod schema for Reddit API responses
 *
 * This demonstrates using the TypeScript-to-Zod tool with real data
 * from the Reddit provider. This is useful for validating scraped data.
 */
async function generateRedditSchemas() {
	console.log("🔧 Generating Zod schemas for Reddit data types\n");

	// Example 1: Reddit Post
	console.log("1️⃣  Generating schema for RedditPost...\n");

	const postInterface = `
interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  url: string;
  permalink: string;
  score: number;
  num_comments: number;
  created_utc: number;
  is_video: boolean;
  is_self: boolean;
  selftext?: string;
  thumbnail?: string;
  preview?: object;
}
  `.trim();

	const postSample = {
		id: "abc123",
		title: "Interesting programming article",
		author: "reddit_user",
		subreddit: "programming",
		url: "https://example.com/article",
		permalink: "/r/programming/comments/abc123/interesting_programming_article",
		score: 1234,
		num_comments: 56,
		created_utc: 1699564800,
		is_video: false,
		is_self: false,
		thumbnail: "https://i.redd.it/thumb.jpg",
		preview: {},
	};

	const postResult = await typescriptToZodTool.execute({
		context: {
			interfaceString: postInterface,
			sampleData: postSample,
		},
		runtimeContext: {} as any,
	});

	console.log(postResult.zodSchema);
	console.log(`\n${"─".repeat(80)}\n`);

	// Example 2: Reddit Comment
	console.log("2️⃣  Generating schema for RedditComment...\n");

	const commentInterface = `
interface RedditComment {
  id: string;
  author: string;
  body: string;
  score: number;
  created_utc: number;
  parent_id: string;
  permalink: string;
  depth: number;
  is_submitter: boolean;
  edited?: number;
}
  `.trim();

	const commentSample = {
		id: "def456",
		author: "commenter",
		body: "Great post!",
		score: 42,
		created_utc: 1699565000,
		parent_id: "t3_abc123",
		permalink:
			"/r/programming/comments/abc123/interesting_programming_article/def456",
		depth: 1,
		is_submitter: false,
	};

	const commentResult = await typescriptToZodTool.execute({
		context: {
			interfaceString: commentInterface,
			sampleData: commentSample,
		},
		runtimeContext: {} as any,
	});

	console.log(commentResult.zodSchema);
	console.log(`\n${"─".repeat(80)}\n`);

	console.log("✅ Done! You can save these schemas and use them to validate");
	console.log("   scraped data before storing in the content-addressed cache.");
}

// Only run if executed directly (not imported)
if (import.meta.main) {
	generateRedditSchemas().catch(console.error);
}

export { generateRedditSchemas };
