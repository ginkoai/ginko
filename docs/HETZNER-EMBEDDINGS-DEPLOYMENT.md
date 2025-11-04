# Hetzner Embeddings Service Deployment Guide

## Overview

Deploy a self-hosted embeddings service using Hugging Face's `text-embeddings-inference` on your Hetzner VPS. This eliminates external API dependencies and provides:

- **Cost Savings**: No per-request charges ($0.0001/token → free)
- **Low Latency**: ~50-100ms response time (same datacenter as Neo4j)
- **Privacy**: Embeddings never leave your infrastructure
- **Reliability**: No rate limits or API quotas

## Server Information

- **IP Address**: `178.156.182.99`
- **Existing Services**: Neo4j (ports 7474, 7687)
- **Model**: `sentence-transformers/all-mpnet-base-v2`
- **Output Dimensions**: 768
- **Embeddings Port**: 8080

## Prerequisites Check

Before starting, verify:

```bash
# SSH access works
ssh root@178.156.182.99

# Check available disk space (need ~2GB for model + container)
df -h
# Ensure / or /home has at least 5GB free

# Check memory (embeddings need ~2GB RAM)
free -h
# Ensure at least 4GB available RAM

# Check Docker is installed
docker --version
# If not installed, we'll install it in Step 1
```

## Step 1: Install Docker

If Docker isn't already installed:

```bash
# SSH into server
ssh root@178.156.182.99

# Update package list
apt update

# Install prerequisites
apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io

# Verify installation
docker --version
# Expected: Docker version 24.x.x or later

# Enable Docker to start on boot
systemctl enable docker
systemctl start docker

# Test Docker
docker run hello-world
# Expected: "Hello from Docker!" message
```

**Expected Output**:
```
Docker version 24.0.7, build afdd53b
```

## Step 2: Create Model Storage Directory

```bash
# Create directory for model cache
mkdir -p /root/models/embeddings

# Set permissions
chmod 755 /root/models/embeddings

# Verify
ls -la /root/models/
# Expected: drwxr-xr-x ... embeddings
```

## Step 3: Pull and Run Embeddings Container

### Option A: CPU-Only (Recommended for Hetzner CCX23)

```bash
# Pull the container image (this may take 2-3 minutes)
docker pull ghcr.io/huggingface/text-embeddings-inference:cpu-1.2

# Run the embeddings service
docker run -d \
  --name embeddings-service \
  -p 8080:80 \
  -v /root/models/embeddings:/data \
  --restart unless-stopped \
  ghcr.io/huggingface/text-embeddings-inference:cpu-1.2 \
  --model-id sentence-transformers/all-mpnet-base-v2 \
  --revision main \
  --max-concurrent-requests 32 \
  --max-batch-tokens 16384
```

**First Run**: The container will download the model (~420MB). This takes 2-5 minutes depending on connection speed.

**Expected Output**:
```
Unable to find image 'ghcr.io/huggingface/text-embeddings-inference:cpu-1.2' locally
cpu-1.2: Pulling from huggingface/text-embeddings-inference
...
Status: Downloaded newer image for ghcr.io/huggingface/text-embeddings-inference:cpu-1.2
a1b2c3d4e5f6... (container ID)
```

### Option B: GPU-Enabled (If you have GPU access)

```bash
# Install nvidia-docker first
# https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html

docker run -d \
  --name embeddings-service \
  --gpus all \
  -p 8080:80 \
  -v /root/models/embeddings:/data \
  --restart unless-stopped \
  ghcr.io/huggingface/text-embeddings-inference:1.2 \
  --model-id sentence-transformers/all-mpnet-base-v2 \
  --revision main
```

## Step 4: Verify Container is Running

```bash
# Check container status
docker ps | grep embeddings-service
# Expected: Container in "Up" state

# Check container logs (model download progress)
docker logs embeddings-service
# Expected: "Starting server on 0.0.0.0:80" (after model downloads)

# Watch logs in real-time until model is ready
docker logs -f embeddings-service
# Press Ctrl+C to exit when you see "Server started"
```

**Expected Log Output** (when ready):
```
2025-11-03T18:30:45.123Z INFO text_embeddings_router: Loading model sentence-transformers/all-mpnet-base-v2
2025-11-03T18:30:47.456Z INFO text_embeddings_router: Model loaded successfully
2025-11-03T18:30:47.457Z INFO text_embeddings_router: Starting server on 0.0.0.0:80
```

