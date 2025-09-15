/**
 * Base SubAgent Class
 * Extracted from server.js lines 1603-1829
 */
import OpenAI from 'openai';

class SubAgent {
  constructor(name, instructions, tools = [], model = 'gpt-5', openaiClient = null) {
    this.name = name;
    this.instructions = instructions;
    this.tools = tools;
    this.model = model;

    // Validate OpenAI client is provided
    if (!openaiClient) {
      throw new Error(`${name}: OpenAI client is required but was not provided`);
    }

    if (!openaiClient.responses || typeof openaiClient.responses.create !== 'function') {
      throw new Error(`${name}: Invalid OpenAI client - missing responses.create method`);
    }

    this.openai = openaiClient;
  }

  // Robust fallback parameter extraction when GPT-5 returns empty arguments
  extractFallbackParameters(toolName, userMessage) {
    const messageLower = userMessage.toLowerCase();
    
    switch (toolName) {
      case 'web_search_sms':
        // Smart query extraction using linguistic patterns
        let query = '';
        
        // Extract main topic (what they're asking about)
        const topicPatterns = [
          /(?:trends in|trends for|about|regarding|concerning)\s+(.+?)(?:\sin|\?|$)/i,
          /what(?:'s|'re)?\s+(?:the\s+)?(?:current\s+)?(.+?)(?:\sin|\?|$)/i,
          /(?:current|recent|latest)\s+(.+?)(?:\sin|\?|$)/i,
          /(.+?)\s+(?:trends|news|information|data|market)(?:\sin|\?|$)/i,
        ];
        
        for (const pattern of topicPatterns) {
          const match = userMessage.match(pattern);
          if (match && match[1]) {
            query = match[1].trim();
            break;
          }
        }
        
        // If no pattern matched, extract key nouns and adjectives
        if (!query) {
          const words = userMessage.toLowerCase().split(/\s+/);
          const keyWords = words.filter(word => 
            word.length > 3 && 
            !['what', 'are', 'the', 'current', 'about', 'can', 'you', 'tell', 'me', 'show', 'give', 'find'].includes(word)
          );
          query = keyWords.slice(0, 5).join(' '); // Take up to 5 key words
        }
        
        // Extract location if mentioned
        const locationPatterns = [
          /\bin\s+([A-Z][a-zA-Z\s]+?)(?:\s|,|\?|$)/,
          /([A-Z][a-zA-Z\s]+?)\s+(?:market|area|region|city)/i,
        ];
        
        let location = '';
        for (const pattern of locationPatterns) {
          const match = userMessage.match(pattern);
          if (match && match[1] && match[1].length > 2) {
            location = match[1].trim();
            break;
          }
        }
        
        // Build final query
        let finalQuery = query;
        if (location) {
          finalQuery += ` ${location}`;
        }
        
        // Add temporal context for trends/news
        if (messageLower.includes('current') || messageLower.includes('trends') || messageLower.includes('recent')) {
          finalQuery += ' 2025';
        }
        
        return finalQuery ? { query: finalQuery } : { query: 'current market information' };
        
      case 'smart_data_query_sms':
        // Extract business data query terms
        const businessTerms = [];
        const businessKeywords = ['performance', 'metrics', 'data', 'analysis', 'report', 'score', 'revenue', 'profit', 'sales', 'kpi'];
        
        for (const keyword of businessKeywords) {
          if (messageLower.includes(keyword)) {
            businessTerms.push(keyword);
          }
        }
        
        // Look for specific data types mentioned
        const dataTypeMatch = userMessage.match(/(?:my|our)\s+([a-zA-Z\s]+?)(?:\s+data|\s+metrics|\s+performance|$)/i);
        if (dataTypeMatch && dataTypeMatch[1]) {
          businessTerms.push(dataTypeMatch[1].trim());
        }
        
        const queryTerms = businessTerms.length > 0 ? businessTerms.join(' ') : 'workspace data';
        return { query: queryTerms };
        
      case 'smart_property_search_sms':
      case 'attom_property_search_sms':
      case 'rentcast_property_search_sms':
        // Try to extract specific address first
        const addressPatterns = [
          /\d+\s+[A-Za-z\s,]+?(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pl|place)/i,
          /(?:at|on|near)\s+([A-Za-z0-9\s,]+?)(?:\s|,|\?|$)/i,
        ];
        
        for (const pattern of addressPatterns) {
          const match = userMessage.match(pattern);
          if (match) {
            const address = match[0] || match[1];
            if (address && address.length > 5) {
              return { address: address.trim() };
            }
          }
        }
        
        // Fall back to location-based search
        const locationMatch = userMessage.match(/\b([A-Z][a-zA-Z\s]+?)(?:\s+(?:area|market|region|properties)|,|\?|$)/);
        if (locationMatch && locationMatch[1]) {
          return { address: locationMatch[1].trim() };
        }
        
        // Generic property search
        const propertyTerms = [];
        const propertyKeywords = ['commercial', 'office', 'retail', 'industrial', 'residential', 'apartment', 'condo', 'house'];
        
        for (const keyword of propertyKeywords) {
          if (messageLower.includes(keyword)) {
            propertyTerms.push(keyword);
          }
        }
        
        return propertyTerms.length > 0 
          ? { query: propertyTerms.join(' ') + ' properties' }
          : { query: 'property search' };
        
      default:
        // Generic fallback - extract meaningful words
        const words = userMessage.toLowerCase().split(/\s+/);
        const meaningfulWords = words.filter(word => 
          word.length > 3 && 
          !['what', 'are', 'the', 'can', 'you', 'tell', 'me', 'show', 'give', 'find', 'about'].includes(word)
        );
        
        return meaningfulWords.length > 0 
          ? { query: meaningfulWords.slice(0, 3).join(' ') }
          : {};
    }
  }

