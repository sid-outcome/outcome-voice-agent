# Voice Agent Documentation

## Quick Links

- **[Getting Started](../README.md)** - Installation and quick start guide
- **[Architecture](./ARCHITECTURE.md)** - System design and components
- **[Tools Reference](./TOOLS.md)** - Available tools and how to add new ones
- **[Development Guide](../CLAUDE.md)** - Patterns and best practices

## Documentation Structure

### For New Users

Start with the main [README](../README.md) for installation and testing.

### For Developers

- **[Architecture](./ARCHITECTURE.md)** - Understand the system design
- **[Tools](./TOOLS.md)** - Learn about available tools and how to extend them
- **[CLAUDE.md](../CLAUDE.md)** - Development patterns and AI guidance

### For Operations

- **Deployment** - See main README's Production Deployment section
- **Monitoring** - Check Architecture doc's Monitoring section
- **Troubleshooting** - Main README has common issues and solutions

## Key Concepts

- **Agents**: Specialized AI processors (Router, Business, Real Estate, General)
- **Tools**: Functions that agents can call (15 SMS tools currently)
- **Memory**: Conversation storage (2-hour TTL, in-memory cache)
- **APIs**: External services (OpenAI, Outcome, ATTOM, RentCast, Tavily)

## Contributing

When adding new features:

1. Update relevant documentation
2. Follow patterns in CLAUDE.md
3. Add tools via TOOLS.md guide
4. Test with `node test-cli-simple.js`