**If Model Download Fails**:
```bash
# Check disk space
df -h

# Check container logs for errors
docker logs embeddings-service 2>&1 | grep -i error

# Restart container
docker restart embeddings-service
```

## Step 5: Configure Firewall

```bash
# Allow embeddings service port
ufw allow 8080/tcp

# Verify firewall rules
ufw status
# Expected: 8080/tcp ALLOW Anywhere

# For production: Restrict to Vercel IPs (recommended)
# Get Vercel IPs from: https://vercel.com/docs/concepts/edge-network/regions
ufw delete allow 8080/tcp
ufw allow from 76.76.21.0/24 to any port 8080 proto tcp
ufw allow from 76.76.21.241 to any port 8080 proto tcp
```

**Security Note**: For production, consider:
1. **VPN**: Use Tailscale or WireGuard for private access
2. **Reverse Proxy**: Nginx with SSL and authentication
3. **IP Whitelist**: Restrict to known Vercel deployment IPs

## Step 6: Test the Embeddings Endpoint

### Basic Health Check

```bash
# Check service is responding
curl http://localhost:8080/health

# Expected output:
# {"status":"ok"}
```

### Generate Test Embedding

```bash
# Test embedding generation
curl -X POST http://localhost:8080/embed \
  -H "Content-Type: application/json" \
  -d '{"inputs": "Hello, world!"}' | jq

# Expected output (abbreviated):
# [
#   [0.123, -0.456, 0.789, ... ] // 768 floats
# ]
```

### Performance Test

```bash
# Test response time
time curl -X POST http://localhost:8080/embed \
  -H "Content-Type: application/json" \
  -d '{"inputs": "This is a test sentence for measuring embedding generation speed."}'

# Expected: real 0m0.05s - 0m0.15s (50-150ms)
```

### Batch Test

```bash
# Test batch embedding (multiple inputs)
curl -X POST http://localhost:8080/embed \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      "First document to embed",
      "Second document to embed",
      "Third document to embed"
    ]
  }' | jq 'length'

# Expected output: 3
```

## Step 7: Create Systemd Service (Alternative to Docker Restart)

While `--restart unless-stopped` handles most cases, you can create a systemd service for better integration:

```bash
# Create systemd service file
cat > /etc/systemd/system/embeddings-service.service << 'EOF'
[Unit]
Description=Text Embeddings Inference Service
Requires=docker.service
After=docker.service

[Service]
Restart=always
RestartSec=10
ExecStartPre=-/usr/bin/docker stop embeddings-service
ExecStartPre=-/usr/bin/docker rm embeddings-service
ExecStart=/usr/bin/docker run --rm \
  --name embeddings-service \
  -p 8080:80 \
  -v /root/models/embeddings:/data \
  ghcr.io/huggingface/text-embeddings-inference:cpu-1.2 \
  --model-id sentence-transformers/all-mpnet-base-v2 \
  --revision main \
  --max-concurrent-requests 32 \
  --max-batch-tokens 16384

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Enable service
systemctl enable embeddings-service

# Start service
systemctl start embeddings-service

# Check status
systemctl status embeddings-service
```

**Note**: If using systemd, remove the Docker container first:
```bash
docker stop embeddings-service
docker rm embeddings-service
```

## Step 8: Test from External Network

From your local machine:

```bash
# Test from local machine
curl -X POST http://178.156.182.99:8080/embed \
  -H "Content-Type: application/json" \
  -d '{"inputs": "External network test"}' | jq '. | length'

# Expected: [768] (length of first embedding array)
```

**If Connection Fails**:
```bash
# On server, check if port is listening
netstat -tuln | grep 8080
# Expected: tcp 0.0.0.0:8080 LISTEN

# Check firewall
ufw status | grep 8080

# Check Docker logs
docker logs embeddings-service --tail 50
```

## Step 9: Update Environment Variables

Add to your Vercel deployment:

```bash
# In Vercel dashboard or via CLI
EMBEDDINGS_API_URL=http://178.156.182.99:8080
EMBEDDINGS_MODEL=sentence-transformers/all-mpnet-base-v2
EMBEDDINGS_DIMENSIONS=768
```

