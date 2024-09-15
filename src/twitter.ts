export class Twitter {
	#timer: NodeJS.Timeout | null = null;
	#userCellData = new Map<
		string,
		{ avatar: string; name: string; handle: string; bio: string; path: string }
	>();

	constructor() {
		this.#timer = setInterval(() => {
			this.#getUserCellData();
		}, 1000);
	}

	#getUserCellData() {
		const userCells = document.querySelectorAll(
			'button[data-testid="UserCell"]',
		);
		for (const userCell of userCells) {
			const avatar =
				userCell
					.querySelector('div[data-testid^="UserAvatar-Container-"] img')
					?.getAttribute("src") || "";
			const anchors = userCell.querySelectorAll("a");
			const name = anchors[1]?.textContent || "";
			const handle = anchors[2]?.textContent || "";
			// div > div:nth-child(2) does not work! Why?
			const divs = userCell.querySelectorAll("div");
			let bio = divs[divs.length - 1]?.textContent || "";
			if (bio?.startsWith("Click to")) {
				bio = "";
			}

			const key = `${window.location.pathname}/__${handle}`;

			if (!this.#userCellData.has(handle)) {
				this.#userCellData.set(handle, {
					avatar,
					name,
					handle,
					bio,
					path: window.location.pathname,
				});
			}
		}
	}

	print() {
		console.log(Array.from(this.#userCellData.values()));
	}

	[Symbol.asyncDispose]() {
		if (this.#timer) {
			clearInterval(this.#timer);
			this.#timer = null;
		}

		this.#userCellData.clear();

		return Promise.resolve();
	}
}
