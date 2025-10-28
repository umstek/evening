import { initializeDatabase, memoize } from "../core/cache";
import defaultLogger from "../logger";

const logger = defaultLogger.child({ module: "reddit" });

interface GetPostParams {
	subreddit: string;
	id: string;
	title: string;
}

const REDDIT = "https://www.reddit.com/";

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
		const response = await fetch(
			`${REDDIT}/r/${subreddit}/comments/${id}/${title}/.json`,
			UA,
		);
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
		return response.json();
	}
}

async function main() {
	await initializeDatabase();

	const reddit = new Reddit();
	const result = await reddit.getPost({
		subreddit: "interestingasfuck",
		id: "1oftwfk",
		title: "photographer_shows_his_pov_vs_the_photos_he_takes",
	});

	logger.info({ hasResult: !!result }, "completed");
}

main();
