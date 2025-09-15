/**
 * SMS Message Processor
 * Extracted from server.js lines 4240-4360
 */

class SMSProcessor {
  constructor(
    conversationMemory,
    outcomeClient,
    agentFactory,
    toolExecutor,
    smsUtility
  ) {
    this.conversationMemory = conversationMemory;
    this.outcomeClient = outcomeClient;
    this.agentFactory = agentFactory;
    this.toolExecutor = toolExecutor;
    this.smsUtility = smsUtility;
    this.subAgents = null; // Will be initialized with agents
  }

  setAgents(agents) {
    this.subAgents = agents;
  }

  generateInterimMessage(messageBody, userContext) {
    // Simple, fast interim messages based on patterns - no LLM needed
    const messageLower = messageBody.toLowerCase();
    
    // Pattern-based messages for common query types
    if (messageLower.includes('my') || messageLower.includes('workspace')) {
      return '🔍 Accessing your workspace data. This usually takes 5-10 seconds.';
    }
    
    if (messageLower.includes('property') || messageLower.includes('address') || messageLower.includes('building')) {
      return '🔍 Looking up property information. This typically takes 5-10 seconds.';
    }
    
    if (messageLower.includes('trends') || messageLower.includes('market') || messageLower.includes('news')) {
      return '🔍 Researching current market information. This usually takes 10-15 seconds.';
    }
    
    if (messageLower.includes('data') || messageLower.includes('analysis') || messageLower.includes('report')) {
      return '🔍 Analyzing the requested data. This typically takes 5-15 seconds.';
    }
    
    // Default message for all other queries
    return '🔍 Processing your request. This typically takes 5-15 seconds.';
  }

  async process(
    fromNumber,
    toNumber,
    messageBody,
    twilioClient,
    fromPhoneNumber
  ) {
    console.log(
      `📱 Processing SMS message: "${messageBody.substring(0, 50)}${
        messageBody.length > 50 ? '...' : ''
      }"`
    );

    try {
      // Store incoming message
      this.conversationMemory.addMessage(fromNumber, 'user', messageBody);

      // Get user context (if available)
      let userContext = this.conversationMemory.getUserContext(fromNumber);

      // If no user context, try to look up user using the working Outcome API method
      if (!userContext) {
        console.log(`🔍 Looking up user context`);
        try {
          const user = await this.outcomeClient.lookupUserByPhone(fromNumber);
          if (user) {
            console.log(`👤 User context retrieved successfully`);
            userContext = {
              userId: user.userId,
              organizationId: user.organizationId,
              phoneNumber: fromNumber,
              identifiedAt: new Date().toISOString(),
              name: user.name,
              email: user.email,
            };
            this.conversationMemory.setUserContext(fromNumber, userContext);
            console.log(`✅ User identified: ${userContext.userId}`);
          } else {
            console.log(`❓ User not found for: ${fromNumber}`);
          }
        } catch (error) {
          console.error('User lookup error:', error.message);
        }
      }

      // Get conversation history
      const conversationHistory =
        this.conversationMemory.getConversationHistory(fromNumber, 10);

      // Step 1: Generate and send instant interim message (no LLM delay)
      const interimMessage = this.generateInterimMessage(
        messageBody,
        userContext
      );

      // Send interim message immediately
      console.log(`📤 Sending interim message: "${interimMessage}"`);
      await this.smsUtility.sendSMS(
        twilioClient,
        fromNumber,
        interimMessage,
        fromPhoneNumber
      );

      // Step 2: Route the message to appropriate specialist
      const routingMessages = [{ role: 'user', content: messageBody }];

      const routeResponse = await this.subAgents.router.process(
        routingMessages,
        userContext,
        (toolName, args, ctx) => this.toolExecutor.execute(toolName, args, ctx)
      );
      const specialist = routeResponse.content.trim();

      console.log(`🎯 Routing to specialist: ${specialist}`);

      // Step 3: Process with appropriate sub-agent
      // Map router output to agent keys
      const agentMap = {
        // Handle uppercase router responses
        'BUSINESS_AGENT': 'business',
        'REAL_ESTATE_AGENT': 'real_estate',
        'GENERAL_AGENT': 'general',
        // Handle lowercase underscore format
        business_agent: 'business',
        real_estate_agent: 'real_estate',
        general_agent: 'general',
        // Handle simplified names
        business: 'business',
        real_estate: 'real_estate',
        general: 'general',
      };

      const agentKey = agentMap[specialist] || 'general';
      const selectedAgent = this.subAgents[agentKey] || this.subAgents.general;

      // Prepare messages for specialist (include recent context)
      const specialistMessages = [
        ...conversationHistory.slice(-5).map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user', content: messageBody },
      ];

      const response = await selectedAgent.process(
        specialistMessages,
        userContext,
        (toolName, args, ctx) => this.toolExecutor.execute(toolName, args, ctx)
      );

      // Step 4: Handle tool calls if any (for backwards compatibility)
      let finalResponse = response.content;

      if (response.tool_calls && response.tool_calls.length > 0) {
        console.log(`🔧 Processing ${response.tool_calls.length} tool calls`);

        const toolResults = [];
        for (const toolCall of response.tool_calls) {
          const result = await this.toolExecutor.execute(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments),
            userContext
          );
          toolResults.push(result);
        }

        // Get final response with tool results
        const toolMessages = [
          ...specialistMessages,
          response,
          ...response.tool_calls.map((call, i) => ({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(toolResults[i]),
          })),
        ];

        const finalCompletion = await selectedAgent.process(
          toolMessages,
          userContext,
          (toolName, args, ctx) =>
            this.toolExecutor.execute(toolName, args, ctx)
        );
        finalResponse = finalCompletion.content;
      }

      // Step 5: Store assistant response and send final SMS
      this.conversationMemory.addMessage(
        fromNumber,
        'assistant',
        finalResponse,
        {
          specialist: specialist,
          userIdentified: !!userContext,
        }
      );

      await this.smsUtility.sendSMS(
        twilioClient,
        fromNumber,
        finalResponse,
        fromPhoneNumber
      );

      console.log(`✅ SMS processed successfully for ${fromNumber}`);
    } catch (error) {
      console.error('❌ SMS processing error:', error);
      await this.smsUtility.sendSMS(
        twilioClient,
        fromNumber,
        'Sorry, I encountered an error processing your message. Please try again.',
        fromPhoneNumber
      );
    }
  }
}

export { SMSProcessor };
