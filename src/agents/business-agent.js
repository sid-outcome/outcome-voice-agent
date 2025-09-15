/**
 * Business Agent - Specialized for business data analysis
 * Extracted from server.js lines 1891-2349
 */
import { SubAgent } from './base-agent.js';

class BusinessAgent extends SubAgent {
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

    const fullInput = `${systemInstructions}\n\nConversation:\n${conversationInput}\n\nIMPORTANT: When you say you will do something (like "fetching comps", "getting data", "comparing properties"), you MUST actually call the appropriate tools to do it. Don't just say you'll do it - actually do it with tool calls. Provide text responses to explain what you're doing, but always follow through with the actual tool calls.\n\nCRITICAL: When calling smart_data_query_sms, you MUST ALWAYS pass the user's query as the 'query' parameter. NEVER call it with empty arguments {}. Extract the user's request and pass it. For example:\n- User says "tell me about property performance based on box score" → Call with {"query": "property performance based on box score"}\n- User says "show me my data" → Call with {"query": "show me my data"}\nALWAYS include the query parameter!`;

    // Debug: Check if tools are available
    console.log(`🔧 [${this.name}] Tools available:`, this.tools.length);
    if (this.tools.length > 0) {
      console.log(`🔧 [${this.name}] Tool names:`, this.tools.map(t => t.name));
      console.log(`🔧 [${this.name}] First tool structure:`, JSON.stringify(this.tools[0], null, 2));
    }

    // Map tools to GPT-5 Responses API format
    // API requires name at the top level based on error messages
    const mappedTools = this.tools.length > 0
      ? this.tools.map(tool => {
          // Ensure parameters are properly structured for GPT-5 Responses API
          const parameters = tool.parameters || {
            type: 'object',
            properties: {},
            required: []
          };

          const mapped = {
            name: tool.name,  // Name MUST be at top level for GPT-5 Responses API
            type: 'function',
            function: {
              description: tool.description,
              parameters: parameters,
            }
          };
          console.log(`🔧 [${this.name}] Mapped tool:`, JSON.stringify(mapped, null, 2));
          return mapped;
        })
      : undefined;

    // Log the complete request payload before sending
    const requestPayload = {
      model: this.model,
      input: fullInput,
      tools: mappedTools,
      reasoning: { effort: 'medium' }, // Medium reasoning for business analysis
      text: { verbosity: 'low' }, // Limit response length for SMS ('low', 'medium', 'high')
    };

    console.log(`🚀 [${this.name}] Full API request payload:`, JSON.stringify(requestPayload, null, 2));

    const response = await this.openai.responses.create(requestPayload);

    console.log(
      `🤖 [${this.name}] GPT-5 FULL Response:`,
      JSON.stringify(response, null, 2)
    );

