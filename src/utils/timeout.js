/**
 * Timeout utility functions
 * Extracted from server.js line 6543-6557
 */

/**
 * Wrap a promise with a timeout to prevent hanging operations
 * @param {Promise} promise - The promise to wrap with timeout
 * @param {number} timeoutMs - Timeout in milliseconds (default: 3000)
 * @param {string} description - Description of the operation for error messages
 * @returns {Promise} - Promise that rejects if timeout is reached
 */
async function withTimeout(
  promise,
  timeoutMs = 3000,
  description = 'operation'
) {
  let timeoutId;
  let timeoutPromise;

  try {
    // Create the timeout promise with proper cleanup
    timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const error = new Error(`${description} timed out after ${timeoutMs}ms`);
        error.name = 'TimeoutError';
        reject(error);
      }, timeoutMs);
    });

    // Race the promises
    const result = await Promise.race([promise, timeoutPromise]);

    // Clear the timeout if the promise resolved first
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return result;
  } catch (error) {
    // Clear the timeout on error as well
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw error;
  } finally {
    // Ensure cleanup happens
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export { withTimeout };