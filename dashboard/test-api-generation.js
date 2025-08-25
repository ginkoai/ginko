// Test API key generation directly
import * as bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

async function testApiKeyGeneration() {
  try {
    // Generate a new API key matching MCP server format: wmcp_sk_{environment}_{base64url}
    const environment = 'test' // process.env.NODE_ENV === 'production' ? 'live' : 'test'
    const keySecret = randomBytes(32).toString('base64url')
    const apiKey = `wmcp_sk_${environment}_${keySecret}`
    
    console.log('Generated API Key:', apiKey)
    console.log('Key length:', apiKey.length)
    console.log('Key secret length:', keySecret.length)
    
    // Hash the API key for secure storage (12 rounds like AuthManager)
    console.log('Starting bcrypt hash...')
    const apiKeyHash = await bcrypt.hash(apiKey, 12)
    console.log('Bcrypt hash successful:', apiKeyHash.substring(0, 20) + '...')
    
    // Extract prefix for display (first 8 chars of the secret)
    const apiKeyPrefix = keySecret.substring(0, 8)
    console.log('API Key prefix:', apiKeyPrefix)
    
    console.log('✅ All API key generation steps successful')
    
  } catch (error) {
    console.error('❌ API key generation failed:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })
  }
}

testApiKeyGeneration()