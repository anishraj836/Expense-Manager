# Expense Manager

A highly scalable, cryptographically secure web application for tracking shared expenses with friends and groups. It features a modern, glassmorphic UI, Google OAuth 2.0 security, and an immutable backend ledger that detects unauthorized database modifications.

## 🚀 Features
- **Advanced Expense Splitting**: Supports splitting bills equally, by exact amounts, or by percentages.
- **Multiple Payers**: Allows multiple people to pay for portions of a single bill.
- **Groups**: Create groups (e.g., "Paris Trip", "Apartment") to easily segment expenses and members.
- **Progressive Web App (PWA)**: Installable natively on iOS and Android devices for a full-screen app experience.
- **High Security Authentication**: Strictly enforces logins via Google OAuth 2.0.
- **Real-Time Dashboards**: Instantly calculates who you owe and who owes you.
- **Cryptographic Security**: Uses an append-only Hash-Chain Ledger (similar to Blockchain). The frontend locally verifies the `SHA-256` hash of every transaction to ensure no admin has tampered with the MongoDB database.
- **Enterprise Web Firewall**: Enforces strict DDoS Rate Limiting, NoSQL Injection prevention, and XSS payload sanitization using Helmet.js and Express Rate Limit.
- **Highly Scalable**: Integrates Redis caching to instantly serve global balances and supports UI pagination for massive transaction histories.

## 🛠 Tech Stack
- **Frontend**: React (TypeScript), Vite, Vanilla CSS, Lucide Icons, Crypto-JS.
- **Backend**: Node.js, Express.js, Google Auth Library.
- **Databases**: MongoDB (Atlas) for persistent storage, Redis for high-speed caching.

---

## 💻 Running Locally

### 1. Setup Environment Variables
Create a `.env` file in the root directory:
```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Create a `.env` file in the `backend/` folder:
```env
MONGODB_URI=your_mongodb_atlas_uri
REDIS_URI=your_redis_uri
JWT_SECRET=your_super_secret_jwt_key
PORT=3000
```

### 2. Start the App
To run the full stack locally for development:
```bash
npm install
npm run dev
```
*(This will start the Vite frontend on port 5173)*

To run the backend server:
```bash
cd backend
npm install
node server.js
```

---

## 🌍 Deployment Guide (Render)

This application is configured to be deployed as a **Unified Full-Stack Web Service** on Render.

1. Create a new **Web Service** on Render and link your GitHub repository.
2. Set the Environment to **Node**.
3. Set the **Build Command** to: 
   ```bash
   npm install --include=dev && npm run build && cd backend && npm install
   ```
4. Set the **Start Command** to:
   ```bash
   cd backend && node server.js
   ```
5. Add your Environment Variables (`MONGODB_URI`, `REDIS_URI`, `JWT_SECRET`, `VITE_GOOGLE_CLIENT_ID`, etc.).
6. Deploy! The Node.js backend will securely serve both the API and the compiled Vite frontend from the same URL.

---

## 📄 License & Copyright

**© 2026 Expense Manager. All Rights Reserved.**
This repository and its contents are closed-source. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.
