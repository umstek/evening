import localforage from 'localforage';

type PostData = {
  id: string;
  subreddit: string;
  title: string;
  author: string;
  text: string;
  score: number;
  created: string;
  url: string;
  permalink: string;
};

type MediaData = {
  postId: string;
  type: 'image' | 'video' | 'gallery';
  url: string;
  thumbnail: string;
  width: number;
  height: number;
};

type CommentData = {
  id: string;
  postId: string;
  author: string;
  text: string;
  score: number;
  created: string;
  depth: number;
};

export class Reddit {
  #timer: NodeJS.Timeout | null = null;
  #postData = new Map<string, PostData>();
  #mediaData = new Map<string, MediaData>();
  #commentData = new Map<string, CommentData>();
  #store = localforage.createInstance({
    name: 'reddit-evening',
  });

  constructor() {
    this.#timer = setInterval(() => {
      this.#getPost();
      this.#getMedia();
      this.#getComment();
    }, 1000);
  }

  async #getPost() {
    const posts = document.querySelectorAll('shreddit-post');
    for (const post of posts) {
      const id = post.getAttribute('id') ?? '';
      const subreddit =
        post.getAttribute('subreddit-prefixed-name')?.replace('r/', '') ?? '';
      const title = post.getAttribute('post-title') ?? '';
      const author = post.getAttribute('author') ?? '';
      const score = Number.parseInt(post.getAttribute('score') ?? '0');
      const created = post.getAttribute('created-timestamp') ?? '';
      const permalink = post.getAttribute('content-href') ?? '';
      const url = `https://reddit.com${permalink}`;

      const contentSlot = post.querySelector(
        'div[slot="text-body"]',
      ) as HTMLElement;
      const text = contentSlot?.innerText ?? '';

      const path = window.location.pathname;
      const key = `${path}/__post_${id}`;

      if (!this.#postData.has(key)) {
        const value = {
          id,
          subreddit,
          title,
          author,
          text,
          score,
          created,
          url,
          permalink,
        };
        this.#postData.set(key, value);
        await this.#store.setItem(key, value);
      }
    }
  }

  async #getMedia() {
    const posts = document.querySelectorAll('shreddit-post');
    for (const post of posts) {
      const postId = post.getAttribute('id') ?? '';

      // Image posts
      const images = post.querySelectorAll('img[src*="redd.it"]');
      for (const img of images) {
        const url = img.getAttribute('src') ?? '';
        const thumbnail = url;
        const width = Number.parseInt(img.getAttribute('width') ?? '0');
        const height = Number.parseInt(img.getAttribute('height') ?? '0');

        const key = `${postId}/__media_${url}`;
        if (!this.#mediaData.has(key)) {
          const value = {
            postId,
            type: 'image' as const,
            url,
            thumbnail,
            width,
            height,
          };
          this.#mediaData.set(key, value);
          await this.#store.setItem(key, value);
        }
      }

      // Video posts
      const videos = post.querySelectorAll('shreddit-player');
      for (const video of videos) {
        const url = video.getAttribute('src') ?? '';
        const thumbnail = video.getAttribute('thumbnail') ?? '';
        const width = Number.parseInt(video.getAttribute('width') ?? '0');
        const height = Number.parseInt(video.getAttribute('height') ?? '0');

        const key = `${postId}/__media_${url}`;
        if (!this.#mediaData.has(key)) {
          const value = {
            postId,
            type: 'video' as const,
            url,
            thumbnail,
            width,
            height,
          };
          this.#mediaData.set(key, value);
          await this.#store.setItem(key, value);
        }
      }

      // Gallery posts
      const galleryItems = post.querySelectorAll('gallery-item img');
      for (const img of galleryItems) {
        const url = img.getAttribute('src') ?? '';
        const thumbnail = url;
        const width = Number.parseInt(img.getAttribute('width') ?? '0');
        const height = Number.parseInt(img.getAttribute('height') ?? '0');

        const key = `${postId}/__media_${url}`;
        if (!this.#mediaData.has(key)) {
          const value = {
            postId,
            type: 'gallery' as const,
            url,
            thumbnail,
            width,
            height,
          };
          this.#mediaData.set(key, value);
          await this.#store.setItem(key, value);
        }
      }
    }
  }

  async #getComment() {
    const comments = document.querySelectorAll('shreddit-comment');
    for (const comment of comments) {
      const id = comment.getAttribute('thingid') ?? '';
      const author = comment.getAttribute('author') ?? '';
      const score = Number.parseInt(comment.getAttribute('score') ?? '0');
      const created = comment.getAttribute('created-timestamp') ?? '';
      const depth = Number.parseInt(comment.getAttribute('depth') ?? '0');

      const textElement = comment.querySelector('div[slot="comment"]');
      const text = textElement?.textContent ?? '';

      const postId = comment.getAttribute('postid') ?? '';
      const path = window.location.pathname;
      const key = `${path}/__comment_${id}`;

      if (!this.#commentData.has(key)) {
        const value = {
          id,
          postId,
          author,
          text,
          score,
          created,
          depth,
        };
        this.#commentData.set(key, value);
        await this.#store.setItem(key, value);
      }
    }
  }

  async downloadAll() {
    const items: (PostData | MediaData | CommentData)[] = [];
    await this.#store.iterate((value) => {
      items.push(value as PostData | MediaData | CommentData);
    });
    console.log(items);

    const json = JSON.stringify(items);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reddit-evening.json';
    a.click();
  }

  async clear() {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    this.#postData.clear();
    this.#mediaData.clear();
    this.#commentData.clear();
    await this.#store.clear();
    this.#timer = setInterval(() => {
      this.#getPost();
      this.#getMedia();
      this.#getComment();
    }, 1000);
  }

  [Symbol.dispose]() {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    this.#postData.clear();
    this.#mediaData.clear();
    this.#commentData.clear();
  }
}
