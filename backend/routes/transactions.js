const express = require('express');
const router = express.Router();
const SHA256 = require('crypto-js/sha256');
const Transaction = require('../models/Transaction');

// Compute hash of a transaction deterministically
function computeHash(txData, previousHash) {
  const dataString = JSON.stringify({
    description: txData.description,
    amount: txData.amount,
    date: txData.date,
    type: txData.type,
    payers: txData.payers.map(p => ({ userId: p.userId.toString(), amount: p.amount })),
    splits: txData.splits.map(s => ({ userId: s.userId.toString(), amount: s.amount })),
    status: txData.status,
    supersededBy: txData.supersededBy ? txData.supersededBy.toString() : null,
    originalTxId: txData.originalTxId ? txData.originalTxId.toString() : null
  });
  return SHA256(dataString + previousHash).toString();
}

// Initialize Redis Client conditionally (Economical Setup)
const redis = require('redis');
let redisClient;
if (process.env.REDIS_URI) {
  redisClient = redis.createClient({ url: process.env.REDIS_URI });
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.connect().then(() => console.log('Connected to Redis Cache')).catch(console.error);
}

// 1. Get transactions (Activity Feed with Pagination)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Economical: fetch only 20 at a time for UI
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1b. Get Ledger for Hash Verification (Economical: Only fetch minimal fields needed for hash)
router.get('/ledger', async (req, res) => {
  try {
    // In a fully scaled app, this would use Checkpoints. 
    // For now, we return the minimal payload for local verification.
    const ledger = await Transaction.find()
      .sort({ createdAt: 1 })
      .select('description amount date type payers splits status supersededBy originalTxId hash previousHash');
    res.json(ledger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to invalidate cache
async function invalidateBalancesCache() {
  if (redisClient) {
    try {
      await redisClient.del('global_balances');
    } catch (e) { console.error('Cache clear failed', e); }
  }
}

// 2. Add a new transaction
router.post('/', async (req, res) => {
  try {
    const txData = req.body;
    
    // Fetch the latest transaction to get the previousHash
    const lastTx = await Transaction.findOne().sort({ createdAt: -1 });
    if (!lastTx) {
      return res.status(500).json({ error: 'Ledger is not initialized with Genesis block' });
    }

    const previousHash = lastTx.hash;
    const hash = computeHash(txData, previousHash);

    const newTx = new Transaction({
      ...txData,
      previousHash,
      hash
    });

    await newTx.save();
    await invalidateBalancesCache();
    res.status(201).json(newTx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Edit a transaction (Creates a new ledger entry, marks old as superseded)
router.put('/:id', async (req, res) => {
  try {
    const oldTxId = req.params.id;
    const oldTx = await Transaction.findById(oldTxId);
    
    if (!oldTx) return res.status(404).json({ error: 'Transaction not found' });
    if (oldTx.status !== 'active') return res.status(400).json({ error: 'Cannot edit a non-active transaction' });

    const newTxData = req.body;
    
    // We get the current end of the chain
    const lastTx = await Transaction.findOne().sort({ createdAt: -1 });
    const previousHash = lastTx.hash;
    
    // Create new transaction representing the edit
    const newTxObj = {
      ...newTxData,
      status: 'active',
      originalTxId: oldTx.originalTxId || oldTx._id
    };
    
    const hash = computeHash(newTxObj, previousHash);
    
    const newTx = new Transaction({
      ...newTxObj,
      previousHash,
      hash
    });
    await newTx.save();

    // Now append a "superseded" marker transaction to the chain for the old tx?
    // Actually, to keep it simple and strictly append-only without breaking hash verification:
    // We shouldn't mutate `oldTx.status` if the client relies on the hash!
    // Wait, if we mutate `oldTx.status`, its hash will change and the chain breaks!
    // Instead of mutating the old transaction in DB, we use append-only edit logs.
    // The client resolves the active state by ignoring superseded transactions.
    
    // Wait, the client verifies `hash`. If we change `oldTx.status` in DB, the client will fetch it, compute its hash, and it will FAIL because the hash was computed when status was 'active'.
    // So we CANNOT edit ANY field of an existing transaction once saved.
    // We must issue a "Supersede" transaction!
    
    const supersedeTxData = {
      description: `SUPERSEDE: ${oldTx._id}`,
      amount: 0,
      type: 'settlement',
      payers: [],
      splits: [],
      status: 'superseded',
      originalTxId: oldTx._id
    };
    
    const supersedeHash = computeHash(supersedeTxData, newTx.hash);
    const supersedeTx = new Transaction({
      ...supersedeTxData,
      previousHash: newTx.hash,
      hash: supersedeHash
    });
    
    await supersedeTx.save();
    await invalidateBalancesCache();

    res.status(201).json({ newTx, supersedeTx });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
