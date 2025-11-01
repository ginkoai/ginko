# Hetzner Server Setup Guide

## Decision Summary

**Chosen:** Self-hosted Neo4j on Hetzner VPS
**Cost:** $30-50/month vs $2,304-4,608/month for Neo4j AuraDS
**Savings:** $27,000-55,000 annually (77-92x cheaper)

## Server Specifications

### Phase 1-2 (MVP, Beta)
**Hetzner CCX23** - Dedicated vCPU
- 4 dedicated vCPU cores
- 16 GB RAM
- 160 GB NVMe SSD
- 20 TB traffic
- **Cost: €27.90/month (~$30/month)**

**Capacity:**
- 50,000+ documents with embeddings
- 100+ concurrent users
- Sub-100ms query latency

### Phase 3+ (Scale)
**Hetzner Dedicated Server**
- 8-16 CPU cores
- 64-128 GB RAM
- 2x 512 GB NVMe SSD (RAID 1)
- Unlimited traffic
- **Cost: €49-99/month (~$50-100/month)**

**Capacity:**
- 500,000+ documents
- 1,000+ concurrent users
- Production-grade performance

## Setup Steps

### 1. Provision Server

```bash
# Order via Hetzner Cloud Console
# https://console.hetzner.cloud/

# Select:
# - Location: Nuremberg, Germany (EU) or Ashburn, VA (US)
# - Image: Ubuntu 22.04 LTS
# - Type: CCX23 (Dedicated vCPU)
# - SSH Key: Add your public key
```

### 2. Initial Server Configuration

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install essentials
apt install -y curl wget git vim ufw fail2ban

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 7474/tcp  # Neo4j Browser
ufw allow 7687/tcp  # Neo4j Bolt
ufw enable

# Configure fail2ban for SSH protection
systemctl enable fail2ban
systemctl start fail2ban
```

### 3. Install Neo4j

```bash
# Add Neo4j repository
wget -O - https://debian.neo4j.com/neotechnology.gpg.key | apt-key add -
echo 'deb https://debian.neo4j.com stable latest' | tee /etc/apt/sources.list.d/neo4j.list

# Install Neo4j
apt update
apt install -y neo4j=1:5.15.0

# Start Neo4j
systemctl enable neo4j
systemctl start neo4j

# Check status
systemctl status neo4j
```

### 4. Configure Neo4j

```bash
# Edit configuration
vim /etc/neo4j/neo4j.conf
```

**Key settings:**

```conf
# Network configuration
server.default_listen_address=0.0.0.0
server.bolt.listen_address=0.0.0.0:7687
server.http.listen_address=0.0.0.0:7474

# Memory configuration (for 16GB server)
server.memory.heap.initial_size=4G
server.memory.heap.max_size=4G
server.memory.pagecache.size=8G

# Security
dbms.security.auth_enabled=true
server.bolt.tls_level=OPTIONAL

# Performance
dbms.transaction.timeout=60s
dbms.transaction.bookmark_ready_timeout=30s
```

**Restart after changes:**
```bash
systemctl restart neo4j
```

### 5. Set Initial Password

```bash
# Set admin password
neo4j-admin set-initial-password YOUR_SECURE_PASSWORD

# Or change existing password
cypher-shell -u neo4j -p neo4j
# Then run: ALTER CURRENT USER SET PASSWORD FROM 'neo4j' TO 'YOUR_SECURE_PASSWORD';
```

### 6. Install Graph Data Science Plugin

```bash
# Download GDS plugin
cd /var/lib/neo4j/plugins
wget https://graphdatascience.ninja/neo4j-graph-data-science-2.5.0.jar

# Restart Neo4j
systemctl restart neo4j
```

### 7. Install Vector Index Support

Neo4j 5.15+ has native vector index support. Enable it:

```bash
# Edit neo4j.conf
vim /etc/neo4j/neo4j.conf

# Add these lines
dbms.vector.enabled=true
dbms.vector.provider=native
```

### 8. Setup SSL/TLS (Production)

```bash
# Install Certbot
apt install -y certbot

# Get certificate (assuming you have a domain)
certbot certonly --standalone -d neo4j.yourdomain.com

# Configure Neo4j to use certificates
vim /etc/neo4j/neo4j.conf
```

```conf
# SSL Configuration
server.bolt.tls_level=REQUIRED
dbms.ssl.policy.bolt.enabled=true
dbms.ssl.policy.bolt.base_directory=/etc/letsencrypt/live/neo4j.yourdomain.com
dbms.ssl.policy.bolt.private_key=privkey.pem
dbms.ssl.policy.bolt.public_certificate=fullchain.pem
```

### 9. Monitoring Setup

```bash
# Install Prometheus Neo4j exporter
wget https://github.com/neo4j-contrib/neo4j-prometheus-exporter/releases/download/v1.1.0/neo4j-prometheus-exporter-1.1.0.jar
mv neo4j-prometheus-exporter-1.1.0.jar /var/lib/neo4j/plugins/

