# Testing

Puzzle Corner has automatic checks (Playwright) that run on every push and pull request.
The live site only updates from `main`, and **only if every check passes** (see `.github/workflows/qa-and-deploy.yml`).

## What is checked

Every check runs at three sizes: iPad landscape (1180×820), iPad portrait (820×1180) and phone (390×844), all with touch.
In GitHub Actions the checks run in the runner's preinstalled Google Chrome (one parallel job per size); locally they run in Chromium and WebKit (Safari's engine) by default.
After a deploy, a last job confirms the live site is serving the new files and doesn't expose the test files.

- **Every button** (`tests/screens.spec.js`): on the home screen, each of the five games and the daily puzzle, every visible button is tapped from a fresh start and must visibly change something; every popup a button opens (settings, theme picker, "new puzzle?", check/reveal menus…) gets the same treatment. Settings and progress survive closing the app.
- **Playing** (`tests/play.spec.js`): each game is played to the end through the real buttons on Easy, Medium and Hard and must show "Wonderful!"; the daily puzzle is finished and shows as done; every crossword key, sudoku number, scramble tile/slot and memory card responds.
- **Files & sound** (`tests/assets-audio.spec.js`): every file the page, styles, offline list and manifest point at returns 200; every app file is in the offline list; icons are real PNGs of the right size; fonts load; taps, every game and the win tune make sounds, and Sound: Off silences them. (Sounds are made live with Web Audio, so there are no sound files.)
- **Offline** (`tests/offline.spec.js`): the service worker installs, and all five games plus the daily puzzle work with no internet; the app never contacts other websites.
- **Layout** (`tests/layout.spec.js`): at normal and largest text size, nothing hangs off the sides, boards fit, buttons are big enough to tap, and the settings popup fits.
- Every test fails on any console error or uncaught exception.

## What is not checked automatically

- Whether sounds *sound* right, and whether puzzles feel fun / look right.
- Whether generated puzzles are good puzzles (words appropriate, difficulty feels right).
- Real iPad/iPhone Safari quirks (Add to Home Screen, real keyboard, audio unlocking on device).

## Running locally

```sh
npm ci
npx playwright install --with-deps chromium webkit
npm test                               # everything
BROWSERS=chromium npx playwright test  # quicker, Chromium only
BROWSERS=chrome ONLY_SIZE=phone npx playwright test  # what one CI job runs
npx playwright test tests/play.spec.js --project=webkit-phone
```
