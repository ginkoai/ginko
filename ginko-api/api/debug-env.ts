import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[DEBUG-ENV] Function executed - logs working!');
  
  const postgresUrl = process.env.POSTGRES_URL;
  const postgresPrismaUrl = process.env.POSTGRES_PRISMA_URL;
  
  console.log('[DEBUG-ENV] POSTGRES_URL exists:', !!postgresUrl);
  console.log('[DEBUG-ENV] POSTGRES_URL length:', postgresUrl?.length || 0);
  console.log('[DEBUG-ENV] POSTGRES_PRISMA_URL exists:', !!postgresPrismaUrl);
  
  if (postgresUrl) {
    console.log('[DEBUG-ENV] POSTGRES_URL starts with:', postgresUrl.substring(0, 50) + '...');
    try {
      const url = new URL(postgresUrl);
      console.log('[DEBUG-ENV] Parsed host:', url.hostname);
      console.log('[DEBUG-ENV] Parsed database:', url.pathname.slice(1));
      console.log('[DEBUG-ENV] Parsed username:', url.username);
      console.log('[DEBUG-ENV] Parsed password exists:', !!url.password);
      console.log('[DEBUG-ENV] Parsed password starts:', url.password?.substring(0, 4) + '...');
    } catch (e) {
      console.log('[DEBUG-ENV] Failed to parse URL:', e);
    }
  }
  
  res.status(200).json({
    postgres_url_exists: !!postgresUrl,
    postgres_url_length: postgresUrl?.length || 0,
    postgres_prisma_url_exists: !!postgresPrismaUrl,
    timestamp: new Date().toISOString(),
    message: 'Check Vercel logs for detailed environment info'
  });
}