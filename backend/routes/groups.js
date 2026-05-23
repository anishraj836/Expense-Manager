const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Group = require('../models/Group');
const User = require('../models/User');
const Proposal = require('../models/Proposal');
const Transaction = require('../models/Transaction');
const SHA256 = require('crypto-js/sha256');

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

// Get all proposals for a group
router.get('/:id/proposals', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.userId });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const proposals = await Proposal.find({ groupId: req.params.id })
      .populate('proposedBy', 'name email avatarUrl')
      .populate('approvals', 'name email avatarUrl')
      .sort({ createdAt: -1 });
    
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new proposal for a group
router.post('/:id/proposals', auth, async (req, res) => {
  try {
    const { title, description, transactions } = req.body;
    
    const group = await Group.findOne({ _id: req.params.id, members: req.userId });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (!transactions || transactions.length === 0) {
      return res.status(400).json({ error: 'Transactions are required' });
    }

    const proposal = new Proposal({
      groupId: req.params.id,
      proposedBy: req.userId,
      title,
      description,
      transactions,
      approvals: [req.userId] // Proposer automatically approves
    });

    await proposal.save();

    // If it's a 1-person group... just approve it immediately
    if (group.members.length === 1) {
      await commitProposalTransactions(proposal, group);
    }

    const populatedProposal = await Proposal.findById(proposal._id)
      .populate('proposedBy', 'name email avatarUrl')
      .populate('approvals', 'name email avatarUrl');
      
    res.status(201).json(populatedProposal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve a proposal
router.post('/:id/proposals/:proposalId/approve', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.userId });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const proposal = await Proposal.findOne({ _id: req.params.proposalId, groupId: req.params.id });
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    if (proposal.status !== 'pending') return res.status(400).json({ error: 'Proposal is not pending' });

    if (!proposal.approvals.includes(req.userId)) {
      proposal.approvals.push(req.userId);
    }

    let newlyApproved = false;
    // Check if all members have approved
    const allApproved = group.members.every(memberId => 
      proposal.approvals.some(appId => appId.toString() === memberId.toString())
    );

    if (allApproved) {
      proposal.status = 'approved';
      newlyApproved = true;
    }

    await proposal.save();

    if (newlyApproved) {
      await commitProposalTransactions(proposal, group);
    }

    const populatedProposal = await Proposal.findById(proposal._id)
      .populate('proposedBy', 'name email avatarUrl')
      .populate('approvals', 'name email avatarUrl');
      
    res.json(populatedProposal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject a proposal
router.post('/:id/proposals/:proposalId/reject', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.userId });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const proposal = await Proposal.findOne({ _id: req.params.proposalId, groupId: req.params.id });
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    if (proposal.status !== 'pending') return res.status(400).json({ error: 'Proposal is not pending' });

    proposal.status = 'rejected';
    proposal.rejectedBy = req.userId;
    await proposal.save();

    const populatedProposal = await Proposal.findById(proposal._id)
      .populate('proposedBy', 'name email avatarUrl')
      .populate('approvals', 'name email avatarUrl')
      .populate('rejectedBy', 'name email avatarUrl');
      
    res.json(populatedProposal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to insert approved transactions
async function commitProposalTransactions(proposal, group) {
  try {
    for (const txData of proposal.transactions) {
      // Find the most recent active transaction to link the hash
      const lastTx = await Transaction.findOne({ status: 'active' }).sort({ createdAt: -1 });
      const previousHash = lastTx ? lastTx.hash : 'GENESIS_HASH';

      // Reconstruct hash data
      const dataString = JSON.stringify({
        description: txData.description,
        amount: txData.amount,
        date: txData.date || new Date().toISOString(),
        type: txData.type || 'expense',
        payers: txData.payers.map(p => ({ userId: p.userId, amount: p.amount })),
        splits: txData.splits.map(s => ({ userId: s.userId, amount: s.amount })),
        status: 'active',
        supersededBy: null,
        originalTxId: null,
        attachmentBase64: txData.attachmentBase64 || null
      });
      
      const hash = SHA256(dataString + previousHash).toString();

      const newTx = new Transaction({
        description: txData.description,
        amount: txData.amount,
        date: txData.date || new Date(),
        type: txData.type || 'expense',
        payers: txData.payers,
        splits: txData.splits,
        groupId: group._id,
        status: 'active',
        previousHash,
        hash,
        attachmentBase64: txData.attachmentBase64 || null
      });

      await newTx.save();
    }
  } catch (err) {
    console.error('Error committing proposal transactions:', err);
  }
}

module.exports = router;
