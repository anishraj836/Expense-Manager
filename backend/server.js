const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('./models/User');
const Transaction = require('./models/Transaction');
const transactionRoutes = require('./routes/transactions');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');

const path = require('path');

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');

const app = express();

// Enterprise Security Headers
app.use(helmet({ contentSecurityPolicy: false })); 

// Rate Limiting (Prevents Brute Force and DDoS)
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 150 // limit each IP to 150 requests per windowMs
});
app.use('/api/', limiter);

app.use(cors());
// Limit payload size to 10MB to accommodate base64 images and prevent payload attacks
app.use(express.json({ limit: '10mb' }));

// Data Sanitization against NoSQL Query Injection
app.use(mongoSanitize());

// Data Sanitization against XSS (Cross Site Scripting)
app.use(xss());

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', require('./routes/groups'));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../dist')));

// Catch-all route to serve the React app for any other URL (for React Router)
app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  } else {
    next();
  }
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    let mongoUri = process.env.MONGODB_URI;

    // Use in-memory MongoDB if no URI is provided, so it works out of the box!
    if (!mongoUri) {
      console.log('No MONGODB_URI found. Starting in-memory MongoDB...');
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
    }

    await mongoose.connect(mongoUri);
    console.log(`Connected to MongoDB at ${mongoUri}`);
    
    // Seed an initial genesis block if the ledger is empty
    const txCount = await Transaction.countDocuments();
    if (txCount === 0) {
      const genesis = new Transaction({
        description: 'GENESIS_BLOCK',
        amount: 0,
        type: 'expense',
        payers: [],
        splits: [],
        previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
        hash: 'GENESIS_HASH' // Will be a special string or we compute it normally
      });
      await genesis.save();
      console.log('Genesis block created for the ledger.');
    }

    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
  }
}

startServer();
