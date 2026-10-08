# PlayMatch Sports Network

PlayMatch is a sports matchmaking prototype for finding nearby players, creating matchups, running demo matches, and updating fair player ratings.

## Features

- Location/locality-based player discovery
- Region-priority sports recommendations
- Fair rating system using skill, win rate, peer feedback, reliability, and recent form
- Match Lab that finds two compatible players and simulates a match
- Rating update cards after each match
- Request-to-play flow
- Light/dark mode toggle
- Console and Network telemetry events for judging demos

## How To Run

Open `index.html` in a browser, or serve the folder locally:

```powershell
python -m http.server 8098
```

Then visit:

```text
http://127.0.0.1:8098/
```

## Demo Script

1. Click **Find Network Match**.
2. Show the matched players and compatibility signals.
3. Click **Run Demo Match**.
4. Show old rating -> new rating.
5. Open DevTools Console and Network; filter `pm_event` to show event logging.

