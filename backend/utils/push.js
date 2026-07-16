const pool = require('../db');
const path = require('path');

// The service account key is a real secret - kept only on the server
// filesystem (matching how backend/.env itself is handled), never in git.
let firebaseApp = null;
function ensureFirebase() {
  if (firebaseApp) return firebaseApp;
  const admin = require('firebase-admin');
  const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));
  firebaseApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return firebaseApp;
}

let fcmColumnEnsured = false;
async function ensureFcmColumn() {
  if (fcmColumnEnsured) return;
  const [[col]] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'fcm_token'`
  );
  if (col.cnt === 0) {
    await pool.query("ALTER TABLE users ADD COLUMN fcm_token VARCHAR(255) NULL");
  }
  fcmColumnEnsured = true;
}

// Best-effort - a missing/invalid token or Firebase error should never break
// the caller's real action (assigning an order, completing ironing, etc).
async function sendPushToUser(userId, title, body, data = {}) {
  try {
    await ensureFcmColumn();
    const [[row]] = await pool.query('SELECT fcm_token FROM users WHERE id = ?', [userId]);
    if (!row?.fcm_token) return;
    const admin = require('firebase-admin');
    ensureFirebase();
    await admin.messaging().send({
      token: row.fcm_token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    });
  } catch (err) {
    console.error('sendPushToUser error:', err.message);
  }
}

module.exports = { ensureFcmColumn, sendPushToUser };
