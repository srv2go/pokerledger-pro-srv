/**
 * Currency/Points formatting utilities
 * Uses "points" instead of currency symbols for geo-neutral display
 */

/**
 * Format amount as points
 * @param {number} amount - The amount to format
 * @returns {string} Formatted points string (e.g., "1,000 points")
 */
export const formatPoints = (amount) => {
  if (amount == null || isNaN(amount)) return '0 points';
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  
  return `${formatted} points`;
};

/**
 * Format amount as XP (alternative to points)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted XP string (e.g., "1,000 XP")
 */
export const formatXP = (amount) => {
  if (amount == null || isNaN(amount)) return '0 XP';
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  
  return `${formatted} XP`;
};

/**
 * Format profit/loss with + or - indicator
 * @param {number} amount - The profit/loss amount
 * @returns {string} Formatted profit/loss (e.g., "+500 points" or "-200 points")
 */
export const formatProfitLoss = (amount) => {
  if (amount == null || isNaN(amount)) return '0 points';
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}${formatted} points`;
};

/**
 * Format numeric value only (no currency/points label)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted number (e.g., "1,000")
 */
export const formatNumber = (amount) => {
  if (amount == null || isNaN(amount)) return '0';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Legacy currency formatter (kept for backward compatibility)
 * @deprecated Use formatPoints instead
 */
export const formatCurrency = (amount) => {
  return formatPoints(amount);
};
