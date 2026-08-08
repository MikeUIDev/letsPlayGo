# letsPlayGo

Local Go (Weiqi) web game built with React, Vite, and TypeScript, with optional KataGo AI on 9×9.

## Features

- 9×9, 13×13, and 19×19 boards for local two-player games
- Pure TypeScript rules engine (captures, ko, suicide prevention, undo, Chinese scoring)
- Play vs AI on 9×9 via a separate Node/KataGo backend
- Save/resume and SGF import/export

## Development

### Frontend

```bash
npm install
npm run dev
npm test
npm run build
```

Copy `.env.example` to `.env` and choose an AI provider:

- `VITE_AI_PROVIDER=mock` — default, uses in-browser MockGoAI (no backend)
- `VITE_AI_PROVIDER=api` — calls `/api` (proxied to the backend in dev)

### Backend (KataGo AI)

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your local KataGo paths
npm run dev
```

With both running:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3001/api/health`

## KataGo setup (local)

1. Download/build [KataGo](https://github.com/lightvector/KataGo) for your platform.
2. Download a compatible 9×9-capable neural network (`.bin.gz`).
3. Copy `server/.env.example` to `server/.env` and set:
   - `KATAGO_BINARY_PATH` — path to the `katago` executable
   - `KATAGO_MODEL_PATH` — path to the model file
   - `KATAGO_CONFIG_PATH` — path to an Analysis Engine config (e.g. `analysis_example.cfg`)
4. Start the backend with `npm run dev` inside `server/`.
5. Confirm `GET /api/health` returns `"katago": "ready"`.
6. Set `VITE_AI_PROVIDER=api` in the frontend `.env` and start a 9×9 AI game.

Do not commit KataGo binaries or model files — they are gitignored.

## Tech Stack

- React + TypeScript + Vite
- Node + TypeScript AI backend
- KataGo via long-running JSON Analysis Engine process
- Vitest for unit tests
