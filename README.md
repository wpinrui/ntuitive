# NTUitive

A browser extension that makes NTULearn (Blackboard Ultra) more intuitive.

## Features

| Feature | Default | Description |
|---------|---------|-------------|
| **Course switcher** | On | Replaces the "Recent courses" dropdown with a searchable list of all enrolled courses |
| **Course links fix** | On | Makes course cards proper links so ctrl+click / right-click "Open in new tab" works |
| **Auto-expand folders** | On | Automatically opens folders in the course outline (configurable depth) |
| **PDF viewer fullscreen** | On | Expands document previews to fill the viewport |
| **Back button fix** | Off | Intercepts the close button to navigate back instead of pushing duplicate history entries |
| **Dark theme** | Off | Inverts colors for a dark appearance |
| **Surface download button** | Off | Replaces the overflow menu with a visible download button |

Features marked *(Experimental!)* in the popup are off by default.

## Install

### Chrome
1. Download or clone this repository
2. Go to `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the repo folder

### Firefox
1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json` from the repo folder

## Usage

Click the extension icon to toggle features. Changes take effect after page reload.

The course switcher requires visiting the course list page (`/ultra/course`) once to populate the cache.

## License

MIT
