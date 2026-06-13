/**
 * Generate a unique order number: SI-YYYY-XXXXXXXX
 * Uses current timestamp suffix to avoid collisions.
 */
function generateOrderNumber() {
  const year    = new Date().getFullYear();
  const suffix  = Date.now().toString().slice(-8);
  return `SI-${year}-${suffix}`;
}

/**
 * Generate a random numeric OTP of given length.
 */
function generateOTP(length = 4) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

/**
 * Calculate total order amount from garments array and price map.
 * @param {Array}  garments  - [{ garment_type_id, quantity }]
 * @param {Object} priceMap  - { [garment_type_id]: price }
 */
function calculateTotal(garments, priceMap) {
  return garments.reduce((sum, item) => {
    const price = priceMap[item.garment_type_id] || 0;
    return sum + price * item.quantity;
  }, 0);
}

/**
 * Format a MySQL DATE string to readable DD/MM/YYYY.
 */
function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN');
}

module.exports = { generateOrderNumber, generateOTP, calculateTotal, formatDate };
