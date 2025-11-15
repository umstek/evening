import { initializeDatabase, memoize } from "../core/cache";
import defaultLogger from "../logger";
import { downloadVideoWithYtDlp } from "../utils/yt-dlp";

const logger = defaultLogger.child({ module: "reddit" });

interface GetPostParams {
	subreddit: string;
	id: string;
	title: string;
}

interface GetMediaParams {
	url: string;
}

interface MediaMetadata {
	url: string;
	width?: number;
	height?: number;
	type?: string;
}

interface GalleryItem {
	id: string;
	url: string;
	width?: number;
	height?: number;
}

interface VideoMetadata {
	url: string;
	fallbackUrl?: string;
	hlsUrl?: string;
	dashUrl?: string;
	width?: number;
	height?: number;
	duration?: number;
}

const REDDIT = "https://old.reddit.com";

const UA = {
	headers: {
		"user-agent":
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
		accept:
			"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
		"accept-language": "en-LK,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
		referer: "https://www.reddit.com/",
		priority: "u=0, i",
		"sec-ch-ua":
			'"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
		"sec-ch-ua-mobile": "?0",
		"sec-ch-ua-platform": '"Windows"',
		"sec-fetch-dest": "document",
		"sec-fetch-mode": "navigate",
		"sec-fetch-site": "none",
		"sec-fetch-user": "?1",
		"upgrade-insecure-requests": "1",
	},
	method: "GET",
};

class Reddit {
	@memoize({ provider: "reddit" })
	async getPost({ subreddit, id, title }: GetPostParams) {
		const url = `${REDDIT}/r/${subreddit}/comments/${id}/${title}/.json`;
		logger.info(`fetching post from Reddit API ${url}`);
		const response = await fetch(url, UA);

		// Check if response is OK before proceeding
		if (!response.ok) {
			let bodyText = "";
			try {
				bodyText = await response.text();
			} catch (_e) {
				// If we can't get the body text, just continue without it
			}

			const errorMessage = `Reddit API error: ${response.status} ${response.statusText}${bodyText ? ` - ${bodyText}` : ""}`;
			logger.error(
				{
					subreddit,
					id,
					title,
					statusCode: response.status,
					statusText: response.statusText,
					bodyText,
				},
				"Non-OK response from Reddit API",
			);
			throw new Error(errorMessage);
		}

		logger.info(
			{
				subreddit,
				id,
				title,
				statusCode: response.status,
				statusText: response.statusText,
			},
			"got post",
		);

		// Wrap JSON parsing in try/catch to handle parsing errors
		try {
			return await response.json();
		} catch (parseError) {
			const errorMessage = `Failed to parse JSON response from Reddit API for post ${id} in subreddit ${subreddit}`;
			logger.error(
				{
					subreddit,
					id,
					title,
					statusCode: response.status,
					statusText: response.statusText,
					parseError:
						parseError instanceof Error
							? parseError.message
							: String(parseError),
				},
				"JSON parsing error",
			);
			throw new Error(errorMessage);
		}
	}

	/**
	 * Decodes Reddit's HTML entities in URLs
	 */
	private decodeRedditUrl(url: string): string {
		return url.replace(/&amp;/g, "&");
	}

	/**
	 * Fetches binary media content from a URL
	 * @param url - Direct URL to the media file
	 * @returns ArrayBuffer containing the media content
	 */
	@memoize({ provider: "reddit" })
	async getMedia({ url }: GetMediaParams): Promise<ArrayBuffer> {
		logger.info(`fetching media from ${url}`);
		const response = await fetch(url, UA);

		if (!response.ok) {
			const errorMessage = `Failed to fetch media: ${response.status} ${response.statusText}`;
			logger.error(
				{ url, statusCode: response.status, statusText: response.statusText },
				"Failed to fetch media",
			);
			throw new Error(errorMessage);
		}

		logger.info({ url, statusCode: response.status }, "fetched media");
		return await response.arrayBuffer();
	}

	/**
	 * Fetches video using yt-dlp (handles audio+video merging for Reddit)
	 * @param url - Video URL (Reddit post URL or direct video URL)
	 * @returns Buffer containing the video content (memoize layer handles serialization)
	 */
	@memoize({ provider: "reddit" })
	async getVideoWithYtDlp({ url }: GetMediaParams): Promise<Buffer> {
		logger.info(`fetching video with yt-dlp from ${url}`);
		const buffer = await downloadVideoWithYtDlp(url);
		logger.info({ url, sizeBytes: buffer.length }, "fetched video with yt-dlp");
		// Return Buffer directly to avoid copying; memoize decorator handles serialization
		return buffer;
	}

