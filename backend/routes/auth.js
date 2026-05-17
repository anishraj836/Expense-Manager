const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'expense-manager-super-secret-key';

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    const payload = { userId: user.id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const payload = { userId: user.id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mock OAuth Login (Simulates Github OAuth without needing Client IDs)
router.post('/mock-oauth', async (req, res) => {
  try {
    const { provider, email, name } = req.body;
    const userEmail = email || `${provider}_user_${Date.now()}@mock.com`;
    const userName = name || (provider === 'google' ? 'Google User' : 'GitHub User');
    const oauthId = `${provider}_${userEmail}`; // Use email in oauthId to allow logging back into same account

    // Find existing or create a new mock user
    let user = await User.findOne({ oauthId });
    if (!user) {
      user = new User({
        name: userName,
        email: userEmail,
        oauthId
      });
      await user.save();
    }

    const payload = { userId: user.id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'Access token required' });
    
    // Fetch user info from Google API
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const googleData = await googleRes.json();
    
    if (!googleRes.ok) throw new Error(googleData.error_description || 'Failed to fetch Google user data');

    const oauthId = `google_${googleData.sub}`;
    
    let user = await User.findOne({ oauthId });
    if (!user) {
      // Check if user already exists with this email
      user = await User.findOne({ email: googleData.email });
      if (user) {
        // Link the Google account
        user.oauthId = oauthId;
        await user.save();
      } else {
        // Create new account
        user = new User({
          name: googleData.name,
          email: googleData.email,
          oauthId
        });
        await user.save();
      }
    }

    const payload = { userId: user.id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user (using token)
router.get('/me', async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    res.json(user);
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
});

module.exports = router;
