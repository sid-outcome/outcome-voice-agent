/**
 * PII Masking Utilities
 * Provides functions to mask sensitive information in logs
 */

/**
 * Masks a phone number for logging purposes
 * @param {string} phoneNumber - The phone number to mask
 * @returns {string} - Masked phone number (e.g., +1234****890)
 */
export function maskPhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return 'INVALID_NUMBER';
  }

  // Remove any non-digit characters except the leading +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // If the number is too short, return masked version
  if (cleaned.length < 7) {
    return '***-****';
  }

  // Keep first 4 and last 3 digits visible
  const visibleStart = cleaned.substring(0, 4);
  const visibleEnd = cleaned.substring(cleaned.length - 3);
  const maskedMiddle = '*'.repeat(Math.min(cleaned.length - 7, 4));

  return `${visibleStart}${maskedMiddle}${visibleEnd}`;
}

/**
 * Masks email addresses for logging
 * @param {string} email - The email to mask
 * @returns {string} - Masked email (e.g., j***@example.com)
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return 'INVALID_EMAIL';
  }

  const [localPart, domain] = email.split('@');
  const visibleStart = localPart.substring(0, 1);
  const maskedLocal = visibleStart + '***';

  return `${maskedLocal}@${domain}`;
}

/**
 * Masks sensitive data in an object
 * @param {object} obj - Object potentially containing sensitive data
 * @param {string[]} sensitiveKeys - Keys to mask
 * @returns {object} - Object with masked sensitive values
 */
export function maskObject(obj, sensitiveKeys = ['phone', 'phoneNumber', 'From', 'To', 'email']) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const masked = { ...obj };

  for (const key in masked) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
      if (key.toLowerCase().includes('email')) {
        masked[key] = maskEmail(masked[key]);
      } else if (key.toLowerCase().includes('phone') || key === 'From' || key === 'To') {
        masked[key] = maskPhoneNumber(masked[key]);
      }
    }
  }

  return masked;
}

/**
 * Sanitizes a message string that may contain phone numbers
 * @param {string} message - The message to sanitize
 * @returns {string} - Message with phone numbers masked
 */
export function sanitizeMessage(message) {
  if (!message || typeof message !== 'string') {
    return message;
  }

  // Regex to match phone numbers in various formats
  const phoneRegex = /(\+?[1-9]\d{0,2}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

  return message.replace(phoneRegex, (match) => {
    return maskPhoneNumber(match);
  });
}