# Embeddings Service Security Best Practices

## Overview

This document outlines security considerations and best practices for deploying and operating the self-hosted text embeddings service on Hetzner infrastructure.

## Threat Model

### Assets to Protect
- Embeddings service availability (DoS prevention)
- Server resources (CPU, memory, bandwidth)
- Document content sent for embedding (data privacy)
- Infrastructure access credentials

### Potential Threats
1. **Unauthorized Access**: External actors accessing the embeddings API
2. **Resource Exhaustion**: DoS attacks consuming server resources
3. **Data Interception**: Man-in-the-middle attacks on API requests
4. **Credential Exposure**: API keys or tokens leaked
5. **Supply Chain**: Compromised Docker images or dependencies

## Security Layers

### Layer 1: Network Security (Firewall)

#### Basic IP Whitelisting

```bash
# Remove public access
ufw delete allow 8080/tcp

# Allow only from known Vercel deployment IPs
# Get current IPs from: https://vercel.com/docs/concepts/edge-network/regions

# Example Vercel IP ranges (update regularly)
ufw allow from 76.76.21.0/24 to any port 8080 proto tcp
ufw allow from 76.76.21.241 to any port 8080 proto tcp
ufw allow from 75.2.0.0/16 to any port 8080 proto tcp

# Verify rules
ufw status numbered
```

**Pros**: Simple, effective against basic attacks
**Cons**: Requires updating when Vercel IPs change
**Maintenance**: Check and update monthly

#### VPN Access (Recommended for Production)

##### Option A: Tailscale (Easiest)

```bash
# Install Tailscale on Hetzner server
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Get Tailscale IP
tailscale ip -4
# Example: 100.101.102.103

# Update Docker to bind only to Tailscale interface
docker stop embeddings-service
docker rm embeddings-service

docker run -d \
  --name embeddings-service \
  -p 100.101.102.103:8080:80 \
  -v /root/models/embeddings:/data \
  --restart unless-stopped \
  ghcr.io/huggingface/text-embeddings-inference:cpu-1.2 \
  --model-id sentence-transformers/all-mpnet-base-v2

# Block public access
ufw delete allow 8080/tcp

# Update Vercel environment
EMBEDDINGS_API_URL=http://100.101.102.103:8080
```

**Pros**: Zero-config VPN, automatic encryption, easy management
**Cons**: Requires Tailscale on Vercel (may need custom runtime)
**Cost**: Free for up to 100 devices

##### Option B: WireGuard (More Control)

```bash
# Install WireGuard
apt install -y wireguard

# Generate keys
wg genkey | tee /etc/wireguard/privatekey | wg pubkey > /etc/wireguard/publickey

# Configure WireGuard
cat > /etc/wireguard/wg0.conf << EOF
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = $(cat /etc/wireguard/privatekey)

[Peer]
# Vercel/client public key (generate separately)
PublicKey = CLIENT_PUBLIC_KEY_HERE
AllowedIPs = 10.0.0.2/32
EOF

# Enable and start
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

# Allow WireGuard through firewall
ufw allow 51820/udp

# Bind embeddings to WireGuard interface
docker stop embeddings-service
docker rm embeddings-service

docker run -d \
  --name embeddings-service \
  -p 10.0.0.1:8080:80 \
  -v /root/models/embeddings:/data \
  --restart unless-stopped \
  ghcr.io/huggingface/text-embeddings-inference:cpu-1.2 \
  --model-id sentence-transformers/all-mpnet-base-v2
```

**Pros**: High performance, full control, works anywhere
**Cons**: More complex setup, manual key management
**Cost**: Free

### Layer 2: Application Security (Nginx Reverse Proxy)

#### Install Nginx with SSL