For local development (`.env.local`):
```bash
EMBEDDINGS_API_URL=http://178.156.182.99:8080
EMBEDDINGS_MODEL=sentence-transformers/all-mpnet-base-v2
EMBEDDINGS_DIMENSIONS=768
```

## Performance Benchmarks

Expected performance on Hetzner CCX23:

| Operation | Latency | Throughput |
|-----------|---------|------------|
| Single embedding | 50-100ms | 10-20 req/sec |
| Batch (10 docs) | 150-300ms | 30-60 docs/sec |
| Batch (100 docs) | 1-2s | 50-100 docs/sec |

**Memory Usage**:
- Model loaded: ~1.5GB RAM
- Per request: +50-100MB (transient)
- Recommended: Keep 2GB available for embeddings service

## Monitoring

### Check Service Health

```bash
# Check if container is running
docker ps | grep embeddings-service

# Check resource usage
docker stats embeddings-service --no-stream

# Expected output:
# CONTAINER         CPU %   MEM USAGE / LIMIT   MEM %
# embeddings-svc    2.5%    1.5GiB / 16GiB     9.38%
```

### Check Logs

```bash
# View recent logs
docker logs embeddings-service --tail 100

# Follow logs in real-time
docker logs -f embeddings-service

# Search for errors
docker logs embeddings-service 2>&1 | grep -i error
```

### Check Request Statistics

```bash
# Get metrics (if enabled)
curl http://localhost:8080/metrics
```

## Troubleshooting

### Container Won't Start

```bash
# Check Docker daemon
systemctl status docker

# Check disk space
df -h

# Check if port is already in use
netstat -tuln | grep 8080

# View container logs
docker logs embeddings-service

# Restart Docker daemon
systemctl restart docker
```

### Slow Response Times

```bash
# Check CPU usage
top
# Look for high %CPU from docker process

# Check memory
free -h
# Ensure enough free RAM

# Check concurrent requests
docker logs embeddings-service | grep concurrent

# Reduce max_concurrent_requests
docker stop embeddings-service
docker rm embeddings-service
# Re-run with --max-concurrent-requests 16
```

### Out of Memory Errors

```bash
# Check memory usage
docker stats embeddings-service

# View OOM errors
dmesg | grep -i "out of memory"

# Solution: Add swap space
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Model Download Fails

```bash
# Check internet connectivity
ping huggingface.co

# Check disk space
df -h /root/models/embeddings

# Manual download (if needed)
docker run --rm -v /root/models/embeddings:/data \
  ghcr.io/huggingface/text-embeddings-inference:cpu-1.2 \
  --model-id sentence-transformers/all-mpnet-base-v2 \
  --download-only
```

### Connection Refused from External Network

```bash
# Check firewall
ufw status | grep 8080

# Check if container is listening on all interfaces
docker port embeddings-service
# Expected: 80/tcp -> 0.0.0.0:8080

# Test from server
curl http://localhost:8080/health

# Check iptables rules (if using)
iptables -L -n | grep 8080
```

## Security Best Practices

### 1. Restrict Access by IP

```bash
# Remove open access
ufw delete allow 8080/tcp

# Allow only from Vercel IPs (example)
ufw allow from 76.76.21.0/24 to any port 8080 proto tcp

# Or use a VPN like Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
# Then bind embeddings service to Tailscale IP only
```

### 2. Add Nginx Reverse Proxy with SSL

```bash
# Install Nginx
apt install -y nginx certbot python3-certbot-nginx

# Get SSL certificate (requires domain)
certbot certonly --nginx -d embeddings.yourdomain.com

