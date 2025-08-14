// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');

const app = express();

// ===== CORS CONFIG =====
const allowedOrigins = [
  'http://localhost:5173', // Local frontend
  'https://whatsapp-frontend-puce.vercel.app/' // Replace with your actual Vercel frontend URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman) or from allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked: ' + origin));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

// ===== STATIC FILES =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend build in production (optional if deploying backend separately)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
  });
}

// ===== SOCKET.IO =====
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
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

// ===== DATABASE =====
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ===== ROUTES =====
app.use("/api/auth", require("./routes/auth"));
app.use('/api/messages', require('./routes/messages'));
app.use("/api/groups", require("./routes/groups"));

app.get('/', (req, res) => {
  res.send('WhatsApp Clone Backend OK');
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));