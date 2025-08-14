// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// After other app.use() lines
if (process.env.NODE_ENV === "production") {
app.use(express.static(path.join(__dirname, "../frontend/build")));
app.get(/.*/, (req, res) => {
res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
});
}

const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server, {
cors: {
origin: "http://localhost:5173",
methods: ["GET", "POST"]
}
});

const activeUsers = new Map();

io.on('connection', socket => {
console.log('Socket connected:', socket.id);

socket.on("userOnline", (userId) => {
activeUsers.set(userId, socket.id);
io.emit("updateUserStatus", { userId, status: "online" });
});
//typing events here
socket.on("typing", (data) => {
socket.broadcast.emit("typing", data);
});

socket.on("stopTyping", (data) => {
socket.broadcast.emit("stopTyping", data);
});

socket.on('disconnect', () => {
console.log('Socket disconnected:', socket.id);
// Remove user from activeUsers and emit offline status
for (let [userId, id] of activeUsers) {
if (id === socket.id) {
activeUsers.delete(userId);
io.emit("updateUserStatus", { userId, status: "offline" });
}
}
});
});

app.set('io', io);

mongoose.connect(process.env.MONGO_URI, {
useNewUrlParser: true,
useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes);

const groupRoutes = require("./routes/groups");
app.use("/api/groups", groupRoutes);

app.get('/', (req, res) => {
res.send('WhatsApp Clone Backend OK');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log('🚀 Server running on port ${PORT}'));