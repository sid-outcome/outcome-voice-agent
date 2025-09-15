/**
 * Tavily API Client - Web Search Service
 * Extracted from server.js lines 5991-6048
 */
import { withTimeout } from '../utils/timeout.js';

class TavilyAPIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  // Web search function using Tavily API
  async searchWeb(query) {
    if (!this.apiKey) {
      return {
        error: 'Web search is not available right now. Please contact support.',
      };
    }

    try {
      const response = await withTimeout(
        fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: query,
            max_results: 5,
            include_answer: true,
            include_images: false,
            search_depth: 'basic',
            topic: 'general',
          }),
        }),
        2500,
        `Tavily web search`
      );

      if (response.ok) {
        const data = await response.json();
        const results =
          data.results?.map(result => ({
            title: result.title,
            snippet: result.content,
            link: result.url,
            score: result.score,
          })) || [];

        console.log(
          `✅ Web search completed: ${results.length} results for "${query}"`
        );
        return {
          query: data.query,
          results: results,
          answer: data.answer,
          response_time: data.response_time,
        };
      }

      console.log(
        `❌ Web search failed: ${response.status} ${response.statusText}`
      );
      return { error: `Search failed: ${response.statusText}` };
    } catch (error) {
      console.error(`❌ Web search network error:`, error.message);
      return { error: "I couldn't search the web right now. Please try again." };
    }
  }
}

export { TavilyAPIClient };