	/**
	 * Extracts and fetches a single image from a Reddit post
	 * Handles both direct image links and preview images
	 * @param params - Post identification parameters
	 * @returns Image metadata and binary content
	 */
	async getImage(params: GetPostParams): Promise<{
		metadata: MediaMetadata;
		content: ArrayBuffer;
	}> {
		const post = await this.getPost(params);
		const postData = post?.[0]?.data?.children?.[0]?.data;

		if (!postData) {
			throw new Error("Invalid post structure");
		}

		let imageUrl: string | null = null;
		let width: number | undefined;
		let height: number | undefined;

		// Try to get high-quality preview image first
		if (postData.preview?.images?.[0]?.source) {
			const source = postData.preview.images[0].source;
			imageUrl = this.decodeRedditUrl(source.url);
			width = source.width;
			height = source.height;
		}
		// Fall back to direct URL
		else if (postData.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(postData.url)) {
			imageUrl = postData.url;
		}

		if (!imageUrl) {
			throw new Error("No image found in post");
		}

		const content = await this.getMedia({ url: imageUrl });

		return {
			metadata: { url: imageUrl, width, height, type: "image" },
			content,
		};
	}

	/**
	 * Extracts and fetches a video from a Reddit post
	 * Uses yt-dlp to handle audio+video merging for Reddit videos
	 * @param params - Post identification parameters
	 * @returns Video metadata and binary content
	 */
	async getVideo(params: GetPostParams): Promise<{
		metadata: VideoMetadata;
		content: ArrayBuffer | Buffer;
	}> {
		const post = await this.getPost(params);
		const postData = post?.[0]?.data?.children?.[0]?.data;

		if (!postData) {
			throw new Error("Invalid post structure");
		}

		if (!postData.is_video) {
			throw new Error("Post is not a video");
		}

		const redditVideo = postData.media?.reddit_video;
		if (!redditVideo?.fallback_url) {
			throw new Error("No video URL found in post");
		}

		// Construct full Reddit post URL for yt-dlp
		// yt-dlp can merge audio+video streams that Reddit separates
		const postUrl = `${REDDIT}/r/${params.subreddit}/comments/${params.id}/${params.title}/`;

		let content: ArrayBuffer | Buffer;
		try {
			// Try yt-dlp first (best quality with audio+video merged)
			// Returns Buffer from cache or yt-dlp
			content = await this.getVideoWithYtDlp({ url: postUrl });
		} catch (ytDlpError) {
			// Fall back to direct download (video only, no audio)
			logger.warn(
				{
					subreddit: params.subreddit,
					id: params.id,
					error:
						ytDlpError instanceof Error
							? ytDlpError.message
							: String(ytDlpError),
				},
				"yt-dlp failed, falling back to direct download",
			);
			const fallbackUrl = this.decodeRedditUrl(redditVideo.fallback_url);
			content = await this.getMedia({ url: fallbackUrl });
		}

		return {
			metadata: {
				url: postUrl,
				fallbackUrl: redditVideo.fallback_url,
				hlsUrl: redditVideo.hls_url,
				dashUrl: redditVideo.dash_url,
				width: redditVideo.width,
				height: redditVideo.height,
				duration: redditVideo.duration,
			},
			content,
		};
	}

	/**
	 * Extracts and fetches all images from a Reddit gallery post
	 * @param params - Post identification parameters
	 * @returns Array of gallery items with metadata and content
	 */
	async getGallery(params: GetPostParams): Promise<
		Array<{
			metadata: GalleryItem;
			content: ArrayBuffer;
		}>
	> {
		const post = await this.getPost(params);
		const postData = post?.[0]?.data?.children?.[0]?.data;

		if (!postData) {
			throw new Error("Invalid post structure");
		}

		if (!postData.is_gallery) {
			throw new Error("Post is not a gallery");
		}

		const mediaMetadata = postData.media_metadata;
		if (!mediaMetadata) {
			throw new Error("No media metadata found in gallery post");
		}

		// Extract all valid image URLs first
		const imagePromises = Object.entries(mediaMetadata)
			.map(([id, item]) => {
				const itemData = item as {
					s?: { u?: string; x?: number; y?: number };
				};
				if (!itemData.s?.u) return null;

				const imageUrl = this.decodeRedditUrl(itemData.s.u);
				return {
					id,
					url: imageUrl,
					width: itemData.s.x,
					height: itemData.s.y,
				};
			})
			.filter((item): item is NonNullable<typeof item> => item !== null);

		if (imagePromises.length === 0) {
			throw new Error("No valid images found in gallery");
		}

		// Download all images in parallel for better throughput
		const results = await Promise.all(
			imagePromises.map(async (meta) => ({
				metadata: meta,
				content: await this.getMedia({ url: meta.url }),
			})),
		);

		return results;
	}
}

async function main() {
	try {
		await initializeDatabase();

		const reddit = new Reddit();

		// Example: Fetch a post (JSON is automatically cached)
		const post = await reddit.getPost({
			subreddit: "interestingasfuck",
			id: "1oftwfk",
			title: "photographer_shows_his_pov_vs_the_photos_he_takes",
		});

		logger.info({ postFetched: !!post }, "post fetched and cached");
		logger.info("completed");
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.stack : String(error) },
			"Failed to execute main function",
		);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}

export { Reddit };
export type {
	GetPostParams,
	GetMediaParams,
	MediaMetadata,
	GalleryItem,
	VideoMetadata,
};
