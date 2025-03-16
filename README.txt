Overview:
The Jeetscan Leaderboard backend (index.js) tracks Solana wallet trading activity, calculating hold times and classifying traders as "Jeet" (70%+ trades under 2 minutes), "Chad" (longer holds), or "Neutral" (1 or fewer trades). It fetches data from the Solana blockchain, stores it in MongoDB, and serves it via an API.

How It Works:
Technology
Node.js & Express: Runs the server and API.

Solana Web3.js: Fetches transaction data from Solana.

MongoDB Atlas: Stores wallet stats for quick access.

Functionality:
Wallet Tracking: Monitors a set list of Solana wallets.

Hold Times: Calculates trade durations (capped at 1 hour) by comparing token balances.

Classification: Assigns statuses based on quick trade ratios.

Daily Reset: Clears stats at midnight Eastern Time.

2-Minute Updates: Refreshes data every 2 minutes.

Setup and Running:
Prerequisites
Node.js (>=14.0.0)
npm

Technical Details:
Rate Limiting: Caps Solana requests at 10 per second.

Retry Logic: Retries failed requests up to 5 times.

Updates: Runs every 2 minutes and resets daily at 12:AM EST.

Limitations:
No profit/loss tracking yet.

Offial X: https://x.com/jeet_scan
Offial Website: https://jeetscan.xyz/

