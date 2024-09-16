import localforage from 'localforage';

type TwitterRecord = {
  avatar: string;
  name: string;
  handle: string;
  bio: string;
  path: string;
};

export class Twitter {
  #timer: NodeJS.Timeout | null = null;
  #userCellData = new Map<string, TwitterRecord>();
  #store = localforage.createInstance({
    name: 'twitter-evening',
  });

  constructor() {
    this.#timer = setInterval(() => {
      this.#getUserCellData();
    }, 1000);
  }

  async #getUserCellData() {
    const userCells = document.querySelectorAll(
      'button[data-testid="UserCell"]',
    );
    for (const userCell of userCells) {
      const avatar =
        userCell
          .querySelector('div[data-testid^="UserAvatar-Container-"] img')
          ?.getAttribute('src') || '';
      const anchors = userCell.querySelectorAll('a');
      const name = anchors[1]?.textContent || '';
      const handle = anchors[2]?.textContent || '';
      // div > div:nth-child(2) does not work! Why?
      const divs = userCell.querySelectorAll('div');
      let bio = divs[divs.length - 1]?.textContent || '';
      if (bio?.startsWith('Click to')) {
        bio = '';
      }

      const key = `${window.location.pathname}/__${handle}`;
      if (!this.#userCellData.has(key)) {
        const value = {
          avatar,
          name,
          handle,
          bio,
          path: window.location.pathname,
        };
        this.#userCellData.set(key, value);
        await this.#store.setItem(key, value);
      }
    }
  }

  async downloadAll() {
    // Get all items from the store and make a json, then download it
    const items: TwitterRecord[] = [];
    await this.#store.iterate((value) => {
      items.push(value as TwitterRecord);
    });
    console.log(items);

    const json = JSON.stringify(items);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'twitter-evening.json';
    a.click();
  }

  async clear() {
    // Clear the timer
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    // Clear the user cell data
    this.#userCellData.clear();
    // Clear the store
    await this.#store.clear();
    this.#timer = setInterval(() => {
      this.#getUserCellData();
    }, 1000);
  }

  [Symbol.dispose]() {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }

    this.#userCellData.clear();
  }
}
