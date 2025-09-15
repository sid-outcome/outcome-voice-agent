/**
 * SMS Tool Executor
 * Extracted and simplified from server.js lines 3469-4239
 */

class SMSToolExecutor {
  constructor(
    outcomeClient,
    attomClient,
    rentcastClient,
    tavilyClient,
    queryOptimizer,
    smartPropertySearch,
    semanticSearch,
    conversationMemory
  ) {
    this.outcomeClient = outcomeClient;
    this.attomClient = attomClient;
    this.rentcastClient = rentcastClient;
    this.tavilyClient = tavilyClient;
    this.queryOptimizer = queryOptimizer;
    this.smartPropertySearch = smartPropertySearch;
    this.semanticSearch = semanticSearch;
    this.conversationMemory = conversationMemory;
    this.currentUserSession = null;
  }

  setCurrentUserSession(session) {
    this.currentUserSession = session;
  }

  async execute(toolName, parameters, userContext = null) {
    console.log(`🔧 Executing SMS tool: ${toolName}`);

    switch (toolName) {
      case 'lookup_outcome_user_sms':
        return await this.handleUserLookup(parameters);

      case 'smart_data_query_sms':
        return await this.handleSmartDataQuery(parameters, userContext);

      case 'get_user_outcomes_sms':
        return await this.handleGetUserOutcomes(parameters, userContext);

      case 'get_data_tables_sms':
        return await this.handleGetDataTables(parameters, userContext);

      case 'get_table_data_sms':
        return await this.handleGetTableData(parameters, userContext);

      case 'get_chat_history_sms':
        return await this.handleGetChatHistory(parameters, userContext);

      case 'attom_property_detail_sms':
        return await this.handleAttomPropertyDetail(parameters);

      case 'attom_assessment_sms':
        return await this.handleAttomAssessment(parameters);

      case 'attom_avm_sms':
        return await this.handleAttomAVM(parameters);

      case 'attom_sales_history_sms':
        return await this.handleAttomSalesHistory(parameters);

      case 'attom_market_trends_sms':
        return await this.handleAttomMarketTrends(parameters);

      case 'smart_property_search_sms':
        return await this.handleSmartPropertySearch(parameters);

      case 'rentcast_property_details_sms':
        return await this.handleRentcastPropertyDetails(parameters);

      case 'rentcast_rent_estimate_sms':
        return await this.handleRentcastRentEstimate(parameters);

      case 'web_search_sms':
        return await this.handleWebSearch(parameters);

      default:
        return {
          error: `Unknown tool: ${toolName}`,
          message: 'The requested tool is not available.',
        };
    }
  }

  async handleUserLookup(parameters) {
    try {
      console.log(`👤 Looking up user by phone: ${parameters.phoneNumber}`);
      const user = await this.outcomeClient.lookupUserByPhone(
        parameters.phoneNumber
      );

      if (user) {
        // Update the current user session
        this.currentUserSession = {
          phoneNumber: parameters.phoneNumber,
          userId: user.userId,
          organizationId: user.organizationId,
          identified: true,
          userName: user.name,
        };

        return {
          success: true,
          userId: user.userId,
          organizationId: user.organizationId,
          name: user.name,
          message: 'User successfully identified',
        };
      } else {
        return {
          success: false,
          message: 'No user found for this phone number',
        };
      }
    } catch (error) {
      console.error('❌ User lookup error:', error);
      return {
        error: 'Failed to lookup user. Please try again.',
      };
    }
  }

