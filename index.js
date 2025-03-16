// Jeetscan Leaderboard Backend
// This file powers the Jeetscan Leaderboard, tracking Solana wallet trading activity,
// calculating hold times, and classifying traders as Jeet, Chad, or Neutral.
// Sensitive data (API keys, database URIs) should be stored in environment variables
// and loaded via a .env file (not included in this public version).

const express = require('express');
const { Connection, PublicKey } = require('@solana/web3.js');
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file

const app = express();

// Configuration using environment variables
const solanaRpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'; // Placeholder; replace with your RPC URL
const mongoUri = process.env.MONGO_URI || 'mongodb+srv://username:password@cluster.mongodb.net/dbname'; // Placeholder; replace with your MongoDB URI
const client = new MongoClient(mongoUri);
let db;

// List of wallets to track (publicly shareable)
const walletsToTrack = [
  'DfMxre4cKmvogbLrPigxmibVTTQDuzjdXojWzjCXXhzj', 'JDd3hy3gQn2V982mi1zqhNqUw1GfV2UL6g76STojCJPN',
  'CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o', 'BCnqsPEtA1TkgednYEebRpkmwFRJDCjMQcKZMMtEdArc',
  '73LnJ7G9ffBDjEBGgJDdgvLUhD5APLonKrNiHsKDCw5B', 'BTf4A2exGK9BCVDNzy65b9dUzXgMqB4weVkvTMFQsadd',
  '7ABz8qEFZTHPkovMDsmQkm64DZWN5wRtU7LEtD2ShkQ6', 'F2SuErm4MviWJ2HzKXk2nuzBC6xe883CFWUDCPz6cyWm',
  'AJ6MGExeK7FXmeKkKPmALjcdXVStXYokYNv9uVfDRtvo', 'GJA1HEbxGnqBhBifH9uQauzXSB53to5rhDrzmKxhSU65',
  '8rvAsDKeAcEjEkiZMug9k8v1y8mW6gQQiMobd89Uy7qR', '2YJbcB9G8wePrpVBcT31o8JEed6L3abgyCjt5qkJMymV',
  '3pZ59YENxDAcjaKa3sahZJBcgER4rGYi4v6BpPurmsGj', 'BCagckXeMChUKrHEd6fKFA1uiWDtcmCXMsqaheLiUPJd',
  '2kv8X2a9bxnBM8NKLc6BBTX2z13GFNRL4oRotMUJRva9', '7iabBMwmSvS4CFPcjW2XYZY53bUCHzXjCFEFhxeYP4CY',
  '6LChaYRYtEYjLEHhzo4HdEmgNwu2aia8CM8VhR9wn6n7', '9yYya3F5EJoLnBNKW6z4bZvyQytMXzDcpU5D6yYr4jqL',
  '86AEJExyjeNNgcp7GrAvCXTDicf5aGWgoERbXFiG1EdD', '7tiRXPM4wwBMRMYzmywRAE6jveS3gDbNyxgRrEoU6RLA',
  '2CXbN6nuTTb4vCrtYM89SfQHMMKGPAW4mvFe6Ht4Yo6z'
];