# Enable metrics
vim /etc/neo4j/neo4j.conf
```

```conf
metrics.enabled=true
metrics.prometheus.enabled=true
metrics.prometheus.endpoint=0.0.0.0:2004
```

### 10. Backup Configuration

```bash
# Install backup script
cat > /usr/local/bin/neo4j-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/neo4j"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Stop Neo4j
systemctl stop neo4j

# Backup database
cp -r /var/lib/neo4j/data/databases $BACKUP_DIR/db_$DATE
cp -r /var/lib/neo4j/data/transactions $BACKUP_DIR/tx_$DATE

# Start Neo4j
systemctl start neo4j

# Compress backup
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/db_$DATE $BACKUP_DIR/tx_$DATE
rm -rf $BACKUP_DIR/db_$DATE $BACKUP_DIR/tx_$DATE

# Keep only last 7 backups
ls -t $BACKUP_DIR/backup_*.tar.gz | tail -n +8 | xargs rm -f

echo "Backup completed: backup_$DATE.tar.gz"
EOF

chmod +x /usr/local/bin/neo4j-backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /usr/local/bin/neo4j-backup.sh
```

## Environment Variables

Add to your deployment environment (Vercel, etc.):

```bash
NEO4J_URI=bolt://YOUR_SERVER_IP:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=YOUR_SECURE_PASSWORD
```

For local development:
```bash
# .env.local
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=development
```

## Testing Connection

```bash
# From your local machine
npm install neo4j-driver

# Test script
node << 'EOF'
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  'bolt://YOUR_SERVER_IP:7687',
  neo4j.auth.basic('neo4j', 'YOUR_PASSWORD')
);

const session = driver.session();

session.run('RETURN "Connection successful!" AS message')
  .then(result => {
    console.log(result.records[0].get('message'));
    session.close();
    driver.close();
  })
  .catch(error => {
    console.error('Connection failed:', error);
  });
EOF
```

## Performance Tuning

### For 16GB RAM Server

```conf
# Optimal settings for CCX23
server.memory.heap.initial_size=4G
server.memory.heap.max_size=4G
server.memory.pagecache.size=8G
server.memory.off_heap.max_size=2G
```

### For 64GB RAM Server

```conf
# Optimal settings for dedicated server
server.memory.heap.initial_size=16G
server.memory.heap.max_size=16G
server.memory.pagecache.size=32G
server.memory.off_heap.max_size=8G
```

## Maintenance Tasks

### Weekly

```bash
# Check disk space
df -h

# Check logs
journalctl -u neo4j -n 100

# Check performance
curl http://localhost:7474/db/system/tx/commit \
  -H "Content-Type: application/json" \
  -d '{"statements":[{"statement":"CALL dbms.queryJmx(\"org.neo4j:*\")"}]}'
```

### Monthly

```bash
# Update system
apt update && apt upgrade -y

# Check Neo4j version
neo4j --version

# Review backups
ls -lh /backups/neo4j/
```

## Cost Breakdown

### Monthly Costs

| Item | Cost |
|------|------|
| Hetzner CCX23 VPS | $30/month |
| Backups (Hetzner Backup) | $6/month (20% of server) |
| Domain (optional) | $1/month |
| **Total** | **$37/month** |

### Annual Costs

| Phase | Infrastructure | Total/Year |
|-------|----------------|------------|
| Phase 1-2 (MVP) | $37/month | **$444/year** |
| Phase 3+ (Scale) | $60-110/month | **$720-1,320/year** |

**Compared to Neo4j AuraDS:** Savings of $27,000-54,000 annually

## Scaling Path

### 10K documents → CCX23 ($30/month)
- 16GB RAM
- 4 vCPU
- Handles 50K docs comfortably

### 50K documents → CCX33 ($60/month)
- 32GB RAM
- 8 vCPU
- Handles 200K docs

### 100K+ documents → Dedicated ($100/month)
- 64-128GB RAM
- 16+ cores
- Production scale

## Security Checklist

- [ ] Firewall configured (ufw)
- [ ] Fail2ban enabled
- [ ] Neo4j password changed from default
- [ ] SSL/TLS certificates installed
- [ ] Backups automated and tested
- [ ] Monitoring configured
- [ ] OS patches automated
- [ ] SSH key-only authentication
- [ ] Non-root user created for deployments
- [ ] Audit logging enabled

## Support Resources

- **Hetzner Support:** https://console.hetzner.cloud/support
- **Neo4j Documentation:** https://neo4j.com/docs/
- **Community Forum:** https://community.neo4j.com/

## Next Steps

1. Provision Hetzner CCX23 server
2. Complete setup steps above
3. Update Ginko CLI to connect to hosted instance
4. Test end-to-end flow
5. Deploy to production
