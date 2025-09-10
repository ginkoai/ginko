/**
 * @fileType: service
 * @status: current
 * @updated: 2025-09-10
 * @tags: [ai, api, claude, openai, insights]
 * @related: [insight-extractor.ts, ../adapters/ai-adapter.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: []
 */

export interface AIServiceConfig {
  provider: 'anthropic' | 'openai' | 'grok' | 'mock';
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
}

export abstract class BaseAIService {
  protected config: AIServiceConfig;
  
  constructor(config: AIServiceConfig) {
    this.config = config;
  }
  
  abstract generateCompletion(prompt: string): Promise<AIResponse>;
  abstract extractJSON<T>(prompt: string): Promise<T>;
}

/**
 * Anthropic Claude API Service
 */
export class AnthropicService extends BaseAIService {
  private apiUrl = 'https://api.anthropic.com/v1/messages';
  
  constructor(config: AIServiceConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }
  }
  
  async generateCompletion(prompt: string): Promise<AIResponse> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json() as any;
    
    return {
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      },
      model: data.model
    };
  }
  
  async extractJSON<T>(prompt: string): Promise<T> {
    const enhancedPrompt = `${prompt}

IMPORTANT: Return ONLY valid JSON without any markdown formatting, code blocks, or explanations. The response should be parseable by JSON.parse() directly.`;
    
    const response = await this.generateCompletion(enhancedPrompt);
    
    try {
      // Clean up any potential markdown or code block formatting
      let jsonStr = response.content.trim();
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      
      return JSON.parse(jsonStr.trim());
    } catch (error) {
      throw new Error(`Failed to parse JSON from AI response: ${error}`);
    }
  }
}

/**
 * OpenAI API Service
 */
export class OpenAIService extends BaseAIService {
  private apiUrl = 'https://api.openai.com/v1/chat/completions';
  
  constructor(config: AIServiceConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }
  
  async generateCompletion(prompt: string): Promise<AIResponse> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4-turbo-preview',
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json() as any;
    
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      },
      model: data.model
    };
  }
  
  async extractJSON<T>(prompt: string): Promise<T> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4-turbo-preview',
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.7,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that always responds with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json() as any;
    
    try {
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      throw new Error(`Failed to parse JSON from AI response: ${error}`);
    }
  }
}

/**
 * Grok AI Service (xAI)
 */
export class GrokService extends BaseAIService {
  private apiUrl = 'https://api.x.ai/v1/chat/completions';
  
  constructor(config: AIServiceConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('Grok API key is required');
    }
  }
  
  async generateCompletion(prompt: string): Promise<AIResponse> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'grok-beta',
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are Grok, a helpful AI assistant with a sense of humor and deep technical knowledge.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Grok API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json() as any;
    
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      },
      model: data.model
    };
  }
  
  async extractJSON<T>(prompt: string): Promise<T> {
    const enhancedPrompt = `${prompt}

IMPORTANT: Return ONLY valid JSON without any markdown formatting, code blocks, or explanations. The response should be parseable by JSON.parse() directly.`;
    
    const response = await this.generateCompletion(enhancedPrompt);
    
    try {
      // Clean up any potential markdown or code block formatting
      let jsonStr = response.content.trim();
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      
      return JSON.parse(jsonStr.trim());
    } catch (error) {
      throw new Error(`Failed to parse JSON from Grok response: ${error}`);
    }
  }
}

/**
 * Mock AI Service for testing
 */
export class MockAIService extends BaseAIService {
  async generateCompletion(prompt: string): Promise<AIResponse> {
    // Return mock response based on prompt content
    return {
      content: 'Mock AI response for: ' + prompt.slice(0, 100),
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      },
      model: 'mock-model'
    };
  }
  
  async extractJSON<T>(prompt: string): Promise<T> {
    // Return mock insights for testing
    if (prompt.includes('insight')) {
      return [
        {
          type: 'gotcha',
          title: 'Mock insight from AI service',
          problem: 'Test problem description',
          solution: 'Test solution description',
          impact: 'Saves time in testing',
          reusabilityScore: 0.8,
          timeSaving: 60,
          codeExample: {
            language: 'typescript',
            before: 'const old = true;',
            after: 'const new = false;'
          },
          prevention: 'Always test your code',
          tags: ['test', 'mock', 'development']
        }
      ] as any;
    }
    
    return {} as T;
  }
}

/**
 * Factory function to create AI service based on environment
 */
export function createAIService(config?: Partial<AIServiceConfig>): BaseAIService {
  // Check environment variables for API keys
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const grokKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  
  // Determine provider based on available keys or config
  let provider: AIServiceConfig['provider'] = 'mock';
  let apiKey: string | undefined;
  
  if (config?.provider) {
    provider = config.provider;
    apiKey = config.apiKey;
  } else if (anthropicKey) {
    provider = 'anthropic';
    apiKey = anthropicKey;
  } else if (openaiKey) {
    provider = 'openai';
    apiKey = openaiKey;
  } else if (grokKey) {
    provider = 'grok';
    apiKey = grokKey;
  }
  
  const finalConfig: AIServiceConfig = {
    provider,
    apiKey,
    ...config
  };
  
  switch (provider) {
    case 'anthropic':
      return new AnthropicService(finalConfig);
    case 'openai':
      return new OpenAIService(finalConfig);
    case 'grok':
      return new GrokService(finalConfig);
    case 'mock':
    default:
      return new MockAIService(finalConfig);
  }
}