  async handleSmartDataQuery(parameters, userContext) {
    if (!userContext) {
      return {
        error: 'Please identify yourself first by providing your phone number.',
      };
    }

    try {
      console.log(`🧠 Smart data query: ${parameters.query || 'undefined - will use fallback'}`);

      // Get the actual user message from conversation history if query is missing
      let contextQuery = 'SMS business data query';
      if (!parameters.query && userContext.phoneNumber && this.conversationMemory) {
        try {
          const history = this.conversationMemory.getConversationHistory(
            userContext.phoneNumber,
            5
          );
          const lastUserMessage = history
            .filter(msg => msg.role === 'user')
            .pop();
          if (lastUserMessage && lastUserMessage.content) {
            contextQuery = lastUserMessage.content;
            console.log(`📝 Using user message as context: "${contextQuery}"`);
          }
        } catch (error) {
          console.error('❌ Error accessing conversation memory:', error);
          contextQuery = 'show me my business data and performance metrics';
        }
      } else if (!parameters.query) {
        console.log('⚠️ No query parameter and conversation memory not available, using default');
        contextQuery = 'show me my business data and performance metrics';
      }

      // Optimize the query using LLM
      const optimizedQuery = await this.queryOptimizer.generateOutcomeQuery(
        parameters.query,
        contextQuery
      );
      console.log(`🤖 LLM optimized query: "${optimizedQuery}"`);

      // Get user outcomes
      const outcomesResponse = await this.outcomeClient.getUserOutcomes(
        userContext.userId,
        userContext.organizationId
      );

      if (outcomesResponse.error) {
        return { error: `Failed to get outcomes: ${outcomesResponse.error}` };
      }

      // Process outcomes data
      let outcomes = this.extractOutcomesFromResponse(outcomesResponse);

      if (outcomes.length === 0) {
        return {
          success: true,
          data: "No outcomes found in your workspace. You don't have any project data yet.",
        };
      }

      // Log available outcomes for debugging
      console.log(`📂 Available outcomes (${outcomes.length}):`);
      outcomes.forEach((outcome, index) => {
        console.log(
          `  ${index + 1}. "${outcome.title || outcome.name}" (ID: ${
            outcome.id
          })`
        );
      });

      // Step 2: Use semantic search to find the most relevant outcome
      console.log(`🧠 Using semantic similarity to select best outcome...`);
      let selectedOutcome;

      // Use semantic search to find the most relevant outcome
      if (!selectedOutcome) {
        try {
          const similarityResult =
            await this.semanticSearch.findMostSimilarOutcome(
              optimizedQuery,
              outcomes
            );

          if (similarityResult && similarityResult.outcome) {
            selectedOutcome = similarityResult.outcome;
            const similarity =
              similarityResult.similarity || similarityResult.confidence || 0;
            console.log(
              `✅ Semantic selection (${
                similarityResult.confidence || 'high'
              }): "${selectedOutcome.title}" (${
                typeof similarity === 'number'
                  ? similarity.toFixed(3)
                  : similarity
              })`
            );

          } else {
            selectedOutcome = outcomes[0];
            console.log(`🔄 Using first outcome: "${selectedOutcome.title}"`);
          }
        } catch (error) {
          console.error(
            '❌ Semantic similarity failed, using fallback:',
            error
          );
          selectedOutcome = outcomes[0];
          console.log(
            `🔄 Fallback to first outcome: "${selectedOutcome.title}"`
          );
        }
      }

      console.log(
        `🎯 Final selected outcome: ${selectedOutcome.id} (${selectedOutcome.title})`
      );

      // Step 3: Get data tables for the selected outcome
      const tablesResponse = await this.outcomeClient.getDataTables(
        userContext.userId,
        userContext.organizationId,
        selectedOutcome.id
      );

      if (tablesResponse.error) {
        return {
          error: `Failed to get data tables: ${tablesResponse.error}`,
        };
      }

      let tables = [];
      if (tablesResponse.data?.dataTables) {
        tables = tablesResponse.data.dataTables;
      } else if (tablesResponse.tables) {
        tables = tablesResponse.tables;
      } else if (tablesResponse.data && Array.isArray(tablesResponse.data)) {
        tables = tablesResponse.data;
      } else if (Array.isArray(tablesResponse)) {
        tables = tablesResponse;
      }

      console.log(`✅ Found ${tables.length} data tables`);

      if (tables.length === 0) {
        return {
          success: true,
          outcome: selectedOutcome.title,
          outcomeId: selectedOutcome.id,
          data: `The outcome "${selectedOutcome.title}" doesn't have any data tables yet.`,
        };
      }

      // Step 4: CRITICAL FIX - Actually fetch the table data!
      console.log(`📊 Fetching actual data from tables...`);
      let allRecords = [];

      // Fetch data from first 2-3 tables
      for (const table of tables.slice(0, 3)) {
        try {
          console.log(`📋 Fetching data from table: ${table.id}`);
          const tableDataResponse = await this.outcomeClient.getTableData(
            userContext.userId,
            userContext.organizationId,
            table.id,
            100,
            0
          );

          if (tableDataResponse.data) {
            const tableData =
              tableDataResponse.data.data || tableDataResponse.data || [];
            console.log(
              `✅ Retrieved ${tableData.length} records from ${
                table.displayTableName || table.name
              }`
            );

            if (tableData.length > 0) {
              allRecords.push({
                tableId: table.id,
                tableName: table.displayTableName || table.name || table.id,
                records: tableData,
                recordCount: tableData.length,
              });

              // Let the LLM interpret the data based on context
              // No hardcoded domain assumptions
            }
          }
        } catch (error) {
          console.error(`❌ Error fetching table ${table.id}:`, error);
        }
      }

      // Step 5: Format the response with actual data
      console.log(`📋 Gathered data from ${allRecords.length} tables`);

      if (allRecords.length === 0) {
        return {
          success: true,
          outcome: selectedOutcome.title,
          outcomeId: selectedOutcome.id,
          tables: tables.map(t => ({
            id: t.id,
            name: t.displayTableName || t.name,
          })),
          data: `Found ${tables.length} tables but no data records.`,
        };
      }

      // Create response with actual data
      let response = {
        success: true,
        outcome: selectedOutcome.title,
        outcomeId: selectedOutcome.id,
        tables: tables.map(t => ({
          id: t.id,
          name: t.displayTableName || t.name,
        })),
        data: this.formatDataSummary(allRecords, selectedOutcome.title),
        // Include the full raw data so the LLM can analyze all fields
        fullData: allRecords,
      };

      return response;
    } catch (error) {
      console.error('❌ Smart data query error:', error);
      return {
        error: 'Failed to process data query. Please try again.',
      };
    }
  }

