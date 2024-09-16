import localforage from 'localforage';

type UserCellData = {
  avatar: string;
  name: string;
  handle: string;
  bio: string;
  path: string;
};

type TweetData = {
  path: string;
  text: string;
  photo: string;
  views: number;
  time: string;
  likes: number;
  retweets: number;
  replies: number;
  bookmarks: number;
};

export class Twitter {
  #timer: NodeJS.Timeout | null = null;
  #userCellData = new Map<string, UserCellData>();
  #tweetData = new Map<string, TweetData>();
  #store = localforage.createInstance({
    name: 'twitter-evening',
  });

  constructor() {
    this.#timer = setInterval(() => {
      this.#getUserCellData();
      this.#getTweetData();
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

      const path = window.location.pathname;

      const key = `${path}/__user_${handle}`;
      if (!this.#userCellData.has(key)) {
        const value = { avatar, name, handle, bio, path };
        this.#userCellData.set(key, value);
        await this.#store.setItem(key, value);
      }
    }
  }

  async #getTweetData() {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    for (const tweet of tweets) {
      const text =
        tweet.querySelector('div[data-testid="tweetText"]')?.textContent ?? '';
      const photo =
        tweet
          .querySelector('div[data-testid="tweetPhoto"] img')
          ?.getAttribute('src') ?? '';
      const views =
        tweet.querySelector('span[data-testid="app-text-transition-container"]')
          ?.textContent ?? '0';
      const time = tweet.querySelector('time')?.getAttribute('datetime') ?? '';
      const replies =
        tweet.querySelector(
          'button[data-testid="reply"] [data-testid="app-text-transition-container"]',
        )?.textContent ?? '0';
      const retweets =
        tweet.querySelector(
          'button[data-testid="retweet"] [data-testid="app-text-transition-container"]',
        )?.textContent ?? '0';
      const likes =
        tweet.querySelector(
          'button[data-testid="like"] [data-testid="app-text-transition-container"]',
        )?.textContent ?? '0';
      const bookmarks =
        tweet.querySelector(
          'button[data-testid="bookmark"] [data-testid="app-text-transition-container"]',
        )?.textContent ?? '0';

      const path = window.location.pathname;

      const tweetData = {
        path,
        text,
        photo,
        views: Number.parseInt(views.replace(',', '')) || 0,
        time,
        replies: Number.parseInt(replies.replace(',', '')) || 0,
        retweets: Number.parseInt(retweets.replace(',', '')) || 0,
        likes: Number.parseInt(likes.replace(',', '')) || 0,
        bookmarks: Number.parseInt(bookmarks.replace(',', '')) || 0,
      };

      const key = `${path}/__tweet_${time}`;
      if (!this.#tweetData.has(key)) {
        this.#tweetData.set(key, tweetData);
        await this.#store.setItem(key, tweetData);
      }
    }
  }

  async downloadAll() {
    // Get all items from the store and make a json, then download it
    const items: UserCellData[] = [];
    await this.#store.iterate((value) => {
      items.push(value as UserCellData);
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
    this.#tweetData.clear();
    // Clear the store
    await this.#store.clear();
    this.#timer = setInterval(() => {
      this.#getUserCellData();
      this.#getTweetData();
    }, 1000);
  }

  [Symbol.dispose]() {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }

    this.#userCellData.clear();
    this.#tweetData.clear();
  }
}
