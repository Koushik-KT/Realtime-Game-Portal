/* Advanced backend server.js */
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 5000;
const rooms = {};
const ROOM_TTL_MS = 1000 * 60 * 30;
function getOrCreateRoom(roomId, game) {
  if (!rooms[roomId]) rooms[roomId] = { players: [], game: game || null, state: {}, history: [], lastActive: Date.now() };
  else { rooms[roomId].lastActive = Date.now(); if (game && !rooms[roomId].game) rooms[roomId].game = game; }
  return rooms[roomId];
}
setInterval(()=>{
  const now = Date.now();
  for (const [id,r] of Object.entries(rooms)) {
    if ((!r.players || r.players.length===0) && (now - r.lastActive > ROOM_TTL_MS)) {
      console.log("Cleaning up room:", id); delete rooms[id];
    }
  }
}, 1000*60*5);
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  socket.on("joinRoom", ({ roomId, playerName, game }) => {
    if (!roomId || !playerName) { socket.emit("errorMessage","roomId and playerName required"); return; }
    const room = getOrCreateRoom(roomId, game);
    socket.join(roomId);
    if (!room.players.find(p=>p.id===socket.id)) room.players.push({ id: socket.id, name: playerName });
    io.to(roomId).emit("roomData", { players: room.players.map(p=>({id:p.id,name:p.name})), game: room.game });
    console.log(`Player ${playerName} joined ${roomId} (${room.game})`);
  });
  socket.on("move", ({ roomId, move }) => {
    const room = rooms[roomId]; if (!room) return; room.lastActive = Date.now();
    if (room.game === "TicTacToe") {
      if (typeof move.index !== "number" || !move.player) return;
      room.state[move.index] = move.player;
      room.history.push({ t: Date.now(), type: "move", move });
      io.to(roomId).emit("updateBoard", room.state);
    }
    if (room.game === "RPS") {
      if (!move.player || !move.choice) return;
      room.state[move.player] = move.choice;
      room.history.push({ t: Date.now(), type: "rps", move });
      const keys = Object.keys(room.state);
      if (keys.length >= 2) {
        const [p1,p2] = keys; const c1 = room.state[p1]; const c2 = room.state[p2];
        const winner = computeRPSWinner(p1,c1,p2,c2);
        room.history.push({ t: Date.now(), type: "rpsResult", result: winner });
        io.to(roomId).emit("rpsResult", winner);
        room.state = {};
      }
    }
  });
  socket.on("leaveRoom", ({ roomId }) => { leaveRoom(socket, roomId); });
  socket.on("disconnect", () => {
    for (const [roomId, room] of Object.entries(rooms)) {
      const idx = room.players.findIndex(p=>p.id===socket.id);
      if (idx !== -1) {
        const [removed] = room.players.splice(idx,1);
        console.log(`Player ${removed.name} disconnected from ${roomId}`);
        io.to(roomId).emit("roomData", { players: room.players.map(p=>({id:p.id,name:p.name})), game: room.game });
        room.lastActive = Date.now();
        if (room.players.length === 0) {
          setTimeout(()=>{ if (rooms[roomId] && rooms[roomId].players.length===0) { console.log("Auto-removing empty room:", roomId); delete rooms[roomId]; io.to(roomId).emit("roomClosed"); } }, 60*1000);
        }
      }
    }
  });
});
function leaveRoom(socket, roomId) {
  const room = rooms[roomId]; if (!room) return;
  const idx = room.players.findIndex(p=>p.id===socket.id); if (idx !== -1) {
    const [removed] = room.players.splice(idx,1); socket.leave(roomId);
    io.to(roomId).emit("roomData", { players: room.players.map(p=>({id:p.id,name:p.name})), game: room.game });
    room.lastActive = Date.now(); console.log(`Player ${removed.name} left ${roomId}`);
  }
}
function computeRPSWinner(p1,c1,p2,c2) {
  if (c1 === c2) return { result: "Draw", players: [{name:p1,choice:c1},{name:p2,choice:c2}] };
  const beats = { Rock: "Scissors", Paper: "Rock", Scissors: "Paper" };
  let winner = null; if (beats[c1] === c2) winner = p1; else winner = p2;
  return { result: "Win", winner, players: [{name:p1,choice:c1},{name:p2,choice:c2}] };
}
app.get("/", (req,res)=> res.send("Realtime Game Portal Backend - Advanced (Option B)"));
app.get("/rooms", (req,res)=> {
  const summary = Object.entries(rooms).map(([id,r])=>({ id, players: r.players.map(p=>p.name), game: r.game, lastActive: r.lastActive, historyCount: r.history.length }));
  res.json({ rooms: summary });
});
server.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));
