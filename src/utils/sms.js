/**
 * SMS utility functions
 * Extracted from server.js lines 3395-3466
 */

/**
 * Split long messages into chunks that fit SMS limits
 * @param {string} message - The message to chunk
 * @param {number} maxLength - Maximum length per chunk (default: 300)
 * @returns {Array<string>} - Array of message chunks with part numbers
 */
function chunkMessage(message, maxLength = 300) {
  if (message.length <= maxLength) {
    return [message];
  }

  const chunks = [];
  let remaining = message;

  while (remaining.length > 0) {
    let splitPoint = maxLength;

    if (remaining.length > maxLength) {
      // Find last space before max length
      const lastSpace = remaining.substring(0, maxLength).lastIndexOf(' ');
      if (lastSpace > 0) {
        splitPoint = lastSpace;
      }
    } else {
      splitPoint = remaining.length;
    }

    chunks.push(remaining.substring(0, splitPoint).trim());
    remaining = remaining.substring(splitPoint).trim();
  }

  // Add part numbers if multiple chunks
  if (chunks.length > 1) {
    return chunks.map((chunk, i) => `(${i + 1}/${chunks.length}) ${chunk}`);
  }

  return chunks;
}

/**
 * Send SMS message with automatic chunking
 * @param {Object} twilioClient - Initialized Twilio client
 * @param {string} to - Recipient phone number
 * @param {string} message - Message content
 * @param {string} fromNumber - Twilio phone number
 * @returns {Promise<void>}
 */
async function sendSMS(twilioClient, to, message, fromNumber) {
  if (!twilioClient) {
    console.log(`📱 Would send SMS to ${to}: ${message}`);
    return;
  }

  // Ensure message is not empty
  if (!message || message.trim() === '') {
    console.error('❌ Cannot send SMS: Message body is empty');
    message =
      'Sorry, I encountered an error generating a response. Please try again.';
  }

  // Log the SMS response before sending
  console.log(`📤 SMS Response: "${message}"`);

  try {
    const chunks = chunkMessage(message);

    for (let i = 0; i < chunks.length; i++) {
      await twilioClient.messages.create({
        body: chunks[i],
        from: fromNumber,
        to: to,
      });

      // Small delay between chunks to ensure proper ordering
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`📱 SMS sent to ${to}: ${chunks.length} part(s)`);
  } catch (error) {
    console.error('❌ SMS send error:', error);
    throw error;
  }
}

export { chunkMessage, sendSMS };