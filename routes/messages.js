const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const authMiddleware = require("../middleware/authmiddleware");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

// Helper to validate IDs (no URLs)
const isValidId = (id) => /^[\w-]+$/.test(id);

// ---- Send text message ----
router.post("/send", authMiddleware, async (req, res) => {
  try {
    const newMessage = await Message.create({
      wa_id: req.body.wa_id,
      from: req.body.from,
      to: req.body.to,
      text: req.body.text,
      createdAt: new Date(),
      status: "sent",
      unread: true,
    });
    req.app.get("io").emit("newMessage", newMessage);
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ---- Send group message ----
router.post("/sendGroup", authMiddleware, async (req, res) => {
  const { groupId, from, text } = req.body;

  const groupMessage = await Message.create({
    wa_id: groupId,
    from,
    to: groupId,
    text,
    status: "sent",
    isGroup: true
  });

  const io = req.app.get("io");
  io.emit(`groupMessage:${groupId}`, groupMessage);
  res.json(groupMessage);
});

// ---- Send media message ----
router.post("/sendMedia", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const newMessage = await Message.create({
      wa_id: req.body.wa_id,
      from: req.body.from,
      to: req.body.to,
      text: req.body.text || "",
      mediaUrl: req.file ? `/uploads/${req.file.filename}` : null,
      mediaType: req.file?.mimetype || null,
      createdAt: new Date(),
      status: "sent",
      unread: true,
    });
    req.app.get("io").emit("newMessage", newMessage);
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ---- Mark messages as read ----
router.post("/markRead/:wa_id", authMiddleware, async (req, res) => {
  const wa_id = req.params.wa_id;
  if (!isValidId(wa_id)) return res.status(400).json({ error: "Invalid wa_id" });

  try {
    await Message.updateMany(
      { wa_id, unread: true },
      { $set: { unread: false, status: "read" } }
    );
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ---- Get user info by wa_id ----
router.get("/user/:wa_id", authMiddleware, async (req, res) => {
  const wa_id = req.params.wa_id;
  if (!isValidId(wa_id)) return res.status(400).json({ error: "Invalid wa_id" });

  try {
    const message = await Message.findOne({ wa_id });
    if (!message) return res.json({ name: "Unknown", number: wa_id });
    res.json({ name: message.name || "Unknown", number: wa_id });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ---- Get messages for a conversation ----
router.get("/:wa_id", authMiddleware, async (req, res) => {
  const wa_id = req.params.wa_id;
  if (!isValidId(wa_id)) return res.status(400).json({ error: "Invalid wa_id" });

  try {
    const messages = await Message.find({ wa_id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ---- Get all conversations ----
router.get("/", authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
