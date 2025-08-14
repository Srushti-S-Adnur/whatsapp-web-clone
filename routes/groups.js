const express = require("express");
const auth = require("../middleware/authmiddleware");
const Group = require("../models/Group");

const router = express.Router();

// Create group
router.post("/", auth, async (req, res) => {
  const { name, members } = req.body;
  const group = await Group.create({ name, members });
  res.json(group);
});

// Get groups for user
router.get("/", auth, async (req, res) => {
  const groups = await Group.find({ members: req.user }).populate("members", "name email");
  res.json(groups);
});

module.exports = router;
