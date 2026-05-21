const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const payerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const transactionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ['expense', 'settlement'], required: true },
  
  // Multiple payers and multiple splits
  payers: [payerSchema],
  splits: [splitSchema],
  
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, // optional group
  attachmentBase64: { type: String }, // For storing screenshot of settlement
  
  // Immutability and Audit Logs
  status: { type: String, enum: ['active', 'superseded', 'deleted'], default: 'active' },
  supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  originalTxId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }, // groups edits together
  
  // Cryptographic Ledger (Blockchain-like)
  previousHash: { type: String, required: true },
  hash: { type: String, required: true, unique: true }
}, { timestamps: true });

// Ensure strict chain
transactionSchema.index({ previousHash: 1 }, { unique: true });

module.exports = mongoose.model('Transaction', transactionSchema);
