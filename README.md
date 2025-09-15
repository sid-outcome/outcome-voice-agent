# Voice Agent - AI Business Assistant

An AI assistant that handles phone calls and SMS messages, integrating with your business data to provide intelligent responses about properties, projects, and market insights.

## Quick Start (5 minutes)

### Prerequisites

- Node.js 18+
- OpenAI API key (with GPT-5 access)
- Twilio account (for SMS/voice)
- Outcome Workspace credentials (for business data)

### Installation

```bash
# Clone and install
git clone <repository-url>
cd voice-agent
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### Test the System

```bash
# Quick test without Twilio (recommended first step)
node test-cli-simple.js

# Try these commands:
# > tell me about my properties
# > search for real estate in Austin
# > what data do I have?
```

### Start the Server

```bash
# Production
node src/server.js

# Development with auto-restart
npm run start:monitor

# Check health
curl http://localhost:5000/health
```

## Configuration

### Required Environment Variables

```bash
# Core (Required)
OPENAI_API_KEY=sk-...              # OpenAI GPT-5 access
TWILIO_ACCOUNT_SID=...             # Twilio account
TWILIO_AUTH_TOKEN=...              # Twilio auth
TWILIO_PHONE_NUMBER=+1...          # Your Twilio number

# Business Intelligence (Required for "my data" queries)
OUTCOME_API_KEY=...                # Outcome workspace
OUTCOME_API_URL=https://api.youroutcome.com

# Optional Enhancements
ATTOM_API_KEY=...                  # Property data
RENTCAST_API_KEY=...               # Rental estimates
TAVILY_API_KEY=...                 # Web search
```

## How It Works

### SMS Mode

- Text your Twilio number
- AI analyzes your message and routes to appropriate agent
- Executes tools (data queries, property searches, web search)
- Responds with concise SMS-friendly text

### Voice Mode

- Call your Twilio number
- Real-time conversation using OpenAI Realtime API
- Natural voice responses with low latency

### Key Features

- **Business Intelligence**: Access your Outcome workspace data
- **Property Analysis**: ATTOM and RentCast integration
- **Web Search**: Current market trends via Tavily
- **Memory**: Conversation history persists for 2 hours
- **Smart Routing**: Messages automatically routed to specialized agents

## Testing

### Interactive CLI Test

The test CLI lets you test the complete SMS pipeline without Twilio:

```bash
node test-cli-simple.js

# Commands:
/help    - Show commands
/phone   - Change test phone number
/status  - System status
/exit    - Exit CLI
```

**Note**: The CLI makes real API calls to external services (OpenAI, Outcome, etc.), not to the local server.

### Manual SMS Test

```bash
# With server running, test the SMS endpoint
curl -X POST http://localhost:5000/sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=%2B1234567890&Body=test%20message&MessageSid=TEST123"
```

## Production Deployment

```bash
# Using PM2 (recommended)
pm2 start src/server.js --name voice-agent

# Using Docker
docker build -t voice-agent .
docker run -p 5000:5000 --env-file .env voice-agent

# Health monitoring
curl http://localhost:5000/health/detailed
```

### Twilio Configuration

1. Configure your Twilio phone number webhooks:
   - **SMS webhook**: `https://your-domain.com/sms`
   - **Voice webhook**: `https://your-domain.com/incoming-call`
2. Ensure your server is publicly accessible (use ngrok for testing)

## Troubleshooting

### Common Issues

**OpenAI API Key Not Working**

```bash
# Check if key is set
grep OPENAI_API_KEY .env

# Verify GPT-5 access
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | grep gpt-5
```

**Test CLI Won't Start**

```bash
# Check Node.js version (needs 18+)
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**User Not Found / No Business Data**

```bash
# Verify Outcome API configuration
curl $OUTCOME_API_URL/health \
  -H "X-API-Key: $OUTCOME_API_KEY"
```

**Port Already in Use**

```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

### Debug Mode

```bash
# Verbose logging
DEBUG=* node src/server.js

# Watch logs
tail -f logs/latest.log
```

## Project Structure

```
voice-agent/
├── src/
│   ├── server.js           # Main entry point
│   ├── agents/             # AI agents (router, business, real estate)
│   ├── api-clients/        # External API integrations
│   ├── sms/                # SMS processing pipeline
│   ├── tools/              # Tool definitions and execution
│   └── memory/             # Conversation storage
├── test-cli-simple.js      # Interactive testing CLI
├── .env.example            # Environment template
└── README.md               # This file
```

## Additional Documentation

- [Architecture Guide](./docs/ARCHITECTURE.md) - Detailed system architecture
- [Tools Reference](./docs/TOOLS.md) - Tool documentation and examples
- [Development Guide](./CLAUDE.md) - Development patterns and guidelines

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Logs**: Check `logs/latest.log` for detailed debugging
- **Health**: Use `/health/detailed` endpoint for system status

---

Built with Node.js, OpenAI GPT-5, and integrated with Outcome Workspace for business intelligence.
