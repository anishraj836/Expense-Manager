# Expense Manager

A highly scalable, cryptographically secure web application for tracking shared expenses with friends and groups. It features a modern, glassmorphic UI and an immutable backend ledger that detects unauthorized database modifications.

## 🚀 Features
- **Advanced Expense Splitting**: Supports splitting bills equally, by exact amounts, or by percentages.
- **Multiple Payers**: Allows multiple people to pay for portions of a single bill.
- **Real-Time Dashboards**: Instantly calculates who you owe and who owes you.
- **Cryptographic Security**: Uses an append-only Hash-Chain Ledger (similar to Blockchain). The frontend locally verifies the `SHA-256` hash of every transaction to ensure no admin has tampered with the MongoDB database.
- **Highly Scalable**: Integrates Redis caching to instantly serve global balances and supports UI pagination for massive transaction histories.

## 🛠 Tech Stack
- **Frontend**: React (TypeScript), Vite, Vanilla CSS, Lucide Icons, Crypto-JS.
- **Backend**: Node.js, Express.js.
- **Databases**: MongoDB (Atlas) for persistent storage, Redis for high-speed caching.

---

## 💻 Running Locally

### 1. Setup Backend
Open a terminal and navigate to the backend directory:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder and add your connection strings:
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/...
REDIS_URI=redis://default:<password>@redis-server-url:6379
PORT=5000
```
*(Note: If you leave `MONGODB_URI` or `REDIS_URI` empty, the backend will gracefully fall back to using an in-memory simulated MongoDB and disable caching, so you can test it immediately!)*

Start the backend server:
```bash
node server.js
```

### 2. Setup Frontend
Open a new terminal window in the root directory:
```bash
npm install
npm run dev
```
The frontend will start at `http://localhost:5173/`.

---

## 🌍 Deployment Guide

This repository is structured to be deployed as two separate scalable microservices.

### Backend Deployment (Render, Railway, or AWS)
1. Deploy the `backend/` directory as a Node.js web service.
2. In your hosting provider's settings, add the `MONGODB_URI` and `REDIS_URI` environment variables.
3. The hosting provider will give you a live API URL (e.g., `https://api.yourdomain.com`).

### Frontend Deployment (Vercel, Netlify, or AWS Amplify)
1. Deploy the root directory.
2. Set the Framework Preset to **Vite**.
3. Add a New Environment Variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://api.yourdomain.com/api` (Replace with your actual backend URL)
4. Deploy! The frontend will automatically route all requests to your production backend.
