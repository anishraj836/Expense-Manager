const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  oauthId: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, required: true },
  password: { type: String },
  name: { type: String, required: true },
  avatarUrl: { type: String },
  upiId: { type: String },
  paymentQrBase64: { type: String },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
