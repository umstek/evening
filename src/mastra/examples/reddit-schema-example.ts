import { RuntimeContext } from "@mastra/core/runtime-context";
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

	// Multiple samples for better type inference
	// Include negative scores to reflect real Reddit data (downvoted posts)
	const postSamples = [
		{
			id: "abc123",
			title: "Interesting programming article",
			author: "reddit_user",
			subreddit: "programming",
			url: "https://example.com/article",
			permalink:
				"/r/programming/comments/abc123/interesting_programming_article",
			score: 1234,
			num_comments: 56,
			created_utc: 1699564800,
			is_video: false,
			is_self: false,
			thumbnail: "https://i.redd.it/thumb.jpg",
			preview: {},
		},
		{
			id: "def456",
			title: "Another post",
			author: "another_user",
			subreddit: "javascript",
			url: "https://github.com/example/repo",
			permalink: "/r/javascript/comments/def456/another_post",
			score: 89,
			num_comments: 12,
			created_utc: 1699651200,
			is_video: true,
			is_self: false,
			thumbnail: "https://i.redd.it/thumb2.jpg",
		},
		{
			id: "ghi789",
			title: "Controversial post",
			author: "test_user",
			subreddit: "unpopularopinion",
			url: "https://reddit.com/r/unpopularopinion/comments/ghi789",
			permalink: "/r/unpopularopinion/comments/ghi789/controversial_post",
			score: -15,
			num_comments: 0,
			created_utc: 1699737600,
			is_video: false,
			is_self: true,
		},
	];

	const postResult = await typescriptToZodTool.execute({
		context: {
			interfaceString: postInterface,
			sampleData: postSamples,
		},
		runtimeContext: new RuntimeContext(),
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

	// Multiple comment samples
	// Include negative scores for downvoted comments
	const commentSamples = [
		{
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
		},
		{
			id: "ghi789",
			author: "another_commenter",
			body: "I agree",
			score: 5,
			created_utc: 1699565100,
			parent_id: "t1_def456",
			permalink:
				"/r/programming/comments/abc123/interesting_programming_article/ghi789",
			depth: 2,
			is_submitter: false,
			edited: 1699565200,
		},
		{
			id: "jkl012",
			author: "troll_user",
			body: "This is terrible",
			score: -8,
			created_utc: 1699565300,
			parent_id: "t3_abc123",
			permalink:
				"/r/programming/comments/abc123/interesting_programming_article/jkl012",
			depth: 1,
			is_submitter: false,
		},
	];

	const commentResult = await typescriptToZodTool.execute({
		context: {
			interfaceString: commentInterface,
			sampleData: commentSamples,
		},
		runtimeContext: new RuntimeContext(),
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
