import { initializeDatabase, memoize } from "../core/cache";
import defaultLogger from "../logger";

const logger = defaultLogger.child({ module: "reddit" });

// ============================================================================
// Types
// ============================================================================

interface GetPostParams {
	subreddit: string;
	id: string;
	title: string;
}

interface GetMediaParams {
	url: string;
}

interface MediaItem {
	url: string;
	type: "image" | "video" | "gallery_image" | "preview" | "thumbnail";
	width?: number;
	height?: number;
	caption?: string;
	mediaId?: string;
}

interface ExtractedMedia {
	mainMedia: MediaItem[];
	previews: MediaItem[];
	thumbnails: MediaItem[];
	galleryItems: MediaItem[];
	videoData: MediaItem[];
}

// ============================================================================
// Constants
// ============================================================================

const REDDIT = "https://old.reddit.com";

const UA = {
	headers: {
		"user-agent": "evening-scraper/1.0 (bot)",
	},
	method: "GET" as const,
};

// ============================================================================
// Reddit Provider Class
// ============================================================================

class Reddit {
	/**
	 * Fetch a Reddit post with all its data
	 */
	@memoize({ provider: "reddit" })
	async getPost({ subreddit, id, title }: GetPostParams) {
		const url = `${REDDIT}/r/${subreddit}/comments/${id}/${title}/.json`;
		logger.info({ subreddit, id, title }, "Fetching post from Reddit API");

		const response = await fetch(url, UA);

		if (!response.ok) {
			let bodyText = "";
			try {
				bodyText = await response.text();
			} catch (e) {
				logger.warn({ error: e }, "Failed to read error response body");
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

		try {
			const data = await response.json();
			logger.info(
				{
					subreddit,
					id,
					title,
					statusCode: response.status,
				},
				"Successfully fetched post",
			);
			return data;
		} catch (parseError) {
			const errorMessage = `Failed to parse JSON response from Reddit API`;
			logger.error(
				{
					subreddit,
					id,
					title,
					statusCode: response.status,
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
	 * Fetch media from a URL (image, video, etc.)
	 * Returns the raw content as a Buffer
	 */
	@memoize({ provider: "reddit" })
	async getMedia({ url }: GetMediaParams): Promise<Buffer> {
		logger.info({ url }, "Fetching media");

		const response = await fetch(url, {
			headers: {
				"user-agent": "evening-scraper/1.0 (bot)",
			},
		});

		if (!response.ok) {
			const errorMessage = `Failed to fetch media: ${response.status} ${response.statusText}`;
			logger.error(
				{
					url,
					statusCode: response.status,
					statusText: response.statusText,
				},
				errorMessage,
			);
			throw new Error(errorMessage);
		}

		const buffer = Buffer.from(await response.arrayBuffer());
		logger.info(
			{
				url,
				sizeBytes: buffer.length,
				contentType: response.headers.get("content-type"),
			},
			"Successfully fetched media",
		);

		return buffer;
	}

	/**
	 * Fetch a subreddit's listing (hot, new, top, etc.)
	 */
	@memoize({ provider: "reddit" })
	async getSubreddit({
		name,
		sort = "hot",
		limit = 25,
		after,
	}: {
		name: string;
		sort?: "hot" | "new" | "top" | "rising";
		limit?: number;
		after?: string;
	}) {
		const params = new URLSearchParams({
			limit: limit.toString(),
			...(after && { after }),
		});

		const url = `${REDDIT}/r/${name}/${sort}.json?${params}`;
		logger.info({ name, sort, limit, after }, "Fetching subreddit listing");

		const response = await fetch(url, UA);

		if (!response.ok) {
			const errorMessage = `Failed to fetch subreddit: ${response.status} ${response.statusText}`;
			logger.error({ name, sort, statusCode: response.status }, errorMessage);
			throw new Error(errorMessage);
		}

		const data = await response.json();
		logger.info({ name, sort, limit }, "Successfully fetched subreddit listing");
		return data;
	}

	/**
	 * Fetch user profile and recent posts
	 */
	@memoize({ provider: "reddit" })
	async getUser({
		username,
		sort = "new",
		limit = 25,
	}: {
		username: string;
		sort?: "new" | "hot" | "top" | "controversial";
		limit?: number;
	}) {
		const params = new URLSearchParams({
			limit: limit.toString(),
			sort,
		});

		const url = `${REDDIT}/user/${username}.json?${params}`;
		logger.info({ username, sort, limit }, "Fetching user profile");

		const response = await fetch(url, UA);

		if (!response.ok) {
			const errorMessage = `Failed to fetch user: ${response.status} ${response.statusText}`;
			logger.error(
				{ username, statusCode: response.status },
				errorMessage,
			);
			throw new Error(errorMessage);
		}

		const data = await response.json();
		logger.info({ username }, "Successfully fetched user profile");
		return data;
	}

	// =========================================================================
	// Media Extraction Utilities (not memoized - these parse cached data)
	// =========================================================================

	/**
	 * Extract all media URLs from a post response
	 * This is a helper method that parses the cached post data
	 */
	extractMedia(postData: any): ExtractedMedia {
		const result: ExtractedMedia = {
			mainMedia: [],
			previews: [],
			thumbnails: [],
			galleryItems: [],
			videoData: [],
		};

		try {
			// Navigate to the post data (Reddit returns [listing, comments])
			const post = postData?.[0]?.data?.children?.[0]?.data;
			if (!post) {
				logger.warn("No post data found in response");
				return result;
			}

			// Extract thumbnail
			if (post.thumbnail && post.thumbnail.startsWith("http")) {
				result.thumbnails.push({
					url: post.thumbnail,
					type: "thumbnail",
				});
			}

			// Extract main URL (for direct image/video links)
			if (post.url && post.url.startsWith("http")) {
				const url = post.url;
				const isImage =
					post.post_hint === "image" ||
					/\.(jpg|jpeg|png|gif|webp)$/i.test(url);
				const isVideo =
					post.post_hint === "hosted:video" || post.is_video === true;

				if (isImage) {
					result.mainMedia.push({
						url,
						type: "image",
					});
				} else if (isVideo) {
					result.mainMedia.push({
						url,
						type: "video",
					});
				}
			}

			// Extract gallery items
			if (post.is_gallery && post.media_metadata) {
				for (const [mediaId, metadata] of Object.entries(
					post.media_metadata,
				)) {
					const media = metadata as any;
					if (media.status === "valid" && media.s?.u) {
						// Decode HTML entities in URL
						const url = media.s.u.replace(/&amp;/g, "&");
						result.galleryItems.push({
							url,
							type: "gallery_image",
							width: media.s.x,
							height: media.s.y,
							mediaId,
						});
					}
				}
			}

			// Extract Reddit-hosted video
			if (post.is_video && post.media?.reddit_video) {
				const video = post.media.reddit_video;
				if (video.fallback_url) {
					result.videoData.push({
						url: video.fallback_url,
						type: "video",
						width: video.width,
						height: video.height,
					});
				}
				// Also include DASH and HLS URLs if available
				if (video.dash_url) {
					result.videoData.push({
						url: video.dash_url,
						type: "video",
					});
				}
				if (video.hls_url) {
					result.videoData.push({
						url: video.hls_url,
						type: "video",
					});
				}
			}

			// Extract preview images (multiple resolutions)
			if (post.preview?.images) {
				for (const imageSet of post.preview.images) {
					// Original/source image
					if (imageSet.source?.url) {
						const url = imageSet.source.url.replace(/&amp;/g, "&");
						result.previews.push({
							url,
							type: "preview",
							width: imageSet.source.width,
							height: imageSet.source.height,
						});
					}

					// Resolutions (smaller versions)
					if (imageSet.resolutions) {
						for (const resolution of imageSet.resolutions) {
							if (resolution.url) {
								const url = resolution.url.replace(/&amp;/g, "&");
								result.previews.push({
									url,
									type: "preview",
									width: resolution.width,
									height: resolution.height,
								});
							}
						}
					}
				}
			}

			logger.info(
				{
					mainMedia: result.mainMedia.length,
					previews: result.previews.length,
					thumbnails: result.thumbnails.length,
					galleryItems: result.galleryItems.length,
					videoData: result.videoData.length,
				},
				"Extracted media from post",
			);
		} catch (error) {
			logger.error(
				{ error: error instanceof Error ? error.message : String(error) },
				"Failed to extract media from post",
			);
		}

		return result;
	}

	/**
	 * Fetch a post and download all its media
	 * This is a composite operation that uses multiple memoized calls
	 */
	async fetchPostWithMedia(params: GetPostParams): Promise<{
		post: any;
		media: ExtractedMedia;
		downloadedMedia: Map<string, Buffer>;
	}> {
		// Fetch the post (memoized)
		const post = await this.getPost(params);

		// Extract media URLs from the cached post
		const media = this.extractMedia(post);

		// Download all media (each download is memoized)
		const downloadedMedia = new Map<string, Buffer>();
		const allMediaUrls = [
			...media.mainMedia,
			...media.galleryItems,
			...media.videoData,
			...media.previews,
			...media.thumbnails,
		].map((item) => item.url);

		logger.info(
			{ totalUrls: allMediaUrls.length },
			"Downloading media for post",
		);

		for (const url of allMediaUrls) {
			try {
				const buffer = await this.getMedia({ url });
				downloadedMedia.set(url, buffer);
			} catch (error) {
				logger.warn(
					{
						url,
						error: error instanceof Error ? error.message : String(error),
					},
					"Failed to download media item",
				);
				// Continue with other media items
			}
		}

		logger.info(
			{
				totalUrls: allMediaUrls.length,
				downloaded: downloadedMedia.size,
			},
			"Completed media download for post",
		);

		return { post, media, downloadedMedia };
	}
}

// ============================================================================
// Main Function (for testing)
// ============================================================================

async function main() {
	try {
		await initializeDatabase();

		const reddit = new Reddit();

		// Example 1: Fetch a single post
		logger.info("Example 1: Fetching a single post");
		const postData = await reddit.getPost({
			subreddit: "pics",
			id: "92dd8",
			title: "test_post_please_ignore",
		});
		logger.info({ hasData: !!postData }, "Fetched post");

		// Example 2: Extract media from the post
		logger.info("Example 2: Extracting media from post");
		const media = reddit.extractMedia(postData);
		logger.info(
			{
				mainMedia: media.mainMedia.length,
				previews: media.previews.length,
				galleryItems: media.galleryItems.length,
			},
			"Extracted media",
		);

		// Example 3: Download specific media if available
		if (media.mainMedia.length > 0) {
			logger.info("Example 3: Downloading first media item");
			const firstMedia = media.mainMedia[0];
			const buffer = await reddit.getMedia({ url: firstMedia.url });
			logger.info({ sizeBytes: buffer.length }, "Downloaded media");
		}

		// Example 4: Fetch subreddit listing
		logger.info("Example 4: Fetching subreddit listing");
		const subredditData = await reddit.getSubreddit({
			name: "pics",
			sort: "hot",
			limit: 5,
		});
		logger.info({ hasData: !!subredditData }, "Fetched subreddit");

		// Example 5: Fetch post with all media (composite operation)
		logger.info("Example 5: Fetching post with all media");
		const fullPost = await reddit.fetchPostWithMedia({
			subreddit: "pics",
			id: "92dd8",
			title: "test_post_please_ignore",
		});
		logger.info(
			{
				downloadedCount: fullPost.downloadedMedia.size,
			},
			"Fetched post with all media",
		);

		logger.info("All examples completed successfully");
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.stack : String(error) },
			"Failed to execute main function",
		);
		process.exit(1);
	}
}

// Export the class and types
export { Reddit, type GetPostParams, type GetMediaParams, type MediaItem, type ExtractedMedia };

if (require.main === module) {
	main();
}