  async handleGetUserOutcomes(parameters, userContext) {
    if (!userContext) {
      return { error: 'User context required' };
    }

    try {
      const response = await this.outcomeClient.getUserOutcomes(
        userContext.userId,
        userContext.organizationId
      );
      return response;
    } catch (error) {
      console.error('❌ Get user outcomes error:', error);
      return { error: 'Failed to get outcomes' };
    }
  }

  async handleGetDataTables(parameters, userContext) {
    if (!userContext) {
      return { error: 'User context required' };
    }

    try {
      const response = await this.outcomeClient.getDataTables(
        userContext.userId,
        userContext.organizationId,
        parameters.outcomeId
      );
      return response;
    } catch (error) {
      console.error('❌ Get data tables error:', error);
      return { error: 'Failed to get data tables' };
    }
  }

  async handleGetTableData(parameters, userContext) {
    if (!userContext) {
      return { error: 'User context required' };
    }

    try {
      const response = await this.outcomeClient.getTableData(
        userContext.userId,
        userContext.organizationId,
        parameters.tableId,
        parameters.limit,
        parameters.offset
      );
      return response;
    } catch (error) {
      console.error('❌ Get table data error:', error);
      return { error: 'Failed to get table data' };
    }
  }

  async handleGetChatHistory(parameters, userContext) {
    if (!userContext) {
      return { error: 'User context required' };
    }

    try {
      const response = await this.outcomeClient.getChatHistory(
        userContext.userId,
        userContext.organizationId,
        parameters.outcomeId
      );
      return response;
    } catch (error) {
      console.error('❌ Get chat history error:', error);
      return { error: 'Failed to get chat history' };
    }
  }

  async handleAttomPropertyDetail(parameters) {
    try {
      console.log(`🏢 ATTOM Property Detail via SMS: ${parameters.address}`);
      return await this.attomClient.getAttomPropertyDetail(parameters);
    } catch (error) {
      console.error('❌ ATTOM property detail error:', error);
      return { error: 'Failed to get property details' };
    }
  }

  async handleAttomAssessment(parameters) {
    try {
      return await this.attomClient.getAttomPropertyAssessment(parameters);
    } catch (error) {
      console.error('❌ ATTOM assessment error:', error);
      return { error: 'Failed to get property assessment' };
    }
  }

  async handleAttomAVM(parameters) {
    try {
      return await this.attomClient.getAttomAVM(parameters);
    } catch (error) {
      console.error('❌ ATTOM AVM error:', error);
      return { error: 'Failed to get property valuation' };
    }
  }

  async handleAttomSalesHistory(parameters) {
    try {
      return await this.attomClient.getAttomSalesHistory(parameters);
    } catch (error) {
      console.error('❌ ATTOM sales history error:', error);
      return { error: 'Failed to get sales history' };
    }
  }

  async handleAttomMarketTrends(parameters) {
    try {
      return await this.attomClient.getAttomMarketTrends(parameters);
    } catch (error) {
      console.error('❌ ATTOM market trends error:', error);
      return { error: 'Failed to get market trends' };
    }
  }

  async handleSmartPropertySearch(parameters) {
    try {
      console.log(`🔍 Smart Property Search via SMS: ${parameters.query}`);
      return await this.smartPropertySearch.executeSmartPropertySearch(
        parameters
      );
    } catch (error) {
      console.error('❌ Smart property search error:', error);
      return { error: 'Failed to search properties' };
    }
  }

