/**
 * Router Agent - Fast routing decisions
 * Extracted from server.js lines 1832-1888
 */
import { SubAgent } from './base-agent.js';

class RouterAgent extends SubAgent {
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

    // Get current and previous messages for context
    const userMessage = messages[messages.length - 1]?.content || '';
    const previousMessage = messages.length > 2 ? messages[messages.length - 3]?.content : '';
    
    const fullInput = `You are a routing agent. Output EXACTLY one word based on these rules:

Current message: "${userMessage}"
${previousMessage ? `Previous message: "${previousMessage}"` : ''}

ROUTING DECISION TREE:
1. Contains "my/our" or user's data (proforma, box score, lease) → BUSINESS_AGENT  
2. References previous query ("that", "it", "this", "the same", "on that") → USE CONTEXT
   - If previous was about user's data → BUSINESS_AGENT
   - If previous was about property WITH address → REAL_ESTATE_AGENT
   - If previous was about market/general → GENERAL_AGENT
3. Market trends, cap rates, averages, "in [city]" without address → GENERAL_AGENT
4. ONLY explicit addresses starting with numbers (123 Main St) → REAL_ESTATE_AGENT
5. Building/company/location names without street numbers → GENERAL_AGENT
6. Everything else → GENERAL_AGENT

EXAMPLES:
"my proforma" → BUSINESS_AGENT
"NOI on that" (after "my proforma") → BUSINESS_AGENT (context: user's data)
"IRR on that deal" (after proforma) → BUSINESS_AGENT (context: user's data)
"cap rates in Dallas" → GENERAL_AGENT (market research, no address)
"Apple Park Cupertino" → GENERAL_AGENT (no street number)
"123 Main St, Dallas TX" → REAL_ESTATE_AGENT (explicit address)
"what about the valuation" (after "123 Main St") → REAL_ESTATE_AGENT (context: property)
"market averages in Chicago" → GENERAL_AGENT (market data)

Your one-word response:`;

    console.log('🔍 Router input:', fullInput);

    // Using the simple format from the documentation with gpt-5-nano
    const response = await this.openai.responses.create({
      model: 'gpt-5-nano', // Use gpt-5-nano for fast routing
      input: fullInput,
      reasoning: { effort: 'low' }, // Fastest routing decisions
    });

    console.log('🤖 Router GPT-5 FULL response:', JSON.stringify(response, null, 2));

    // Extract final text response with robust parsing
    // First try the convenience property (SDK provides this)
    let finalText = (response.output_text || '').trim();
    console.log('📝 Router output_text:', finalText);

    // If not available, parse the output array according to GPT-5 format
    if (!finalText && Array.isArray(response.output)) {
      console.log('🔄 Parsing output array...');
      // GPT-5 format: output[].content[].text where type='output_text'
      for (const item of response.output) {
        console.log('  - Output item type:', item.type, 'role:', item.role);
        if (item.type === 'message' && item.role === 'assistant' && Array.isArray(item.content)) {
          for (const content of item.content) {
            console.log('    - Content type:', content.type, 'has text:', !!content.text);
            if (content.type === 'output_text' && content.text) {
              finalText = content.text.trim();
              console.log('    ✅ Found text:', finalText);
              break;
            }
          }
        }
        if (finalText) break;
      }
    }

    // RouterAgent doesn't execute tools, so no tool result fallback needed

    // Final fallback - return GENERAL_AGENT instead of error message
    if (!finalText) {
      console.log('⚠️ Router failed to extract response, defaulting to GENERAL_AGENT');
      console.log('Response structure:', {
        hasOutputText: !!response.output_text,
        hasOutput: !!response.output,
        outputLength: response.output?.length,
        keys: Object.keys(response)
      });
      finalText = "GENERAL_AGENT";
    }

    console.log('🎯 Router final decision:', finalText);

    // Convert responses API format back to chat completions format for compatibility
    return {
      content: finalText,
      tool_calls: null,
      role: 'assistant',
    };
  }
}

export { RouterAgent };
