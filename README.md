# evening

Pretty basic OSINT/data gathering userscript.

Currently only supports collecting twitter UserCell data, as you manually scroll
through twitter

- Followers
- Following
- Retweeters (For reposts excluding quote reposts)
- Likers (only your tweets)

They will be saved in indexed db automatically, and you can download all data as
a json when you press the download button in the upper right corner.

## Development

1. Have a web browser that is compatible with tampermonkey etc. Google Chrome will do.
2. Install tampermonkey and Disable-CSP extensions.
3. Turn off CSP using the extension. This takes some time to take effect; not sure why.
4. Clone this repository.
5. Run `bun i` (or use a package manager of your choice).
6. Run `bun dev`.
7. Go to the URL printed in the terminal.
8. Open twitter if it didn't open already.
