const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
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

// Search users by name or email
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const regex = new RegExp(q, 'i');
    // Find users matching query, excluding self
    const users = await User.find({
      $and: [
        { _id: { $ne: req.userId } },
        { $or: [{ name: regex }, { email: regex }] }
      ]
    }).select('name email avatarUrl');

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user's friends and requests
router.get('/me/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('friends', 'name email avatarUrl')
      .populate('friendRequests', 'name email avatarUrl');
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      friends: user.friends,
      friendRequests: user.friendRequests
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a friend request
router.post('/request', auth, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    
    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    
    if (targetUser.friends.includes(req.userId)) {
      return res.status(400).json({ error: 'Already friends' });
    }

    if (targetUser.friendRequests.includes(req.userId)) {
      return res.status(400).json({ error: 'Request already sent' });
    }

    targetUser.friendRequests.push(req.userId);
    await targetUser.save();

    res.json({ success: true, message: 'Friend request sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept a friend request
router.post('/accept', auth, async (req, res) => {
  try {
    const { fromUserId } = req.body;
    
    const user = await User.findById(req.userId);
    const fromUser = await User.findById(fromUserId);
    
    if (!user || !fromUser) return res.status(404).json({ error: 'User not found' });

    // Verify request exists
    if (!user.friendRequests.includes(fromUserId)) {
      return res.status(400).json({ error: 'No pending friend request' });
    }

    // Remove from requests, add to friends for both
    user.friendRequests = user.friendRequests.filter(id => id.toString() !== fromUserId);
    if (!user.friends.includes(fromUserId)) user.friends.push(fromUserId);
    
    if (!fromUser.friends.includes(req.userId)) fromUser.friends.push(req.userId);

    await user.save();
    await fromUser.save();

    res.json({ success: true, message: 'Friend request accepted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy route (for AppContext compatibility before Phase 3 is fully adopted)
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('name email');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete current user account
router.delete('/me', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // In a real app, you might also want to anonymize or handle their transactions
    // and remove them from groups and friend lists. For now, just delete the user.
    await User.updateMany(
      { $or: [{ friends: req.userId }, { friendRequests: req.userId }] },
      { $pull: { friends: req.userId, friendRequests: req.userId } }
    );
    
    res.json({ message: 'User account deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