// Wallet display names (publicly shareable)
const walletNames = {
  'DfMxre4cKmvogbLrPigxmibVTTQDuzjdXojWzjCXXhzj': 'Euris', 'JDd3hy3gQn2V982mi1zqhNqUw1GfV2UL6g76STojCJPN': 'West',
  'CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o': 'Cented', 'BCnqsPEtA1TkgednYEebRpkmwFRJDCjMQcKZMMtEdArc': 'Kreo',
  '73LnJ7G9ffBDjEBGgJDdgvLUhD5APLonKrNiHsKDCw5B': 'Waddles', 'BTf4A2exGK9BCVDNzy65b9dUzXgMqB4weVkvTMFQsadd': 'Kev',
  '7ABz8qEFZTHPkovMDsmQkm64DZWN5wRtU7LEtD2ShkQ6': 'Red', 'F2SuErm4MviWJ2HzKXk2nuzBC6xe883CFWUDCPz6cyWm': 'Earl',
  'AJ6MGExeK7FXmeKkKPmALjcdXVStXYokYNv9uVfDRtvo': 'Tim', 'GJA1HEbxGnqBhBifH9uQauzXSB53to5rhDrzmKxhSU65': 'Latuche',
  '8rvAsDKeAcEjEkiZMug9k8v1y8mW6gQQiMobd89Uy7qR': 'Casino', '2YJbcB9G8wePrpVBcT31o8JEed6L3abgyCjt5qkJMymV': 'Al4n',
  '3pZ59YENxDAcjaKa3sahZJBcgER4rGYi4v6BpPurmsGj': 'Kaden', 'BCagckXeMChUKrHEd6fKFA1uiWDtcmCXMsqaheLiUPJd': 'Dv',
  '2kv8X2a9bxnBM8NKLc6BBTX2z13GFNRL4oRotMUJRva9': 'Ghostee', '7iabBMwmSvS4CFPcjW2XYZY53bUCHzXjCFEFhxeYP4CY': 'Leens',
  '6LChaYRYtEYjLEHhzo4HdEmgNwu2aia8CM8VhR9wn6n7': 'Assasin.eth', '9yYya3F5EJoLnBNKW6z4bZvyQytMXzDcpU5D6yYr4jqL': 'Loopierr',
  '86AEJExyjeNNgcp7GrAvCXTDicf5aGWgoERbXFiG1EdD': 'Publix', '7tiRXPM4wwBMRMYzmywRAE6jveS3gDbNyxgRrEoU6RLA': 'Qtdegen',
  '2CXbN6nuTTb4vCrtYM89SfQHMMKGPAW4mvFe6Ht4Yo6z': 'MoneyMaykah'
};

// Constants
const REQUESTS_PER_SECOND = 10;
let requestTimestamps = [];

/**
 * Rate limits API requests to Solana to avoid hitting rate limits
 * @returns {Promise<void>}
 */
const rateLimit = async () => {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(ts => now - ts < 1000);
  if (requestTimestamps.length < REQUESTS_PER_SECOND) {
    requestTimestamps.push(now);
    return;
  }
  const delay = 1000 - (now - requestTimestamps[0]);
  await new Promise(resolve => setTimeout(resolve, delay));
  requestTimestamps.shift();
  requestTimestamps.push(now);
};

/**
 * Retries a function with exponential backoff in case of failures
 * @param {Function} fn - The function to retry
 * @param {number} maxRetries - Maximum retry attempts (default: 5)
 * @param {number} baseDelay - Initial delay in milliseconds (default: 500)
 * @returns {Promise<any>} - Result of the function
 */