```bash
# Install Nginx and Certbot
apt install -y nginx certbot python3-certbot-nginx

# Obtain SSL certificate (requires domain)
certbot certonly --nginx -d embeddings.yourdomain.com

# Configure Nginx
cat > /etc/nginx/sites-available/embeddings << 'EOF'
# Rate limiting zone
limit_req_zone $binary_remote_addr zone=embeddings_limit:10m rate=10r/s;

# Upstream to embeddings service
upstream embeddings_backend {
    server localhost:8080;
    keepalive 32;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name embeddings.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name embeddings.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/embeddings.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/embeddings.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/embeddings_access.log;
    error_log /var/log/nginx/embeddings_error.log;

    # Rate limiting
    limit_req zone=embeddings_limit burst=20 nodelay;
    limit_req_status 429;

    # Client body size limit (prevent large payloads)
    client_max_body_size 1M;

    # Timeouts
    proxy_connect_timeout 30s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Health check endpoint (no auth required)
    location = /health {
        proxy_pass http://embeddings_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        access_log off;
    }

    # Embeddings endpoint (requires auth)
    location / {
        # Bearer token authentication
        if ($http_authorization != "Bearer ${EMBEDDINGS_API_TOKEN}") {
            return 401;
        }

        proxy_pass http://embeddings_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Prevent request smuggling
        proxy_set_header Content-Length $content_length;
    }
}
EOF

# Generate API token
EMBEDDINGS_API_TOKEN=$(openssl rand -hex 32)
echo "EMBEDDINGS_API_TOKEN=$EMBEDDINGS_API_TOKEN" > /root/.embeddings-token

# Replace token placeholder in config
sed -i "s/\${EMBEDDINGS_API_TOKEN}/$EMBEDDINGS_API_TOKEN/" /etc/nginx/sites-available/embeddings

# Enable site
ln -s /etc/nginx/sites-available/embeddings /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Update firewall (allow HTTPS, block direct access to 8080)
ufw allow 443/tcp
ufw delete allow 8080/tcp

# Print token for Vercel
cat /root/.embeddings-token
```

**Update Vercel Environment**:
```bash
EMBEDDINGS_API_URL=https://embeddings.yourdomain.com
EMBEDDINGS_API_TOKEN=<token-from-server>
```

**Update Client Code**:
```typescript
// src/embeddings-client.ts
const response = await fetch(`${this.apiUrl}/embed`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.EMBEDDINGS_API_TOKEN}`,
  },
  body: JSON.stringify({ inputs: text }),
});
```

### Layer 3: Container Security

#### Run Container with Security Options

```bash
docker run -d \
  --name embeddings-service \
  -p 127.0.0.1:8080:80 \
  -v /root/models/embeddings:/data:ro \
  --restart unless-stopped \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=1g \
  --security-opt=no-new-privileges:true \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --pids-limit=100 \
  --memory=4g \
  --cpus=2 \
  ghcr.io/huggingface/text-embeddings-inference:cpu-1.2 \
  --model-id sentence-transformers/all-mpnet-base-v2
```

**Security Options Explained**:
- `-p 127.0.0.1:8080:80`: Bind only to localhost (Nginx proxies)
- `--read-only`: Container filesystem is read-only
- `--tmpfs`: Writable temporary storage in memory
- `--security-opt=no-new-privileges`: Prevent privilege escalation
- `--cap-drop=ALL --cap-add=NET_BIND_SERVICE`: Minimal capabilities
- `--pids-limit=100`: Limit process fork bombs
- `--memory=4g --cpus=2`: Resource limits

#### Verify Image Signatures

```bash
# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1

# Pull image (will verify signatures)
docker pull ghcr.io/huggingface/text-embeddings-inference:cpu-1.2

# Inspect image
docker inspect ghcr.io/huggingface/text-embeddings-inference:cpu-1.2
```

### Layer 4: Monitoring and Alerting

#### Setup Fail2Ban for API Abuse

```bash
# Create custom fail2ban filter
cat > /etc/fail2ban/filter.d/embeddings-abuse.conf << 'EOF'
[Definition]
failregex = ^<HOST> - .* "(POST|GET) /embed.* HTTP/.*" 429 .*$
            ^<HOST> - .* "(POST|GET) /embed.* HTTP/.*" 401 .*$
ignoreregex =
EOF