  async process(messages, userContext = null, toolExecutor = null) {
    // Combine system instructions with user context
    const systemInstructions = `${this.instructions}${
      userContext
        ? `\n\nUser Context: ${JSON.stringify(userContext, null, 2)}`
        : ''
    }`;

    // Convert messages array to single input string for responses API
    const conversationInput = messages
      .map(msg => {
        if (msg.role === 'user') return `User: ${msg.content}`;
        if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
        return msg.content;
      })
      .join('\n\n');

    const fullInput = `${systemInstructions}

📝 CONVERSATION CONTEXT:
${conversationInput}

🔧 TOOL EXECUTION REQUIREMENTS:
When you need information, you MUST call tools. Follow these EXACT steps:

1️⃣ ANALYZE USER REQUEST: Look at the user's message and identify what information they want
2️⃣ EXTRACT PARAMETERS: Pull specific terms from their message for tool parameters  
3️⃣ CALL APPROPRIATE TOOL: Use the extracted parameters to call the tool
4️⃣ ANALYZE RESULTS: Process the tool output and provide insights

🚨 MANDATORY TOOL CALLING INSTRUCTIONS:

When you call a tool, you MUST provide parameters. Here's how:

1️⃣ LOOK AT THE USER'S EXACT MESSAGE: "${messages[messages.length - 1]?.content || ''}"

2️⃣ FOR WEB SEARCH TOOLS:
   - Extract key terms from their question
   - Include location if mentioned  
   - Add current year (2025) for trends
   
3️⃣ EXAMPLE EXTRACTIONS:
   User asks: "current trends in commercial office rental in Chicago"
   → You must call: web_search_sms with query="commercial office rental trends Chicago 2025"
   
   User asks: "what's happening in real estate market"
   → You must call: web_search_sms with query="real estate market news trends 2025"

4️⃣ FOR PROPERTY TOOLS:
   User asks: "analyze 123 Main St"
   → You must call: property_search with address="123 Main St"

🔥 CRITICAL: GPT-5 has issues with empty parameters. Use this EXACT format:
- ALWAYS include the user's key terms in your tool calls
- NEVER call tools with empty {} - this fails every time
- If unclear, ask for clarification instead of calling tools

🎯 CURRENT USER QUERY ANALYSIS:
User said: "${messages[messages.length - 1]?.content || ''}"
Key terms to extract: [Identify the main concepts, location, and type of information needed]`;

    console.log(
      `🔧 [${this.name}] Processing with ${this.tools.length} tools available:`,
      this.tools.map(t => t.name)
    );

    // Debug: Check if tools have proper parameters
    if (this.tools.length > 0) {
      console.log(`🔍 [${this.name}] First tool structure:`, JSON.stringify(this.tools[0], null, 2));
    }

    // Create tools array with proper structure
    const toolsForAPI = this.tools.length > 0
      ? this.tools.map(tool => {
          // Log the original tool structure
          console.log(`🔍 [${this.name}] Original tool:`, JSON.stringify(tool, null, 2));

          const mappedTool = {
            name: tool.name,  // Name MUST be at top level for GPT-5 Responses API
            type: 'function',
            function: {
              description: tool.description,
              parameters: tool.parameters,
            }
          };

          // Log the mapped tool structure
          console.log(`📦 [${this.name}] Mapped tool for API:`, JSON.stringify(mappedTool, null, 2));

          return mappedTool;
        })
      : undefined;

    // Log the complete request payload
    const requestPayload = {
      model: this.model,
      input: fullInput,
      tools: toolsForAPI,
      reasoning: { effort: 'medium' }, // Better planning for complex requests
      text: { verbosity: 'low' }, // Limit response length for SMS ('low', 'medium', 'high')
    };

    console.log(`🚀 [${this.name}] Full API request payload:`, JSON.stringify(requestPayload, null, 2));

    const response = await this.openai.responses.create(requestPayload);

    console.log(
      `🤖 [${this.name}] GPT-5 FULL Response:`,
      JSON.stringify(response, null, 2)
    );

    // Handle tool calls from Responses API
    let currentResponse = response;
    let iterations = 0;
    const maxIterations = 10;
    let lastToolResult = null;
    const successfulTools = new Set(); // Track tools that executed successfully
    const failedAttempts = new Map(); // Track failed attempts per tool
    let allToolResults = []; // Store all results for context

    while (iterations < maxIterations) {
      iterations++; // INCREMENT to prevent infinite loop
      // Check if response contains function calls (GPT-5 Responses API format)
      const functionCalls =
        currentResponse.output?.filter(item => item.type === 'function_call') ||
        [];

      if (functionCalls.length === 0) {
        break; // No more function calls to process
      }

      console.log(
        `🔧 [${this.name}] Processing ${functionCalls.length} function calls`
      );

      // Track if any tools were actually executed in this iteration
      let toolsExecutedThisIteration = false;

      // Execute each function call
      for (const functionCall of functionCalls) {
        const { name, arguments: argsString } = functionCall;

        // Check if tool already executed successfully
        if (successfulTools.has(name)) {
          console.log(
            `✅ [${this.name}] Tool ${name} already executed successfully, skipping`
          );
          continue;
        }

        // Check if this tool has failed too many times (prevent infinite retries)
        const failedCount = failedAttempts.get(name) || 0;
        if (failedCount >= 2) {
          console.log(
            `❌ [${this.name}] Tool ${name} has failed ${failedCount} times, skipping further attempts`
          );
          continue;
        }

        // Parse JSON string to object with error handling
        let args;
        try {
          args = JSON.parse(argsString);
        } catch (parseError) {
          console.error(`❌ [${this.name}] Failed to parse tool arguments:`, parseError);
          failedAttempts.set(name, failedCount + 1);
          continue;
        }

        // Check for empty arguments and implement fallback extraction
        if (Object.keys(args).length === 0) {
          console.log(`⚠️ [${this.name}] Tool ${name} called with empty arguments, attempting fallback extraction`);
          
          // Get the user's original message for fallback extraction
          const userMessage = messages[messages.length - 1]?.content || '';
          
          // Fallback parameter extraction based on tool type and user message
          const fallbackArgs = this.extractFallbackParameters(name, userMessage);
          
          if (Object.keys(fallbackArgs).length > 0) {
            console.log(`✅ [${this.name}] Fallback extraction successful:`, fallbackArgs);
            args = fallbackArgs;
          } else {
            console.log(`❌ [${this.name}] Fallback extraction failed, marking as failed attempt`);
            failedAttempts.set(name, failedCount + 1);
            continue;
          }
        }
        console.log(
          `🛠️ [${this.name}] Executing tool: ${name} with args:`,
          args
        );

        try {
          const toolResult = await toolExecutor(name, args, userContext);
          console.log(`✅ [${this.name}] Tool ${name} result:`, toolResult);

          // Mark tool as successful and store result
          successfulTools.add(name);
          allToolResults.push({ tool: name, result: toolResult });
          lastToolResult = toolResult;
          toolsExecutedThisIteration = true;

          // Build context with all tool results
          const toolResultsContext = allToolResults
            .map(tr => `Tool ${tr.tool} result: ${JSON.stringify(tr.result)}`)
            .join('\n\n');

          // Decide whether to disable tools to prevent loops
          const shouldDisableTools =
            successfulTools.has('smart_data_query_sms') || // Got user data
            successfulTools.size >= 2 || // Called 2+ tools successfully
            iterations >= 3; // After 3 iterations

          const toolResultInput = `${fullInput}\n\n${toolResultsContext}\n\n${
            shouldDisableTools
              ? 'IMPORTANT: Analyze the data and provide a CONCISE SMS response (max 300 words). Focus on key insights and comparisons. Do NOT dump raw data. Summarize the performance metrics and any trends. You MUST generate text output.'
              : 'Based on these results, either call another needed tool or provide a final response with the information gathered.'
          }`;

          currentResponse = await this.openai.responses.create({
            model: this.model,
            input: toolResultInput,
            // Disable tools after key data is fetched to prevent loops
            tools: shouldDisableTools
              ? undefined
              : this.tools.length > 0
              ? this.tools.map(tool => ({
                  name: tool.name,  // Name MUST be at top level for GPT-5 Responses API
                  type: 'function',
                  function: {
                    description: tool.description,
                    parameters: tool.parameters,
                  }
                }))
              : undefined,
            reasoning: { effort: 'medium' }, // Better reasoning for follow-ups
            text: { verbosity: 'low' }, // Limit response length for SMS ('low', 'medium', 'high')
          });

          console.log(
            `🤖 [${this.name}] GPT-5 FULL Follow-up Response after tool call:`,
            JSON.stringify(currentResponse, null, 2)
          );

          break; // Process one tool call at a time
        } catch (error) {
          console.error(`❌ [${this.name}] Tool ${name} failed:`, error);
          // Mark as failed attempt, but don't exit entirely - allow retries
          failedAttempts.set(name, failedCount + 1);
          continue; // Try next tool call or continue with response generation
        }
      }

      // If no tools were executed in this iteration (all were duplicates), break to avoid infinite loop
      if (!toolsExecutedThisIteration) {
        console.log(`⚠️ [${this.name}] No new tools executed, breaking loop`);
        break;
      }
    }

    // Extract final text response with robust parsing
    let finalText = (currentResponse.output_text || '').trim();

    // Check for text in the output array
    if (!finalText && Array.isArray(currentResponse.output)) {
      const parts = currentResponse.output
        .filter(i => i.type === 'message')
        .flatMap(m => (Array.isArray(m.content) ? m.content : []))
        .filter(p => p && (p.type === 'output_text' || p.type === 'text'))
        .map(p => p.text)
        .filter(Boolean);
      finalText = parts.join('\n').trim();
    }

    // If still no text and we have tool results, create a summary from tool results
    if (!finalText && lastToolResult) {
      if (typeof lastToolResult === 'string' && lastToolResult.length < 500) {
        // Only use if it's a short summary, not raw data
        finalText = lastToolResult.substring(0, 500);
      } else if (lastToolResult.message && lastToolResult.message.length < 500) {
        finalText = lastToolResult.message;
      } else {
        // Never dump raw data - provide a summary message
        finalText = 'I found the data you requested. The analysis shows multiple records with varying performance metrics. Please be more specific about which aspects you\'d like me to analyze.';
      }
    }

    // Final fallback
    if (!finalText) {
      finalText =
        "I apologize, but I couldn't generate a response. Please try again.";
    }

    // Convert responses API format back to chat completions format for compatibility
    return {
      content: finalText,
      tool_calls: null,
      role: 'assistant',
    };
  }
}

export { SubAgent };