const withRetry = async (fn, maxRetries = 5, baseDelay = 500) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await rateLimit();
      return await fn();
    } catch (error) {
      console.error(`Retry attempt ${i + 1}/${maxRetries} failed:`, error.message);
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 100;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Establishes a connection to the MongoDB database
 * @returns {Promise<boolean>} - Success status of the connection
 */
async function connectDB() {
  try {
    await client.connect();
    db = client.db('jeetscan');
    console.log('Connected to MongoDB Atlas');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}

/**
 * Gets the start of the current day in Eastern Daylight Time (EDT)
 * @returns {number} - Unix timestamp of the start of the day
 */
function getStartOfDayEDT() {
  const now = new Date();
  const edtString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const [datePart] = edtString.split(',');
  const [month, day, year] = datePart.split('/').map(Number);
  const startOfDayEDT = new Date(Date.UTC(year, month - 1, day, 4, 0, 0));
  const startTime = Math.floor(startOfDayEDT.getTime() / 1000);
  console.log(`System time: ${now.toLocaleString()} (local: ${Intl.DateTimeFormat().resolvedOptions().timeZone})`);
  console.log(`Fixed start of day EDT: ${startOfDayEDT.toLocaleString('en-US', { timeZone: 'America/New_York' })} (Unix: ${startTime})`);
  return startTime;
}

/**
 * Fetches transaction signatures for a given wallet since a timestamp
 * @param {string} wallet - The wallet public key
 * @param {number} sinceTimestamp - Unix timestamp to fetch transactions from
 * @returns {Promise<Array>} - Array of transaction signatures
 */
async function getTransactions(wallet, sinceTimestamp) {
  const publicKey = new PublicKey(wallet);
  const startTime = getStartOfDayEDT();
  
  try {
    console.log(`Fetching transactions for ${wallet} since ${new Date(sinceTimestamp * 1000).toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
    const signatures = await withRetry(() => 
      solanaConnection.getSignaturesForAddress(publicKey, { limit: 1000 })
    );
    console.log(`Total signatures fetched for ${wallet}: ${signatures.length}`);
    const validSignatures = signatures.filter(tx => tx.blockTime >= startTime && tx.blockTime > sinceTimestamp);
    console.log(`Fetched ${validSignatures.length} new signatures for ${wallet}`);
    if (wallet === 'BCagckXeMChUKrHEd6fKFA1uiWDtcmCXMsqaheLiUPJd') {
      console.log(`Dv new signatures:`, validSignatures.map(s => ({ sig: s.signature, time: new Date(s.blockTime * 1000).toLocaleString('en-US', { timeZone: 'America/New_York' }) })));
    }
    return validSignatures.sort((a, b) => a.blockTime - b.blockTime);
  } catch (error) {
    console.error(`Failed to fetch transactions for ${wallet}:`, error.message);
    return [];
  }
}

/**
 * Formats seconds into a readable time string
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time (e.g., "1m & 30s")
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return 'N/A';
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m & ${remainingSeconds}s`;
}

/**
 * Calculates hold times and trading status for a wallet
 * @param {string} wallet - The wallet public key
 * @param {boolean} isInitial - Whether this is an initial 
 * @returns {Promise<Object>} - Stats including avgHoldTime, tradeCount, etc.
 */
async function calculateHoldTime(wallet, isInitial = false) {
  const startTime = Date.now();
  console.log(`Calculating hold time for ${wallet} at ${new Date().toISOString()}`);
  try {
    await connectDB();
    const currentDateEST = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }).split(',')[0];
    const cached = await db.collection('wallet_daily_stats').findOne({ wallet, date: currentDateEST });
    let lastBlockTime = cached ? cached.lastBlockTime : null;
    let totalHoldTime = cached ? cached.totalHoldTime || 0 : 0;
    let tradeCount = cached ? cached.tradeCount || 0 : 0;
    let lastTimestamp = cached ? cached.lastTimestamp : null;
    let holdTimes = cached && cached.holdTimes ? cached.holdTimes : [];
    let processedSignatures = cached ? cached.processedSignatures || [] : [];
    let hasNewTrades = false;
    const sinceTimestamp = isInitial ? getStartOfDayEDT() : (cached ? cached.lastSweepTime || getStartOfDayEDT() : getStartOfDayEDT());

    const txSignatures = await getTransactions(wallet, sinceTimestamp);
    console.log(`Processing ${txSignatures.length} transactions for ${wallet}`);

    if (txSignatures.length === 0 && cached) {
      console.log(`No new txs for ${wallet}, using cached data`);
      return { avgHoldTime: cached.avgHoldTime, tradeCount: cached.tradeCount, holdTimes, hasNewTrades: false, signaturesFetched: 0, status: cached.status || 'Neutral' };
    }

    for (const tx of txSignatures) {
      if (processedSignatures.includes(tx.signature)) {
        console.log(`Skipping already processed trade for ${wallet}: Signature=${tx.signature}`);
        continue;
      }

      const txDetails = await withRetry(() => solanaConnection.getParsedTransaction(tx.signature, { maxSupportedTransactionVersion: 0 }));
      if (!txDetails || !txDetails.meta) continue;

      const timestamp = txDetails.blockTime * 1000;
      let wasTrade = false;
      if (txDetails.meta.preTokenBalances && txDetails.meta.postTokenBalances) {
        for (let i = 0; i < txDetails.meta.postTokenBalances.length; i++) {
          if (txDetails.meta.postTokenBalances[i].owner === wallet) {
            const pre = txDetails.meta.preTokenBalances.find(b => b.accountIndex === txDetails.meta.postTokenBalances[i].accountIndex) || { uiTokenAmount: { amount: '0' } };
            if (BigInt(txDetails.meta.postTokenBalances[i].uiTokenAmount.amount) !== BigInt(pre.uiTokenAmount.amount)) {
              wasTrade = true;
              console.log(`Trade detected in ${tx.signature}`);
              break;
            }
          }
        }
      }

      if (wasTrade) {
        tradeCount++;
        hasNewTrades = true;
        processedSignatures.push(tx.signature);
        if (tradeCount > 1 && lastTimestamp) {
          const holdTime = Math.min((timestamp - lastTimestamp) / 1000, 3600);
          holdTimes.push(holdTime);
          totalHoldTime += holdTime;
          console.log(`Hold time added: ${holdTime}s`);
        }
        lastTimestamp = timestamp;
        lastBlockTime = txDetails.blockTime;
      }
    }

    let avgHoldTime = 0;
    const quickTradeRatio = tradeCount > 1 ? holdTimes.filter(t => t < 120).length / holdTimes.length : 0;
    const status = tradeCount <= 1 ? 'Neutral' : quickTradeRatio >= 0.7 ? 'Jeet' : 'Chad';
    console.log(`Calculated status for ${wallet}: quickTradeRatio=${quickTradeRatio}, status=${status}`);

    if (tradeCount > 1) {
      if (status === 'Jeet') {
        const jeetHoldTimes = holdTimes.filter(t => t < 120);
        avgHoldTime = jeetHoldTimes.length > 0 ? jeetHoldTimes.reduce((sum, t) => sum + t, 0) / jeetHoldTimes.length : 0;
        console.log(`Jeet avgHoldTime for ${wallet}: ${avgHoldTime}s (based on ${jeetHoldTimes.length} trades < 120s)`);
      } else {
        avgHoldTime = totalHoldTime / (tradeCount - 1);
        console.log(`Chad/Neutral avgHoldTime for ${wallet}: ${avgHoldTime}s (based on all ${tradeCount - 1} hold times)`);
      }
    }

    await db.collection('wallet_daily_stats').updateOne(
      { wallet, date: currentDateEST },
      { $set: { avgHoldTime, tradeCount, totalHoldTime, lastTimestamp, lastBlockTime, holdTimes, processedSignatures, status, lastSweepTime: Math.floor(Date.now() / 1000), lastUpdated: new Date().toISOString() } },
      { upsert: true }
    );
    console.log(`Saved data for ${wallet} in ${(Date.now() - startTime) / 1000}s`);
    return { avgHoldTime, tradeCount, holdTimes, hasNewTrades, signaturesFetched: txSignatures.length, status };
  } catch (error) {
    console.error(`Error calculating hold time for ${wallet}:`, error.message);
    return { avgHoldTime: 0, tradeCount: 0, holdTimes: [], hasNewTrades: false, signaturesFetched: 0, status: 'Neutral' };
  }
}

/**
 * Updates hold time calculations for all tracked wallets
 * @param {boolean} isInitial - Whether this is an initial 
 * @returns {Promise<boolean>} - Indicates if new trades were found
 */
async function updateAllWallets(isInitial = false) {
  console.log(`Starting ${isInitial ? 'initial' : 'sweep'} wallet update cycle...`);
  let hasNewTrades = false;
  for (const wallet of walletsToTrack) {
    try {
      const result = await calculateHoldTime(wallet, isInitial);
      hasNewTrades = hasNewTrades || result.hasNewTrades;
    } catch (error) {
      console.error(`Failed to update ${wallet}:`, error.message);
    }
  }
  console.log(`Wallet update cycle completed. New trades: ${hasNewTrades}`);
  return hasNewTrades;
}

/**
 * Resets the database and performs an initial update
 * @returns {Promise<void>}
 */
async function resetAndUpdate() {
  const now = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  console.log(`Performing reset at ${now}`);
  await db.collection('wallet_daily_stats').deleteMany({});
  console.log('Database cleared');
  await updateAllWallets(true);
  console.log('Initial update completed');
}

/**
 * Schedules daily resets at midnight Eastern Time
 */
function scheduleDailyReset() {
  const now = new Date();
  const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const nextReset = new Date(estNow);
  nextReset.setHours(0, 0, 0, 0);
  if (estNow >= nextReset) nextReset.setDate(nextReset.getDate() + 1);

  const timeUntilReset = nextReset - estNow;
  console.log(`Next reset scheduled for ${nextReset.toLocaleString('en-US', { timeZone: 'America/New_York' })} (${(timeUntilReset / (1000 * 60 * 60)).toFixed(2)} hours from now)`);

  setTimeout(async () => {
    await resetAndUpdate();
    setInterval(async () => await resetAndUpdate(), 24 * 60 * 60 * 1000);
  }, timeUntilReset);
}

/**
 * Retrieves the latest leaderboard data from the database
 * @returns {Promise<Array>} - Array of wallet statistics
 */
async function getLatestLeaderboard() {
  const currentDateEST = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }).split(',')[0];
  let leaderboard = await db.collection('wallet_daily_stats').find({ date: currentDateEST }).toArray();
  
  if (leaderboard.length === 0) {
    console.log('No data for today, triggering initial update...');
    await updateAllWallets(true);
    leaderboard = await db.collection('wallet_daily_stats').find({ date: currentDateEST }).toArray();
  }
  
  if (leaderboard.length === 0) {
    console.log('Still no data, returning empty leaderboard');
    return walletsToTrack.map(wallet => ({ wallet, avgHoldTime: 0, tradeCount: 0, holdTimes: [], status: 'Neutral', lastUpdated: 'N/A' }));
  }
  return leaderboard;
}

