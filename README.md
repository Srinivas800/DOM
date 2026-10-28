Here the link:

[MY TODOD LIST](https://mytasklistt.netlify.app/)

# My Todo List

A simple, good-looking to-do list built with plain HTML, CSS and JavaScript. No frameworks, no build step, no installs.

## Features

- Add tasks with the **Add Task** button or the Enter key
- **Checkbox** on every task to mark it done
- **Delete** button on every task
- **Progress bar** with a live count, like "3 of 8 done"
- **Filters:** All, Active and Completed
- **Daily reset:** every new day, all checkboxes are unchecked and your tasks stay
- **Dark/light mode** toggle that remembers your choice
- **Glassmorphism** card on a gradient background
- **Animations** when tasks are added, deleted and completed
- **Confetti** when you finish every task
- **Auto-save** in the browser, so tasks survive a refresh
- **Responsive** layout for phones and tablets
- Respects the "reduce motion" accessibility setting

## Project structure

```
.
├── index.html   # page structure
├── style.css    # styling, themes and animations
├── DOM2.js      # all the app logic
└── README.md
```

## How to run

1. Put the three files (`index.html`, `style.css`, `DOM2.js`) in the same folder.
2. Open `index.html` in any modern browser.

That's it. An internet connection is only needed for the Google Fonts. Without it, the app falls back to system fonts.

## How it works

- Tasks are stored in the browser's `localStorage` as objects: `{ id, text, done }`.
- The theme choice is stored under `theme`.
- The date of the last reset is stored under `lastReset`. On each visit (and once a minute while the page is open), the app compares it with today's date. If the day has changed, every task is marked as not done.

## Customizing

| What | Where |
| --- | --- |
| LinkedIn link on the byline | `index.html`, the `href` inside `.byline` |
| Colors (light and dark) | `style.css`, the variables in `:root` and `[data-theme="dark"]` |
| Mobile breakpoint | `style.css`, the `@media (max-width: 600px)` rule |
| Confetti colors and amount | `DOM2.js`, the `confetti()` function |
| Daily reset behavior | `DOM2.js`, the `resetIfNewDay()` function |

## Limitations

- Data is saved only in one browser on one device. It does not sync between devices.
- Clearing your browser data deletes your tasks.

## Author

Made by [Srinivas Sayinni](https://www.linkedin.com/in/YOUR-USERNAME)
