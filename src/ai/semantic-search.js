/**
 * Semantic Search and Similarity Functions
 * Extracted from server.js lines 6344-6535
 */
import OpenAI from 'openai';
import NodeCache from 'node-cache';

// Initialize embeddings cache (5 minute TTL)
const embeddingsCache = new NodeCache({ stdTTL: 300 });

class SemanticSearch {
  constructor(openaiClient) {
    this.openai = openaiClient;
  }

  // Find most semantically similar outcome from a list
  async findMostSimilarOutcome(query, outcomes) {
    try {
      console.log(
        `🧠 Computing semantic similarity for ${outcomes.length} outcomes...`
      );

      // Prepare texts for embedding
      const queryText = query.toLowerCase();
      const outcomeTexts = outcomes.map(outcome => {
        const title = (outcome.title || outcome.name || '').toLowerCase();
        const description = (outcome.description || '').toLowerCase();
        return `${title} ${description}`.trim();
      });

      // Get embeddings for query and all outcomes with caching
      const allTexts = [queryText, ...outcomeTexts];

      // Check cache for existing embeddings
      let embeddings = [];
      const uncachedTexts = [];
      const uncachedIndexes = [];

      for (let i = 0; i < allTexts.length; i++) {
        const textHash = `embedding:${Buffer.from(allTexts[i]).toString(
          'base64'
        )}`;
        const cachedEmbedding = embeddingsCache.get(textHash);

        if (cachedEmbedding) {
          embeddings[i] = cachedEmbedding;
        } else {
          uncachedTexts.push(allTexts[i]);
          uncachedIndexes.push(i);
        }
      }

      // Fetch uncached embeddings
      if (uncachedTexts.length > 0) {
        console.log(
          `🧠 Fetching ${uncachedTexts.length} uncached embeddings (${
            allTexts.length - uncachedTexts.length
          } cached)`
        );

        const embeddingResponse = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: uncachedTexts,
          dimensions: 1536,
        });

        // Store new embeddings in cache and results array
        embeddingResponse.data.forEach((embeddingData, index) => {
          const originalIndex = uncachedIndexes[index];
          const textHash = `embedding:${Buffer.from(allTexts[originalIndex]).toString(
            'base64'
          )}`;

          embeddings[originalIndex] = embeddingData.embedding;
          embeddingsCache.set(textHash, embeddingData.embedding);
        });
      }

      // Calculate similarities using cosine similarity
      const queryEmbedding = embeddings[0];
      const outcomeEmbeddings = embeddings.slice(1);

      const similarities = outcomeEmbeddings.map((embedding, index) => ({
        index,
        similarity: this.cosineSimilarity(queryEmbedding, embedding),
        outcome: outcomes[index],
      }));

      // Sort by similarity (highest first)
      similarities.sort((a, b) => b.similarity - a.similarity);

      // Log all similarities for debugging
      console.log(`📊 Semantic similarity scores:`);
      similarities.forEach((item, index) => {
        const name = item.outcome.title || item.outcome.name || 'Unnamed';
        console.log(`  ${index + 1}. "${name}": ${item.similarity.toFixed(3)}`);
      });

      const bestMatch = similarities[0];
      const confidence = bestMatch.similarity;

      console.log(
        `✅ Best semantic match: "${bestMatch.outcome.title || bestMatch.outcome.name}" (confidence: ${confidence.toFixed(3)})`
      );

      return {
        outcome: bestMatch.outcome,
        confidence: confidence,
        allSimilarities: similarities,
      };
    } catch (error) {
      console.error('❌ Semantic similarity error:', error.message);
      return null;
    }
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Get embedding for a single text with caching
  async getEmbedding(text) {
    const textHash = `embedding:${Buffer.from(text.toLowerCase()).toString('base64')}`;
    let embedding = embeddingsCache.get(textHash);

    if (!embedding) {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 1536,
      });
      embedding = response.data[0].embedding;
      embeddingsCache.set(textHash, embedding);
    }

    return embedding;
  }

  // Clear embedding cache
  clearCache() {
    embeddingsCache.flushAll();
    console.log('🧠 Embeddings cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    return embeddingsCache.getStats();
  }
}

export { SemanticSearch, embeddingsCache };