# Configure Nginx
cat > /etc/nginx/sites-available/embeddings << 'EOF'
server {
    listen 443 ssl http2;
    server_name embeddings.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/embeddings.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/embeddings.yourdomain.com/privkey.pem;

    # Basic authentication
    auth_basic "Embeddings API";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Create basic auth
apt install -y apache2-utils
htpasswd -c /etc/nginx/.htpasswd embeddings

# Enable site
ln -s /etc/nginx/sites-available/embeddings /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Update firewall
ufw allow 443/tcp
ufw delete allow 8080/tcp
```

### 3. Add Authentication Token

```bash
# Create API token validation in Nginx
cat > /etc/nginx/snippets/api-auth.conf << 'EOF'
if ($http_authorization != "Bearer YOUR_SECRET_TOKEN") {
    return 401;
}
EOF

# Include in site config
# Add this line inside the location block:
# include snippets/api-auth.conf;
```

### 4. Rate Limiting

```bash
# Add to Nginx config (before server block)
limit_req_zone $binary_remote_addr zone=embeddings:10m rate=10r/s;

# In location block:
limit_req zone=embeddings burst=20 nodelay;
```

## Maintenance Tasks

### Daily
```bash
# Check service is running
docker ps | grep embeddings-service

# Check disk space
df -h
```

### Weekly
```bash
# Check logs for errors
docker logs embeddings-service --since 168h | grep -i error

# Check resource usage trends
docker stats embeddings-service --no-stream

# Verify external access
curl http://178.156.182.99:8080/health
```

### Monthly
```bash
# Update container image
docker pull ghcr.io/huggingface/text-embeddings-inference:cpu-1.2
docker stop embeddings-service
docker rm embeddings-service
# Re-run docker run command from Step 3

# Update system packages
apt update && apt upgrade -y

# Review logs
docker logs embeddings-service --since 720h | less
```

## Upgrading the Service

### Update to New Model

```bash
# Stop current service
docker stop embeddings-service
docker rm embeddings-service

# Clear model cache (optional)
rm -rf /root/models/embeddings/*

# Run with new model
docker run -d \
  --name embeddings-service \
  -p 8080:80 \
  -v /root/models/embeddings:/data \
  --restart unless-stopped \
  ghcr.io/huggingface/text-embeddings-inference:cpu-1.2 \
  --model-id sentence-transformers/new-model-name \
  --revision main
```

### Update to New Container Version

```bash
# Pull latest version
docker pull ghcr.io/huggingface/text-embeddings-inference:cpu-1.2

# Restart with new image
docker stop embeddings-service
docker rm embeddings-service
# Re-run docker run command
```

## Cost Analysis

### Infrastructure Costs

| Item | Cost |
|------|------|
| Hetzner CCX23 (existing) | $30/month |
| Embeddings service overhead | $0/month (same server) |
| **Total** | **$30/month** |

### Comparison to External APIs

| Service | Cost per 1M tokens | Monthly (1B tokens) |
|---------|-------------------|---------------------|
| Self-hosted | $0 | $0 |
| OpenAI text-embedding-3-small | $0.02/1M | $20 |
| Cohere embed-english-v3.0 | $0.10/1M | $100 |
| **Savings** | | **$20-100/month** |

### Break-Even Analysis

- **Setup time**: 1 hour
- **Monthly savings**: $20-100
- **Break-even**: Immediate (uses existing infrastructure)

## Integration Examples

See the test script in `scripts/test-hetzner-embeddings.sh` for full integration examples.

Basic TypeScript example:
```typescript
async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch('http://178.156.182.99:8080/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: text })
  });

  if (!response.ok) {
    throw new Error(`Embeddings API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data[0]; // 768-dimensional vector
}
```

## Next Steps

1. Complete this deployment guide
2. Run test script: `./scripts/test-hetzner-embeddings.sh`
3. Update Vercel environment variables
4. Deploy updated API code
5. Test end-to-end semantic search
6. Monitor performance and tune as needed

## Support Resources

- **Hugging Face Text Embeddings Inference**: https://github.com/huggingface/text-embeddings-inference
- **Model Card**: https://huggingface.co/sentence-transformers/all-mpnet-base-v2
- **Hetzner Status**: https://status.hetzner.com/
- **Docker Documentation**: https://docs.docker.com/

## Appendix: Alternative Models

If you want to try different models:

### Smaller/Faster Models (384 dimensions)
```bash
--model-id sentence-transformers/all-MiniLM-L6-v2
# Pros: 2x faster, less memory
# Cons: Lower quality
```

### Multilingual Models (768 dimensions)
```bash
--model-id sentence-transformers/paraphrase-multilingual-mpnet-base-v2
# Pros: 50+ languages
# Cons: Slightly slower
```

### Larger/Better Models (1024 dimensions)
```bash
--model-id BAAI/bge-large-en-v1.5
# Pros: Better quality
# Cons: 3x slower, more memory
```

Remember to update `EMBEDDINGS_DIMENSIONS` environment variable if changing models!
