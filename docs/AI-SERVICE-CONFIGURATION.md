# AI Service Configuration Guide

## Overview

Ginko can connect to AI services (Claude or OpenAI) to automatically extract insights from your development sessions. When configured, the system analyzes your work patterns, code changes, and problem-solving approaches to capture valuable learnings.

## Supported AI Providers

### Anthropic Claude (Recommended)
- Model: Claude 3.5 Sonnet
- Best for: Comprehensive code analysis and pattern recognition
- Context window: 200k tokens

### OpenAI GPT
- Model: GPT-4 Turbo
- Best for: Structured data extraction with JSON mode
- Context window: 128k tokens

### Grok (xAI)
- Model: Grok Beta
- Best for: Creative problem-solving with personality
- Context window: 128k tokens
- Unique: Humor, real-time knowledge via X platform

## Configuration

### Environment Variables

Set your API key as an environment variable:

```bash
# For Anthropic Claude
export ANTHROPIC_API_KEY="sk-ant-api03-..."

# For OpenAI GPT  
export OPENAI_API_KEY="sk-..."

# For Grok (xAI)
export GROK_API_KEY="xai-..."
# Alternative: export XAI_API_KEY="xai-..."
```

Add to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.) for persistence:

```bash
echo 'export ANTHROPIC_API_KEY="your-key"' >> ~/.zshrc
source ~/.zshrc
```

### Verification

Test your configuration:

```bash
# Check if configured
node packages/cli/test-ai-integration.js

# Run ginko with AI insights
ginko handoff  # Will use AI if configured
```

## How It Works

When AI is configured, Ginko will:

1. **During `ginko handoff`**:
   - Analyze your session changes
   - Extract 3-6 high-value insights
   - Generate reusable context modules
   - Save insights for future reference

2. **Insight Types Captured**:
   - **Gotchas**: Tricky issues that waste time
   - **Patterns**: Reusable solutions and approaches
   - **Decisions**: Important architectural choices
   - **Discoveries**: New techniques or tools
   - **Optimizations**: Performance improvements
   - **Workarounds**: Temporary solutions to blockers

3. **Quality Filtering**:
   - Reusability score > 70%
   - Time saving > 30 minutes
   - Not project-specific
   - Would cause rework if forgotten

## Privacy & Security

- **Local Processing**: API calls are made directly from your machine
- **No Storage**: Ginko doesn't store API keys
- **Session Data Only**: Only current session data is sent
- **Opt-in**: AI features only activate with API key present

## Fallback Behavior

Without API keys configured:
- Ginko uses example insights for demonstration
- All other features work normally
- No external API calls are made

## Cost Considerations

### Anthropic Claude
- ~$0.003 per 1K input tokens
- ~$0.015 per 1K output tokens
- Typical session analysis: ~$0.05-0.10

### OpenAI GPT-4
- ~$0.01 per 1K input tokens  
- ~$0.03 per 1K output tokens
- Typical session analysis: ~$0.10-0.20

### Grok (xAI)
- Pricing varies by plan
- Check x.ai for current rates
- Typical session analysis: Similar to GPT-4

## Troubleshooting

### API Key Not Detected
```bash
# Verify environment variable
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY

# Source profile if just added
source ~/.zshrc  # or ~/.bashrc
```

### Rate Limiting
Both services have rate limits. If you encounter errors:
- Wait a few seconds and retry
- Consider upgrading your API plan
- Use mock mode for testing

### Network Issues
Ensure you can reach the API endpoints:
```bash
# Test Anthropic
curl -I https://api.anthropic.com

# Test OpenAI  
curl -I https://api.openai.com
```

## Advanced Configuration

### Custom Models

You can specify different models by modifying the AI service configuration in your code:

```typescript
// In your custom implementation
const aiService = createAIService({
  provider: 'anthropic',
  model: 'claude-3-opus-20240229',  // Use Opus for complex analysis
  maxTokens: 8192,
  temperature: 0.5  // Lower for more consistent results
});
```

### Programmatic Usage

```typescript
import { InsightExtractor } from '@ginkoai/cli';
import { createAIService } from '@ginkoai/cli';

const aiService = createAIService({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
});

const extractor = new InsightExtractor(aiService);
const insights = await extractor.extractInsights(sessionData);
```

## Best Practices

1. **Start with Mock Mode**: Test your workflow without API costs
2. **Use Anthropic for Code**: Claude excels at code understanding
3. **Batch Operations**: Extract insights at session end, not continuously
4. **Monitor Costs**: Check your API dashboard regularly
5. **Secure Keys**: Never commit API keys to git

## Example Output

With AI configured, `ginko handoff` produces insights like:

```markdown
## 💡 Captured Insights

### Vercel Serverless Functions Need Explicit Exports
**Problem**: API routes returning 404 despite correct placement
**Solution**: Use named exports (GET, POST) in route.ts files
**Time Saved**: 90 minutes
**Tags**: #nextjs #api #vercel

### Database Connection Pooling Pattern  
**Problem**: Connections exhausted in production
**Solution**: Singleton pattern for connection reuse
**Time Saved**: 120 minutes
**Tags**: #database #serverless #production
```

These insights become reusable context modules for future sessions.