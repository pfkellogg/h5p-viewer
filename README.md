# FastDash H5P Viewer

Role-gated inspector for H5P content on any page. Part of the FastDash Toolkit (FREE module).

## Description

H5P Viewer is a role-gated diagnostic tool that examines H5P content loaded in the browser. On button click, it displays a popup showing the H5P content type, H5P ID, all questions, and all answers (both correct and incorrect) for any H5P element on the current page. Supports nested/child interactions such as Interactive Video and multiple H5P interactions on the same page.

## How It Appears (No Shortcode Needed)

The viewer is **not** a shortcode and requires no markup, block, or template change. Once activated, it loads automatically on the frontend for any logged-in user whose role is allowed (administrators only by default — configurable under **Settings → H5P Viewer**).

On every page that contains H5P content, the plugin injects a floating **"H5P"** toggle button fixed to the **bottom-right corner** of the screen. The button carries an amber badge showing how many H5P interactions were found on the page. Clicking it opens a draggable, resizable inspector panel listing each H5P element's type, ID, questions, and answers.

- **Auto-injected** via `wp_footer` — nothing to place in content.
- **Only appears when H5P is present** — if the page has no H5P content, no button shows.
- **Role-gated** — hidden entirely from users whose role isn't allowed (and from logged-out visitors).

## Features

- Role-gated access (administrators only by default; configurable per role under **Settings → H5P Viewer**)
- Inspects H5P content loaded in the browser
- Displays H5P content type and H5P ID
- Shows all questions and answers (correct and incorrect)
- Supports nested/child interactions (e.g., Interactive Video)
- Supports multiple H5P interactions on the same page
- Button-triggered popup display

## Toolkit Integration

Also available as the `h5p-viewer` module in `dvp-toolkit-ld` (FREE tier).

## Requirements

- WordPress 6.0+
- H5P plugin
- PHP 7.4+
