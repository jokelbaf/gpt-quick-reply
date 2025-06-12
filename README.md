# GPT Quick Reply

A simple browser extension that helps you with your exams. Select text, send it to the OpenAI API, and get a sneaky popup reply.

## Features

- **Quick Answers:** Select any text on a webpage and get an instant answer from GPT in a popup.
- **Context Menu:** Right-click selected text and choose "Answer with GPT".
- **Customizable:** Choose your preferred GPT model, set max tokens, and manage your OpenAI API key.
- **Per-site Enable:** Enable or disable the extension on specific sites.
- **Light/Dark Theme:** Switch between light and dark popup themes.

## Browser Compatibility

This extension works on **Chrome, Edge, Opera, and most Chromium-based browsers**. The code uses the `browser` API where available, falling back to `chrome` for compatibility.

## Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/jokelbaf/gpt-quick-reply.git
   ```
2. **Open Chrome/Firefox/Edge/Opera and go to:** `chrome://extensions/` or `about:addons`
3. **Enable Developer mode** (top right).
4. **Click "Load unpacked"** and select the cloned `gpt-quick-reply` folder.

## Usage

1. Click the extension icon to open the settings popup.
2. Enter your OpenAI API key.
3. Enable the extension for the current site.
4. Select any text on a webpage and either:
   - Right-click and choose "Answer with GPT", or
   - Simply select text (if enabled) to trigger the popup.

## Configuration

- **API Key:** Required for OpenAI API access.
- **Model:** Choose from available GPT models.
- **Max Tokens:** Set the maximum number of tokens for responses.
- **Theme:** Toggle between light and dark mode.
- **Enable on Site:** Control which sites the extension is active on.

## License

MIT License. See [LICENSE](LICENSE) for details.
