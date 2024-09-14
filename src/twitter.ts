export class Twitter {
	timer: NodeJS.Timeout | null = null;
	constructor() {
		this.timer = null;
	}

	#userCellData = new Map<
		string,
		{ avatar: string; name: string; handle: string; bio: string }
	>();

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
			const divs = userCell.querySelectorAll("div");
			let bio = divs[divs.length - 1]?.textContent || "";
			if (bio?.startsWith("Click to")) {
				bio = "";
			}

			if (!this.#userCellData.has(handle)) {
				this.#userCellData.set(handle, { avatar, name, handle, bio });
			}
		}
	}

	print() {
		console.log(this.#userCellData);
	}

	init() {
		this.timer = setInterval(() => {
			this.#getUserCellData();
		}, 1000);
	}
}