# Create fail2ban jail
cat > /etc/fail2ban/jail.d/embeddings.conf << 'EOF'
[embeddings-abuse]
enabled = true
port = http,https
filter = embeddings-abuse
logpath = /var/log/nginx/embeddings_access.log
maxretry = 10
findtime = 60
bantime = 3600
action = iptables-multiport[name=embeddings, port="http,https", protocol=tcp]
EOF

# Restart fail2ban
systemctl restart fail2ban

# Check status
fail2ban-client status embeddings-abuse
```

#### Setup Prometheus Monitoring

```bash
# Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-2.45.0.linux-amd64.tar.gz
mv prometheus-2.45.0.linux-amd64 /opt/prometheus

# Configure Prometheus
cat > /opt/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'embeddings'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
EOF

# Create systemd service
cat > /etc/systemd/system/prometheus.service << 'EOF'
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/opt/prometheus/prometheus \
  --config.file=/opt/prometheus/prometheus.yml \
  --storage.tsdb.path=/opt/prometheus/data

[Install]
WantedBy=multi-user.target
EOF

# Create prometheus user
useradd --no-create-home --shell /bin/false prometheus
chown -R prometheus:prometheus /opt/prometheus

# Start Prometheus
systemctl daemon-reload
systemctl enable prometheus
systemctl start prometheus
```

#### Setup Alerting

```bash
# Install Alertmanager
wget https://github.com/prometheus/alertmanager/releases/download/v0.26.0/alertmanager-0.26.0.linux-amd64.tar.gz
tar xvfz alertmanager-0.26.0.linux-amd64.tar.gz
mv alertmanager-0.26.0.linux-amd64 /opt/alertmanager

# Configure alerts
cat > /opt/prometheus/alerts.yml << 'EOF'
groups:
  - name: embeddings
    rules:
      - alert: EmbeddingsServiceDown
        expr: up{job="embeddings"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Embeddings service is down"
          description: "The embeddings service has been down for 5 minutes"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High embeddings latency"
          description: "95th percentile latency is above 1 second"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate"
          description: "More than 5% of requests are failing"
EOF

# Add alert rules to Prometheus config
echo "rule_files:
  - 'alerts.yml'" >> /opt/prometheus/prometheus.yml

# Restart Prometheus
systemctl restart prometheus
```

### Layer 5: Logging and Audit

#### Centralized Logging

```bash
# Install rsyslog for centralized logging
apt install -y rsyslog

# Configure Docker logging
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "syslog",
  "log-opts": {
    "syslog-address": "udp://localhost:514",
    "tag": "embeddings-service"
  }
}
EOF

# Restart Docker
systemctl restart docker
systemctl restart embeddings-service

# Configure log rotation
cat > /etc/logrotate.d/embeddings << 'EOF'
/var/log/nginx/embeddings_*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
EOF
```

#### Audit Logging

```bash
# Enable audit logging for Docker commands
apt install -y auditd

# Add audit rules
auditctl -w /usr/bin/docker -p x -k docker
auditctl -w /var/lib/docker -p wa -k docker

# Make persistent
cat >> /etc/audit/rules.d/audit.rules << 'EOF'
-w /usr/bin/docker -p x -k docker
-w /var/lib/docker -p wa -k docker
EOF

# Restart auditd
systemctl restart auditd

# View Docker-related audit events
ausearch -k docker
```

## Incident Response Procedures

### 1. Unauthorized Access Detected

```bash
# Review access logs
tail -f /var/log/nginx/embeddings_access.log | grep -v "200\|304"

# Check fail2ban status
fail2ban-client status embeddings-abuse

# Block suspicious IPs immediately
ufw deny from <IP_ADDRESS>

# Review Docker logs
docker logs embeddings-service --since 1h | grep -i error
```

### 2. High Resource Usage

```bash
# Check container resource usage
docker stats embeddings-service

# Check system resources
htop

# Review recent requests
tail -100 /var/log/nginx/embeddings_access.log

# Restart service if needed
systemctl restart embeddings-service
```

### 3. Service Unavailable

```bash
# Check service status
systemctl status embeddings-service

# Check Docker daemon
systemctl status docker

# Check logs
journalctl -u embeddings-service -n 100

