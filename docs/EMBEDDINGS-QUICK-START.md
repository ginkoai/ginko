# Embeddings Service Quick Start Guide

## TL;DR - 5 Minute Setup

```bash
# 1. SSH into Hetzner server
ssh root@178.156.182.99

# 2. Install Docker (if not already installed)
curl -fsSL https://get.docker.com | sh

# 3. Create model directory
mkdir -p /root/models/embeddings

# 4. Run embeddings service
docker run -d \
  --name embeddings-service \
  -p 8080:80 \
  -v /root/models/embeddings:/data \
  --restart unless-stopped \
  ghcr.io/huggingface/text-embeddings-inference:cpu-1.2 \
  --model-id sentence-transformers/all-mpnet-base-v2 \
  --revision main

# 5. Configure firewall
ufw allow 8080/tcp

# 6. Wait for model to download (2-5 minutes)
docker logs -f embeddings-service
# Wait until you see: "Starting server on 0.0.0.0:80"

# 7. Test from server
curl -X POST http://localhost:8080/embed \
  -H "Content-Type: application/json" \
  -d '{"inputs": "Hello, world!"}'

# 8. Test from local machine
curl -X POST http://178.156.182.99:8080/embed \
  -H "Content-Type: application/json" \
  -d '{"inputs": "Hello, world!"}'

# Done! Service is ready.
```

## Update Vercel Environment

```bash
# In Vercel dashboard, add these environment variables:
EMBEDDINGS_API_URL=http://178.156.182.99:8080
EMBEDDINGS_MODEL=sentence-transformers/all-mpnet-base-v2
EMBEDDINGS_DIMENSIONS=768
```

## Test with TypeScript

```typescript
import { generateEmbedding } from './src/embeddings-client';

const result = await generateEmbedding('This is a test document');
console.log(`Generated ${result.dimensions}-dimensional embedding in ${result.latency}ms`);
```

## Run Test Suite

```bash
# From local machine
./scripts/test-hetzner-embeddings.sh
```

## Next Steps

1. **Review full documentation**: See `/docs/HETZNER-EMBEDDINGS-DEPLOYMENT.md`
2. **Setup security**: See `/docs/EMBEDDINGS-SECURITY-BEST-PRACTICES.md`
3. **Create systemd service**: See `/scripts/embeddings-service.service`
4. **Integrate with graph API**: Update batch embedding scripts

## Troubleshooting

### Container won't start
```bash
docker logs embeddings-service
```

### Can't connect from external network
```bash
# On server
netstat -tuln | grep 8080
ufw status | grep 8080

# From local machine
curl -v http://178.156.182.99:8080/health
```

### Slow response times
```bash
docker stats embeddings-service
# Check if CPU/memory is maxed out
```

## Common Commands

```bash
# Check status
docker ps | grep embeddings-service

# View logs
docker logs embeddings-service --tail 50

# Restart service
docker restart embeddings-service

# Stop service
docker stop embeddings-service

# Remove service
docker rm embeddings-service

# Update to latest version
docker pull ghcr.io/huggingface/text-embeddings-inference:cpu-1.2
docker stop embeddings-service
docker rm embeddings-service
# Re-run docker run command from step 4
```

## Performance Expectations

- **Single embedding**: 50-100ms
- **Batch (10 docs)**: 150-300ms
- **Batch (100 docs)**: 1-2s
- **Memory usage**: ~1.5GB
- **Throughput**: 10-20 req/sec

## Cost Savings

- **Self-hosted**: $0/month (uses existing Hetzner server)
- **OpenAI API**: $0.02/1M tokens = ~$20/month for 1B tokens
- **Monthly savings**: $20-100 depending on volume

## Support

- Full documentation: `/docs/HETZNER-EMBEDDINGS-DEPLOYMENT.md`
- Security guide: `/docs/EMBEDDINGS-SECURITY-BEST-PRACTICES.md`
- Test script: `./scripts/test-hetzner-embeddings.sh`
- Integration code: `./src/embeddings-client.ts`
