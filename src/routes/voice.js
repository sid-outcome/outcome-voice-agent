/**
 * Voice Route Handler for WebSocket connections
 * Extracted from server.js lines 8085-8243
 */

import crypto from 'crypto';
import { maskPhoneNumber } from '../utils/pii-masking.js';

class VoiceRoutes {
  constructor(config) {
    this.config = config;
    this.callerInfoStore = new Map();
  }

  // Register voice routes with Fastify
  async register(fastify) {
    // Twilio webhook route with phone number capture
    fastify.all('/incoming-call', async (request, reply) => {
      // SECURITY: Verify Twilio signature for production
      if (
        this.config.NODE_ENV === 'production' &&
        !this.verifyTwilioSignature(request)
      ) {
        console.log('❌ Invalid Twilio signature on voice webhook - rejecting request');
        return reply.code(403).send('Forbidden');
      }

      const { From: callerNumber } = request.body || {};

      if (callerNumber) {
        console.log(`📞 Incoming call from: ${maskPhoneNumber(callerNumber)}`);

        // Store caller info for the websocket connection
        const sessionId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        this.callerInfoStore.set(sessionId, {
          phoneNumber: callerNumber,
          timestamp: new Date().toISOString(),
        });

        console.log(`📞 Stored caller info for session: ${sessionId}`);

        // Clean up old sessions (older than 1 hour)
        for (const [key, value] of this.callerInfoStore.entries()) {
          if (Date.now() - new Date(value.timestamp).getTime() > 3600000) {
            this.callerInfoStore.delete(key);
          }
        }
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${request.headers.host}/media-stream">
      <Parameter name="sessionId" value="${sessionId || 'unknown'}" />
    </Stream>
  </Connect>
</Response>`;

      return reply.type('text/xml').send(twiml);
    });

    // WebSocket route for voice media stream
    if (fastify.websocketServer) {
      fastify.get('/media-stream', { websocket: true }, async (connection, request) => {
        console.log('🎙️ New WebSocket connection for voice');

        let sessionId = null;
        let callerInfo = null;

        connection.on('message', async (message) => {
          try {
            const data = JSON.parse(message.toString());

            if (data.event === 'start') {
              console.log('🎙️ Media stream started');
              sessionId = data.start?.customParameters?.sessionId || 'unknown';
              callerInfo = this.callerInfoStore.get(sessionId);

              if (callerInfo) {
                console.log(`📞 Retrieved caller info: ${callerInfo.phoneNumber}`);
              } else {
                console.log(`❓ No caller info found for session: ${sessionId}`);
              }

              // Initialize OpenAI Realtime session here
              // This would require the full realtime agent setup
              console.log('🤖 Would initialize OpenAI Realtime Agent here');
            }

            if (data.event === 'media') {
              // Handle audio data
              // This would be processed by the realtime agent
              // console.log('🎵 Received audio data');
            }

            if (data.event === 'stop') {
              console.log('🎙️ Media stream stopped');
              if (sessionId) {
                this.callerInfoStore.delete(sessionId);
              }
            }
          } catch (error) {
            console.error('❌ WebSocket message error:', error);
          }
        });

        connection.on('close', () => {
          console.log('🎙️ WebSocket connection closed');
          if (sessionId) {
            this.callerInfoStore.delete(sessionId);
          }
        });

        connection.on('error', (error) => {
          console.error('❌ WebSocket error:', error);
          if (sessionId) {
            this.callerInfoStore.delete(sessionId);
          }
        });
      });
    }
  }

  // Verify Twilio signature for security (same as SMS route)
  verifyTwilioSignature(request) {
    try {
      const twilioSignature = request.headers['x-twilio-signature'];

      // Build the full URL (handle both http and https)
      const protocol = request.headers['x-forwarded-proto'] || 'http';
      const host = request.headers['x-forwarded-host'] || request.headers.host;
      const url = `${protocol}://${host}${request.url}`;

      const params = request.body || {};

      if (!twilioSignature || !this.config.TWILIO_AUTH_TOKEN) {
        console.log('⚠️ Missing Twilio signature or auth token for voice webhook');
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
      console.error('❌ Voice signature verification error:', error);
      return false;
    }
  }
}

export { VoiceRoutes };