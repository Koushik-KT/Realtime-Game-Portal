# Realtime Game Portal (Advanced - Option B)
This repo contains a Realtime Multiplayer Game Portal with:
- Multiplayer Tic-Tac-Toe (Socket.io)
- Multiplayer Rock-Paper-Scissors (Socket.io)
- Memory Match (local, uses LocalStorage)
- Advanced backend with in-memory room management and cleanup
- Frontend built with Vite + React + Socket.io-client

## Run locally (backend)
cd backend
npm install
node server.js

## Run locally (frontend)
cd frontend
npm install
npm run dev

## Deploy
- Backend: Render (set root directory to `backend`)
- Frontend: Vercel (set root directory to `frontend`)

Update `frontend/src/config.js` BACKEND_URL to point to deployed backend URL.
