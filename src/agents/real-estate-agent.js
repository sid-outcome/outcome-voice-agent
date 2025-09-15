/**
 * Real Estate Agent - Specialized for property analysis
 * Extracted from server.js lines 2352-2568
 */
import { SubAgent } from './base-agent.js';

class RealEstateAgent extends SubAgent {
  async process(messages, userContext = null, toolExecutor = null) {
    // Use the same processing logic as BusinessAgent but with different model settings
    const systemInstructions = `${this.instructions}${
      userContext
        ? `\n\nUser Context: ${JSON.stringify(userContext, null, 2)}`
        : ''
    }`;

    const conversationInput = messages
      .map(msg => {
        if (msg.role === 'user') return `User: ${msg.content}`;
        if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
        return msg.content;
      })
      .join('\n\n');

    const fullInput = `${systemInstructions}\n\nConversation:\n${conversationInput}\n\nIMPORTANT: When you say you will do something (like "fetching comps", "getting data", "comparing properties"), you MUST actually call the appropriate tools to do it. Don't just say you'll do it - actually do it with tool calls. Provide text responses to explain what you're doing, but always follow through with the actual tool calls.`;

    const response = await this.openai.responses.create({
      model: this.model,
      input: fullInput,
      tools:
        this.tools.length > 0
          ? this.tools.map(tool => ({
              name: tool.name,  // Name MUST be at top level for GPT-5 Responses API
              type: 'function',
              function: {
                description: tool.description,
                parameters: tool.parameters,
              }
            }))
          : undefined,
      reasoning: { effort: 'medium' }, // Medium reasoning for property analysis
      text: { verbosity: 'low' }, // Limit response length for SMS ('low', 'medium', 'high')
    });

    console.log(
      `🤖 [${this.name}] GPT-5 FULL Response:`,
      JSON.stringify(response, null, 2)
    );

    // Handle tool calls - same logic as BusinessAgent
    return await this.handleToolCalls(response, fullInput, userContext, toolExecutor);
  }

  // Extract tool handling logic to shared method (same as BusinessAgent)
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

          const toolResultsContext = allToolResults
            .map(tr => `Tool ${tr.tool} result: ${JSON.stringify(tr.result)}`)
            .join('\n\n');

          const shouldDisableTools =
            calledTools.has('smart_property_search_sms') || // Property-specific stopping condition
            calledTools.size >= 2 ||
            iterations >= 2;

          const toolResultInput = `${fullInput}\n\n${toolResultsContext}\n\n${
            shouldDisableTools
              ? 'You have gathered the necessary property data. Now provide a comprehensive final response based on the property information. Do not call any more tools. Generate a complete text response summarizing all findings.'
              : 'Based on these results, either call another needed tool or provide a final response with the property information gathered.'
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
                    parameters: tool.parameters,
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
              'I apologize, but I encountered an error processing your property request. Please try again.',
            tool_calls: null,
            role: 'assistant',
          };
        }
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
      } else {
        finalText = 'I retrieved the property information successfully. Here are the details: ' + JSON.stringify(lastToolResult);
      }
    }

    if (!finalText) {
      finalText =
        "I apologize, but I couldn't generate a response about the property. Please try again.";
    }

    return {
      content: finalText,
      tool_calls: null,
      role: 'assistant',
    };
  }
}

export { RealEstateAgent };