// Middleware to serve static files (e.g., public directory)
app.use(express.static(path.join(__dirname, 'public')));

/**
 *
 * @route GET 
 * @returns {Object[]} - Array of wallet stats with formatted hold times
 */
app.get('', async (req, res) => {
  try {
    const leaderboard = await getLatestLeaderboard();
    res.json(leaderboard.map(entry => ({
      ...entry,
      avgHoldTimeFormatted: formatTime(entry.avgHoldTime)
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard', details: error.message });
  }
});

/**
 * 
 * @route GET 
 * @returns {Object} - Success message
 */
app.get('', async (req, res) => {
  try {
    await updateAllWallets(false);
    res.json({ message: 'Wallets updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update wallets', details: error.message });
  }
});

/**
 
 * @route GET 
 * @returns {Object} - Success message
 */
app.get('', async (req, res) => {
  try {
    await resetAndUpdate();
    res.json({ message: 'Reset and update completed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset', details: error.message });
  }
});

/**
 * Starts the application server
 */
async function start() {
  if (!await connectDB()) {
    console.error('Failed to start due to DB connection error');
    process.exit(1);
  }

  console.log('Clearing database to reset old data...');
  await db.collection('wallet_daily_stats').deleteMany({});
  console.log('Database cleared');

  console.log('Performing initial update...');
  await updateAllWallets(true);
  
  scheduleDailyReset();
  
  setInterval(async () => {
    console.log('Starting 2-minute sweep cycle...');
    await updateAllWallets(false);
  }, 120000);

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
}

start().catch(error => {
  console.error('Startup error:', error);
  process.exit(1);
});