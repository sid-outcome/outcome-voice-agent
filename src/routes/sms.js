/**
 * SMS Route Handler
 * Extracted from server.js lines 7976-8084
 */

import crypto from 'crypto';
import { maskPhoneNumber, sanitizeMessage } from '../utils/pii-masking.js';

class SMSRoutes {
  constructor(conversationMemory, smsProcessor, config, twilioClient) {
    this.conversationMemory = conversationMemory;
    this.smsProcessor = smsProcessor;
    this.config = config;
    this.twilioClient = twilioClient;
  }

  // Register SMS routes with Fastify
  async register(fastify) {
    // SMS webhook endpoint for Twilio with security
    fastify.post('/sms', async (request, reply) => {
      console.log('📱 SMS webhook received');

      try {
        // SECURITY: Verify Twilio signature
        if (
          this.config.NODE_ENV === 'production' &&
          !this.verifyTwilioSignature(request)
        ) {
          console.log('❌ Invalid Twilio signature - rejecting request');
          return reply.code(403).send('Forbidden');
        }

        const { From, To, Body, MessageSid } = request.body || {};

        // Validate required fields
        if (!From || !Body) {
          console.log('❌ Missing required SMS fields');
          return reply.code(400).send({ error: 'Missing required fields: From and Body' });
        }

        // Fix phone number format - ensure it has the + prefix
        // When form data is URL-encoded, + becomes a space
        const fromNumber = From && From.startsWith('+') ? From : `+${(From || '').trim()}`;
        const toNumber = To && To.startsWith('+') ? To : `+${(To || '').trim()}`;

        // IDEMPOTENCY: Check if we've already processed this message
        const idempotencyKey = `sms:sid:${
          MessageSid || `${From}:${Body}:${Date.now()}`
        }`;
        if (this.conversationMemory.cache.get(idempotencyKey)) {
          console.log(
            `🔄 Duplicate SMS detected (${idempotencyKey}) - skipping processing`
          );
          const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;
          return reply.status(200).type('text/xml').send(twimlResponse);
        }

        // Mark this message as processed (10 minute TTL)
        this.conversationMemory.cache.set(idempotencyKey, true, 600);

        console.log(
          `📱 SMS received from ${maskPhoneNumber(fromNumber)}: "${Body.substring(0, 50)}${
            Body.length > 50 ? '...' : ''
          }"`
        );

        // Handle STOP/HELP keywords
        const bodyLower = Body.toLowerCase().trim();
        if (bodyLower === 'stop' || bodyLower === 'unsubscribe') {
          console.log(`📱 STOP request received from ${maskPhoneNumber(fromNumber)}`);
          // Add to opt-out list (NOTE: Using in-memory cache - will reset on restart)
          // In production, store in persistent database for compliance
          this.conversationMemory.cache.set(`opt_out:${fromNumber}`, true, 86400 * 365); // 1 year

          const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You have been unsubscribed from SMS. Reply START to re-subscribe.</Message>
</Response>`;
          return reply.status(200).type('text/xml').send(twimlResponse);
        }

        if (bodyLower === 'start' || bodyLower === 'subscribe') {
          console.log(`📱 START request received from ${maskPhoneNumber(fromNumber)}`);
          this.conversationMemory.cache.del(`opt_out:${fromNumber}`);

          const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Welcome! You're now subscribed to SMS updates. Send STOP to unsubscribe.</Message>
</Response>`;
          return reply.status(200).type('text/xml').send(twimlResponse);
        }

        if (bodyLower === 'help') {
          console.log(`📱 HELP request received from ${maskPhoneNumber(fromNumber)}`);
          const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Available commands: STOP (unsubscribe), START (subscribe), HELP (this message). Ask me about properties or your business data!</Message>
</Response>`;
          return reply.status(200).type('text/xml').send(twimlResponse);
        }

        // Check if user opted out
        if (this.conversationMemory.cache.get(`opt_out:${fromNumber}`)) {
          console.log(`📱 User ${maskPhoneNumber(fromNumber)} is opted out, ignoring message`);
          return reply
            .type('text/xml')
            .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        }

        // Process SMS asynchronously (don't make Twilio wait)
        setImmediate(() => {
          this.smsProcessor.process(
            fromNumber,
            toNumber,
            Body,
            this.twilioClient, // Pass the actual Twilio client
            this.config.TWILIO_PHONE_NUMBER
          ).catch(error => {
            console.error('❌ Async SMS processing error:', error);
          });
        });

        // Respond to Twilio immediately with empty TwiML
        const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;

        return reply.status(200).type('text/xml').send(twimlResponse);
      } catch (error) {
        console.error('❌ SMS webhook error:', error);
        reply.code(500).send('Internal server error');
      }
    });
  }

  // Verify Twilio signature for security
  verifyTwilioSignature(request) {
    try {
      const twilioSignature = request.headers['x-twilio-signature'];

      // Build the full URL (handle both http and https)
      const protocol = request.headers['x-forwarded-proto'] || 'http';
      const host = request.headers['x-forwarded-host'] || request.headers.host;
      const url = `${protocol}://${host}${request.url}`;

      const params = request.body || {};

      if (!twilioSignature || !this.config.TWILIO_AUTH_TOKEN) {
        console.log('⚠️ Missing Twilio signature or auth token');
        return false;
      }

      // Create signature following Twilio's exact format
      // Sort keys and concatenate key+value pairs
      const data = Object.keys(params)
        .sort()
        .reduce((acc, key) => acc + key + params[key], url);

      const expectedSignature = crypto
        .createHmac('sha1', this.config.TWILIO_AUTH_TOKEN)
        .update(Buffer.from(data, 'utf-8'))
        .digest('base64');

      // Compare signatures using timing-safe comparison
      // Note: Twilio signature does NOT include "sha1=" prefix
      return crypto.timingSafeEqual(
        Buffer.from(twilioSignature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('❌ Signature verification error:', error);
      return false;
    }
  }
}

export { SMSRoutes };