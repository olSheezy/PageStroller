# Page Stroller

A Chrome extension for traversing a list of URLs manually or automatically. Perfect for reviewing multiple pages, monitoring dashboards, or cycling through a collection of sites.

## Features

- **Two input modes:**
  - **Direct URLs** — Enter full URLs, one per line
  - **Slot-based generation** — Use a base URL template with `{slot}` placeholder to generate URLs from a list of items
- **Auto-traverse** with configurable delay (5–60 seconds)
- **Manual navigation** via buttons or keyboard shortcuts
- **Pop-out window** — Detach the controls into a separate window to keep them visible while browsing
- **Visual URL list** — See all items in a scrollable sidebar with the current item highlighted
- **Dark/Light mode** — Toggle between themes with the 🌙/☀️ button
- **Persistent state** — Your collection, position, and settings are saved between sessions

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked** and select the project folder
5. The Page Stroller icon will appear in your toolbar

## Usage

### URLs Tab

1. Click the extension icon to open the popup
2. Enter URLs or items in the textarea (one per line)
3. **Optional:** Check "Use a slot to create URLs from the input" to enable slot mode
   - Enter a base URL containing `{slot}` (e.g., `https://example.com/{slot}/details`)

### Example

**Base URL:** `https://finance.yahoo.com/quote/{slot}`

**Input:**
```
AAPL
AMZN
META
MSFT
```

**Generated URLs:**
- `https://finance.yahoo.com/quote/AAPL`
- `https://finance.yahoo.com/quote/AMZN`
- `https://finance.yahoo.com/quote/META`
- `https://finance.yahoo.com/quote/MSFT`

4. Click **Generate Collection / Set Tab** (button activates when input is valid)

### Navigation Tab

- **Current URL** displayed at the top
- **URL list** on the left shows all items; click any to jump directly
- **Playback controls:**
  - ⏮ Skip to start
  - ← Previous
  - ▶ Play / ⏸ Pause auto-traverse
  - → Next
  - ⏭ Skip to end
- **Delay slider** — Adjust auto-traverse interval (5–60 seconds)

### Pop-Out Window

Click the ⧉ button in the top-right corner to open the controls in a separate window. This lets you keep the controls visible while the main browser tab navigates through your collection.

### Dark/Light Mode

Click the 🌙 button in the top-left corner to switch to dark mode. Click ☀️ to switch back to light mode. Your preference is saved automatically.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Q` | Previous item |
| `Alt+W` | Next item |
| `Alt+P` | Toggle play/pause |

Customize shortcuts at `chrome://extensions/shortcuts`


## Validation

The **Generate Collection / Set Tab** button is disabled until:
1. The URLs/Items textarea contains at least one entry
2. If slot mode is enabled, the base URL must not be empty and must contain `{slot}`

## Notes

- URLs without a protocol are automatically prefixed with `https://`
- State persists across browser sessions via Chrome's local storage
- The "Reset" link on the Navigation tab re-generates the collection using current URLs tab settings and can correct issues related to incorrect tab targeting.