# Restart if needed
systemctl restart embeddings-service
```

## Security Checklist

### Initial Deployment
- [ ] Firewall configured (ufw enabled)
- [ ] IP whitelisting or VPN configured
- [ ] SSL/TLS certificates installed (if using domain)
- [ ] Nginx reverse proxy configured
- [ ] Bearer token authentication enabled
- [ ] Rate limiting configured
- [ ] Container security options applied
- [ ] Fail2ban configured
- [ ] Monitoring setup (Prometheus/Alertmanager)
- [ ] Log rotation configured
- [ ] Backup strategy defined

### Regular Maintenance (Weekly)
- [ ] Review access logs for anomalies
- [ ] Check fail2ban ban list
- [ ] Verify SSL certificate expiry (if applicable)
- [ ] Review Prometheus alerts
- [ ] Check disk space usage
- [ ] Verify backup integrity

### Regular Maintenance (Monthly)
- [ ] Update system packages (`apt update && apt upgrade`)
- [ ] Update Docker images
- [ ] Review and update IP whitelist
- [ ] Rotate API tokens (if applicable)
- [ ] Review and clear old logs
- [ ] Test disaster recovery procedures

### Regular Maintenance (Quarterly)
- [ ] Security audit of infrastructure
- [ ] Review and update security policies
- [ ] Penetration testing (if required)
- [ ] Update documentation
- [ ] Review incident response procedures

## Security Recommendations by Environment

### Development
- **Network**: Public access OK, use basic firewall
- **Authentication**: Optional (for internal testing)
- **SSL**: Optional (self-signed certificates OK)
- **Monitoring**: Basic logging
- **Cost**: Minimal

### Staging
- **Network**: IP whitelist to office/VPN
- **Authentication**: Bearer token required
- **SSL**: Let's Encrypt certificates
- **Monitoring**: Prometheus + basic alerts
- **Cost**: Low

### Production
- **Network**: VPN (Tailscale/WireGuard) required
- **Authentication**: Bearer token + rate limiting
- **SSL**: Commercial or Let's Encrypt certificates
- **Monitoring**: Full stack (Prometheus + Alertmanager + PagerDuty)
- **Audit**: Full audit logging enabled
- **Backup**: Daily backups with off-site storage
- **Cost**: Medium

## Cost-Benefit Analysis

| Security Layer | Setup Time | Monthly Cost | Risk Reduction |
|----------------|------------|--------------|----------------|
| Basic Firewall | 5 minutes | $0 | 40% |
| IP Whitelist | 10 minutes | $0 | 60% |
| VPN (Tailscale) | 15 minutes | $0 (free tier) | 80% |
| Nginx + SSL + Auth | 30 minutes | $0 | 90% |
| Full Monitoring | 2 hours | $0 | 95% |

**Recommendation**: For production, invest 1 hour in Nginx + SSL + Auth + basic monitoring (90% risk reduction at $0 monthly cost).

## Support Resources

- **Nginx Security**: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- **Docker Security**: https://docs.docker.com/engine/security/
- **Fail2Ban**: https://www.fail2ban.org/wiki/index.php/Main_Page
- **Prometheus**: https://prometheus.io/docs/introduction/overview/
- **Tailscale**: https://tailscale.com/kb/

## Appendix: Example Attack Scenarios

### Scenario 1: Brute Force Token Guessing
**Attack**: Attacker tries thousands of bearer tokens
**Defense**: Rate limiting (10 req/s) + fail2ban (ban after 10 failures)
**Result**: Attacker banned after 1 second

### Scenario 2: DoS via Large Payloads
**Attack**: Attacker sends MB-sized embedding requests
**Defense**: Nginx `client_max_body_size 1M`
**Result**: Requests rejected before reaching service

### Scenario 3: Credential Leak
**Attack**: API token exposed in GitHub
**Defense**: Token rotation procedure + monitoring for unusual traffic
**Result**: Token rotated within 15 minutes, attacker locked out

### Scenario 4: Container Escape
**Attack**: Vulnerability in Docker allows container escape
**Defense**: Read-only filesystem + capability dropping + regular updates
**Result**: Escape attempt fails due to security restrictions