  async handleRentcastPropertyDetails(parameters) {
    try {
      console.log(
        `🏠 RentCast Property Details via SMS: ${parameters.address}`
      );

      if (!this.rentcastClient.apiKey) {
        return await this.handleWebSearch({
          query: `${parameters.address} property details rental information`,
        });
      }

      return await this.rentcastClient.getPropertyDetails(parameters.address);
    } catch (error) {
      console.error('❌ RentCast property details error:', error);
      return { error: 'Failed to get rental property details' };
    }
  }

  async handleRentcastRentEstimate(parameters) {
    try {
      console.log(`💰 RentCast Rent Estimate via SMS: ${parameters.address}`);

      if (!this.rentcastClient.apiKey) {
        return await this.handleWebSearch({
          query: `${parameters.address} rent estimate rental price`,
        });
      }

      return await this.rentcastClient.getRentEstimate(parameters.address, {
        propertyType: parameters.propertyType,
        bedrooms: parameters.bedrooms,
        bathrooms: parameters.bathrooms,
        squareFeet: parameters.squareFeet,
      });
    } catch (error) {
      console.error('❌ RentCast rent estimate error:', error);
      return { error: 'Failed to get rent estimate' };
    }
  }

  async handleWebSearch(parameters) {
    try {
      // Check if query parameter exists
      if (!parameters.query) {
        console.log('⚠️ Web search called without query parameter, using fallback');
        // Try to extract from conversation history or provide helpful message
        return {
          error: 'Please specify what you would like me to search for',
          needsInput: true
        };
      }

      console.log(`🌐 Web Search via SMS: ${parameters.query}`);
      return await this.tavilyClient.searchWeb(parameters.query);
    } catch (error) {
      console.error('❌ Web search error:', error);
      return { error: 'Failed to search the web' };
    }
  }

  // Helper method to extract outcomes from various response formats
  extractOutcomesFromResponse(response) {
    let outcomes = [];

    if (
      response.data &&
      response.data.outcomes &&
      Array.isArray(response.data.outcomes)
    ) {
      outcomes = response.data.outcomes;
    } else if (Array.isArray(response.data)) {
      outcomes = response.data;
    } else if (response.outcomes && Array.isArray(response.outcomes)) {
      outcomes = response.outcomes;
    } else if (Array.isArray(response)) {
      outcomes = response;
    }

    return outcomes;
  }

  // Helper method to extract key fields from any record (generic, not domain-specific)
  extractKeyFields(record) {
    if (!record || typeof record !== 'object') return null;

    // Return all fields as-is, let the LLM interpret them
    // Skip only system fields like IDs and timestamps
    const keyFields = {};
    let hasData = false;

    for (const [field, value] of Object.entries(record)) {
      // Skip system fields
      if (field.endsWith('_id') || field.endsWith('_at') || field === 'id') {
        continue;
      }
      keyFields[field] = value;
      hasData = true;
    }

    return hasData ? keyFields : null;
  }

  // Helper method to format data summary (generic, works for any domain)
  formatDataSummary(allRecords, outcomeTitle) {
    // Generic data formatting for any type of data
    let summary = `Data from "${outcomeTitle}":\n\n`;

    for (const tableData of allRecords) {
      summary += `📊 ${tableData.tableName}: ${tableData.recordCount} records\n`;

      // Show sample records for any data type
      const recordsToShow = 3; // Show consistent number of records for all data types
      const sampleRecords = tableData.records.slice(0, recordsToShow);

      for (let i = 0; i < sampleRecords.length; i++) {
        const record = sampleRecords[i];

        // Get ALL fields except system fields
        const allFields = Object.entries(record).filter(
          ([key]) => !key.toLowerCase().includes('_id') && !key.includes('_at')
        );

        if (allFields.length > 0) {
          // Show key fields in compact format for all data types
          const keyFields = allFields.slice(0, 6); // Show up to 6 fields for any data type
          const fieldSummary = keyFields
            .map(([field, value]) => `${field}: ${value}`)
            .join(', ');
          summary += `  • ${fieldSummary}\n`;
        }
      }

      if (tableData.records.length > recordsToShow) {
        summary += `  ... and ${
          tableData.records.length - recordsToShow
        } more records\n`;
      }
      summary += '\n';
    }

    return summary;
  }

  // Generic formatting helper - formats value as-is
  formatValue(value) {
    // Simply return the value as-is, let the LLM interpret it
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}

export { SMSToolExecutor };
