# PlayMatch Sports Network

A sports matchmaking prototype for finding nearby players, creating matchups, running demo matches and updating fair player ratings.

## Features

- Location-based player discovery
- Region-priority sports recommendations
- Fair rating system built from skill, win rate, peer feedback, reliability and recent form
- Match Lab that finds two compatible players and simulates a match
- Rating update cards after each match
- Request-to-play flow
- Light and dark mode
- Console and Network telemetry events for judging demos

## Tech

HTML, CSS, JavaScript with no build step.

## Run it

Open `index.html` in a browser, or serve the folder locally:

```bash
python -m http.server 8098
```

Then visit <http://127.0.0.1:8098/>.

## Demo script

1. Click **Find Network Match**.
2. Show the matched players and their compatibility signals.
3. Click **Run Demo Match**.
4. Show the old rating and the new rating.
5. Open DevTools, go to Console and Network, and filter for `pm_event` to see the event log.
