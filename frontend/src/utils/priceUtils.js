/**
 * Extract discount amount from coupon text
 * Examples:
 * - "Apply ₹299 coupon" -> { type: 'fixed', amount: 299 }
 * - "Apply 2% coupon" -> { type: 'percentage', amount: 2 }
 * - "Apply ₹299 coupon Terms" -> { type: 'fixed', amount: 299 }
 */
export function extractCouponDiscount(couponText) {
  if (!couponText) return null;

  const text = couponText.trim();

  // Try to extract fixed amount (₹299, ₹50, etc.)
  const fixedMatch = text.match(/₹\s*([\d,]+)/);
  if (fixedMatch) {
    const amount = parseFloat(fixedMatch[1].replace(/,/g, ''));
    if (!isNaN(amount)) {
      return { type: 'fixed', amount };
    }
  }

  // Try to extract percentage (2%, 5%, 10%, etc.)
  const percentMatch = text.match(/([\d.]+)\s*%/);
  if (percentMatch) {
    const percentage = parseFloat(percentMatch[1]);
    if (!isNaN(percentage)) {
      return { type: 'percentage', amount: percentage };
    }
  }

  return null;
}

/**
 * Calculate price after applying coupon discount
 * @param {string} priceStr - Price string like "₹1,299" or "₹1299"
 * @param {Object} discount - Discount object from extractCouponDiscount
 * @returns {string} - Price after discount formatted as "₹1,000"
 */
export function calculatePriceAfterCoupon(priceStr, discount) {
  if (!priceStr || !discount) return null;

  // Extract numeric value from price string
  const priceValue = parseFloat(priceStr.replace(/[₹,\s]/g, ''));
  if (isNaN(priceValue)) return null;

  let discountedPrice;

  if (discount.type === 'fixed') {
    // Fixed amount discount
    discountedPrice = priceValue - discount.amount;
  } else if (discount.type === 'percentage') {
    // Percentage discount
    discountedPrice = priceValue * (1 - discount.amount / 100);
  } else {
    return null;
  }

  // Ensure price doesn't go negative
  if (discountedPrice < 0) discountedPrice = 0;

  // Format back to currency string
  return `₹${Math.round(discountedPrice).toLocaleString('en-IN')}`;
}

/**
 * Get price after coupon for a product entry
 * @param {Object} historyEntry - History entry with price and coupon info
 * @returns {string|null} - Price after coupon or null
 */
export function getPriceAfterCoupon(historyEntry) {
  if (!historyEntry) return null;
  
  const hasCoupon = typeof historyEntry.couponAvailable === 'boolean' 
    ? historyEntry.couponAvailable 
    : false;

  if (!hasCoupon || !historyEntry.couponText) return null;

  const discount = extractCouponDiscount(historyEntry.couponText);
  if (!discount) return null;

  return calculatePriceAfterCoupon(historyEntry.price, discount);
}

