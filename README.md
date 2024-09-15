# evening

Pretty basic OSINT/data gathering userscript.

Currently only supports collecting twitter followers/following data, as you manually scroll. 
Pressing "print" will log them to the console.

## Development

1. Have a web browser that is compatible with tampermonkey etc. Google Chrome will do.
2. Install tampermonkey and Disable-CSP extensions.
3. Turn off CSP using the extension. This takes some time to take effect; not sure why.
4. Clone this repository.
5. Run `bun i` (or use a package manager of your choice).
6. Run `bun dev`.
7. Go to the URL printed in the terminal.
8. Open twitter if it didn't open already.
