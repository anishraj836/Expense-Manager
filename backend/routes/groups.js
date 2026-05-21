const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Group = require('../models/Group');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'expense-manager-super-secret-key';

// Middleware to verify JWT token
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// Create a new group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, members } = req.body;
    
    // Ensure current user is in members
    const groupMembers = members.includes(req.userId) ? members : [...members, req.userId];
    
    const group = new Group({
      name,
      description: description || '',
      members: groupMembers,
      createdBy: req.userId
    });
    
    await group.save();
    
    const populatedGroup = await Group.findById(group._id).populate('members', 'name email avatarUrl');
    res.status(201).json(populatedGroup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all groups for current user
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.userId }).populate('members', 'name email avatarUrl');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a specific group details
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.userId }).populate('members', 'name email avatarUrl');
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a member to an existing group
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    // Find the group and make sure the current user is a member
    const group = await Group.findOne({ _id: req.params.id, members: req.userId });
    if (!group) return res.status(404).json({ error: 'Group not found or you are not a member' });

    // Check if the user is already a member
    if (group.members.includes(userId)) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    group.members.push(userId);
    await group.save();

    const populatedGroup = await Group.findById(group._id).populate('members', 'name email avatarUrl');
    res.json(populatedGroup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