    // Handle tool calls from Responses API - same logic as base agent
    return await this.handleToolCalls(response, fullInput, userContext, toolExecutor);
  }

  // Extract tool handling logic to shared method
  async handleToolCalls(response, fullInput, userContext, toolExecutor) {
    let currentResponse = response;
    let iterations = 0;
    const maxIterations = 10;
    let lastToolResult = null;
    const calledTools = new Set();
    let allToolResults = [];

    while (iterations < maxIterations) {
      iterations++;
      const functionCalls =
        currentResponse.output?.filter(item => item.type === 'function_call') ||
        [];

      if (functionCalls.length === 0) {
        break;
      }

      console.log(
        `🔧 [${this.name}] Processing ${functionCalls.length} function calls`
      );

      // Track if any tools were actually executed in this iteration
      let toolsExecutedThisIteration = false;

      for (const functionCall of functionCalls) {
        const { name, arguments: argsString } = functionCall;

        if (calledTools.has(name)) {
          console.log(
            `⚠️ [${this.name}] Skipping duplicate tool call: ${name}`
          );
          continue;
        }

        const args = JSON.parse(argsString);
        console.log(
          `🛠️ [${this.name}] Executing tool: ${name} with args:`,
          args
        );

        try {
          const toolResult = await toolExecutor(name, args, userContext);
          console.log(`✅ [${this.name}] Tool ${name} result:`, toolResult);

          calledTools.add(name);
          allToolResults.push({ tool: name, result: toolResult });
          lastToolResult = toolResult;
          toolsExecutedThisIteration = true;

          const toolResultsContext = allToolResults
            .map(tr => `Tool ${tr.tool} result: ${JSON.stringify(tr.result)}`)
            .join('\n\n');

          const shouldDisableTools =
            calledTools.has('smart_data_query_sms') ||
            calledTools.size >= 2 ||
            iterations >= 2;

          const toolResultInput = `${fullInput}\n\n${toolResultsContext}\n\n${
            shouldDisableTools
              ? 'CRITICAL: You have gathered the necessary data. Now provide a BRIEF SMS response (max 2-3 sentences) with the most important insights. Focus on the key finding that directly answers the user\'s question. Do NOT provide comprehensive analysis, multiple bullet points, or detailed breakdowns. Keep it extremely concise for SMS.'
              : 'Based on these results, either call another needed tool or provide a final response with the information gathered.'
          }`;

          currentResponse = await this.openai.responses.create({
            model: this.model,
            input: toolResultInput,
            tools: shouldDisableTools
              ? undefined
              : this.tools.length > 0
              ? this.tools.map(tool => ({
                  name: tool.name,  // Name MUST be at top level for GPT-5 Responses API
                  type: 'function',
                  function: {
                    description: tool.description,
                    parameters: tool.parameters || {
                      type: 'object',
                      properties: {},
                      required: []
                    },
                  }
                }))
              : undefined,
            reasoning: { effort: 'medium' },
            text: { verbosity: 'low' }, // Limit response length for SMS ('low', 'medium', 'high')
          });

          console.log(
            `🤖 [${this.name}] GPT-5 FULL Follow-up Response after tool call:`,
            JSON.stringify(currentResponse, null, 2)
          );

          break;
        } catch (error) {
          console.error(`❌ [${this.name}] Tool ${name} failed:`, error);
          return {
            content:
              'I apologize, but I encountered an error processing your request. Please try again.',
            tool_calls: null,
            role: 'assistant',
          };
        }
      }

      // If no tools were executed in this iteration (all were duplicates), break to avoid infinite loop
      if (!toolsExecutedThisIteration) {
        console.log(`⚠️ [${this.name}] No new tools executed, breaking loop`);
        break;
      }
    }

    // Extract final response
    let finalText = (currentResponse.output_text || '').trim();

    if (!finalText && Array.isArray(currentResponse.output)) {
      const parts = currentResponse.output
        .filter(i => i.type === 'message')
        .flatMap(m => (Array.isArray(m.content) ? m.content : []))
        .filter(p => p && (p.type === 'output_text' || p.type === 'text'))
        .map(p => p.text)
        .filter(Boolean);
      finalText = parts.join('\n').trim();
    }

    if (!finalText && lastToolResult) {
      if (typeof lastToolResult === 'string') {
        finalText = lastToolResult;
      } else if (lastToolResult.message) {
        finalText = lastToolResult.message;
      } else if (lastToolResult.data && typeof lastToolResult.data === 'string') {
        // If there's formatted data text, use that
        finalText = lastToolResult.data;
      } else if (lastToolResult.outcome) {
        // If we have outcome data, create a summary
        finalText = `I found data from your ${lastToolResult.outcome} outcome. `;
        if (lastToolResult.tables && lastToolResult.tables.length > 0) {
          finalText += `The data includes ${lastToolResult.tables.map(t => t.name).join(', ')}. `;
        }
        if (lastToolResult.data) {
          finalText += `\n\n${lastToolResult.data}`;
        } else {
          finalText += 'Please let me know what specific analysis you need.';
        }
      } else {
        // Generic fallback - never send raw JSON
        finalText = 'I successfully retrieved the data from your workspace. The query returned results, but I need more specific instructions on what analysis or insights you need from this data.';
      }
    }

    if (!finalText) {
      finalText =
        "I apologize, but I couldn't generate a response. Please try again.";
    }

    return {
      content: finalText,
      tool_calls: null,
      role: 'assistant',
    };
  }
}

export { BusinessAgent };