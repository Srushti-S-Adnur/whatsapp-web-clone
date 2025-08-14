// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');

const app = express();

// CORS setup
app.use(cors({
  origin: [
    "http://localhost:5173", // for local dev
    "https://whatsapp-clone.vercel.app" // your deployed frontend
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🚫 Removed the production static frontend serve block

const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://whatsapp-clone.vercel.app"
    ],
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

  socket.on("typing", (data) => {
    socket.broadcast.emit("typing", data);
  });

  socket.on("stopTyping", (data) => {
    socket.broadcast.emit("stopTyping", data);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    for (let [userId, id] of activeUsers) {
      if (id === socket.id) {
        activeUsers.delete(userId);
        io.emit("updateUserStatus", { userId, status: "offline" });
      }
    }
  });
});

app.set('io', io);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
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
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
