# Habit Tracker - Deployment Guide

This guide covers deploying the Habit Tracker application to production using Docker and various hosting platforms.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Docker Deployment](#docker-deployment)
5. [Cloud Deployment Options](#cloud-deployment-options)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Git
- A domain name (for production)
- SSL certificates (for production HTTPS)

## Environment Setup

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd habit-tracker
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration. **Never commit this file to version control.**

3. **Generate secure secrets:**
```bash
# Generate JWT secrets (use different values for production)
openssl rand -base64 32
openssl rand -base64 32

# Generate MongoDB password
openssl rand -base64 16
```

## Local Development

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 2: Manual Setup

1. **Start MongoDB:**
```bash
docker run -d --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:7.0
```

2. **Start Backend:**
```bash
cd backend
npm install
npm run dev
```

3. **Start Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Docker Deployment

### Development Environment

```bash
# Start development services
docker-compose --profile development up -d
```

### Production Environment

1. **Build production images:**
```bash
docker-compose --profile production build
```

2. **Start production services:**
```bash
docker-compose --profile production up -d
```

3. **Verify deployment:**
```bash
docker-compose ps
curl http://localhost/health
```

## Cloud Deployment Options

### Option 1: Railway (Recommended for Beginners)

1. **Prepare for Railway:**
```bash
# Create railway.toml
echo '[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10' > railway.toml
```

2. **Deploy Backend:**
```bash
# Connect backend to Railway
cd backend
railway login
railway init
railway up

# Set environment variables in Railway dashboard
# MONGODB_URI, JWT_SECRET, etc.
```

3. **Deploy Frontend:**
```bash
cd frontend
railway login
railway init
railway up

# Set NEXT_PUBLIC_API_URL to backend Railway URL
```

### Option 2: DigitalOcean App Platform

1. **Create app components:**
```yaml
# .do/app.yaml
name: habit-tracker
services:
- name: api
  source_dir: backend
  github:
    repo: your-username/habit-tracker
    branch: main
  run_command: npm start
  http_port: 3001
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: MONGODB_URI
    value: ${DATABASE_URL}

- name: frontend
  source_dir: frontend
  github:
    repo: your-username/habit-tracker
    branch: main
  build_command: npm run build
  run_command: npm start
  http_port: 3000
  envs:
  - key: NEXT_PUBLIC_API_URL
    value: ${_self.URL}/api
```

2. **Deploy to DigitalOcean:**
```bash
doctl apps create --spec .do/app.yaml
```

### Option 3: AWS EC2 with Docker

1. **Launch EC2 instance:**
```bash
# Ubuntu 22.04 LTS, t3.micro or larger
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.micro \
  --key-name your-key-pair \
  --security-group-ids sg-1234567890abcdef0
```

2. **SSH into instance and setup:**
```bash
ssh -i your-key-pair.pem ubuntu@your-instance-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone and deploy
git clone <your-repo-url>
cd habit-tracker
cp .env.production .env
docker-compose --profile production up -d
```

### Option 4: Heroku

1. **Prepare Heroku deployment:**
```bash
# Backend Procfile
echo 'web: npm start' > backend/Procfile

# Frontend Procfile
echo 'web: npm start' > frontend/Procfile
```

2. **Deploy Backend:**
```bash
cd backend
heroku create habit-tracker-api
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret
git subtree push --prefix backend heroku main
```

3. **Deploy Frontend:**
```bash
cd frontend
heroku create habit-tracker-frontend
heroku config:set NEXT_PUBLIC_API_URL=https://habit-tracker-api.herokuapp.com/api
git subtree push --prefix frontend heroku main
```

## Monitoring and Maintenance

### Health Checks

All services include health checks:

- **Backend**: `GET /health`
- **Frontend**: `GET /`
- **Database**: MongoDB ping
- **Redis**: Redis ping

### Logs

```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Backups

#### MongoDB Backups

```bash
# Create backup
docker exec habit-tracker-db mongodump \
  --uri="mongodb://admin:password@localhost:27017/habit_tracker?authSource=admin" \
  --archive=/backup/backup-$(date +%Y%m%d).archive

# Restore backup
docker exec habit-tracker-db mongorestore \
  --uri="mongodb://admin:password@localhost:27017/habit_tracker?authSource=admin" \
  --archive=/backup/backup-20231201.archive
```

#### Automated Backups

```bash
# Add to crontab
0 2 * * * /path/to/backup-script.sh

# backup-script.sh
#!/bin/bash
BACKUP_DIR="/backups/habit-tracker"
DATE=$(date +%Y%m%d)
docker exec habit-tracker-db mongodump \
  --uri="mongodb://admin:password@localhost:27017/habit_tracker?authSource=admin" \
  --archive=$BACKUP_DIR/backup-$DATE.archive
find $BACKUP_DIR -name "backup-*.archive" -mtime +7 -delete
```

### Performance Monitoring

1. **Application Metrics:**
```bash
# Monitor resource usage
docker stats

# Monitor disk usage
df -h
```

2. **Database Performance:**
```javascript
// MongoDB performance monitoring
db.setProfilingLevel(2, {slowms: 100})
db.system.profile.find().sort({ts: -1}).limit(5)
```

## Security Considerations

### SSL/HTTPS

1. **Generate SSL certificates (Let's Encrypt):**
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
0 12 * * * /usr/bin/certbot renew --quiet
```

2. **Update nginx.conf with certificate paths:**
```nginx
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

### Environment Security

1. **Use production secrets:**
```bash
# Generate production secrets
openssl rand -base64 64 > jwt-secret.txt
openssl rand -base64 64 > jwt-refresh-secret.txt
```

2. **Secure MongoDB:**
- Use strong passwords
- Enable authentication
- Restrict network access
- Enable SSL

3. **Firewall Configuration:**
```bash
# UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors:**
```bash
# Check MongoDB logs
docker logs habit-tracker-db

# Test connection from backend container
docker exec habit-tracker-api mongo mongodb://admin:password@mongodb:27017/habit_tracker
```

2. **CORS Issues:**
```bash
# Check CORS_ORIGIN in .env
echo $CORS_ORIGIN

# Verify API responses include correct headers
curl -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" -X OPTIONS http://localhost:3001/api/habits
```

3. **Build Failures:**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache
```

4. **Memory Issues:**
```bash
# Check memory usage
docker stats

# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Performance Optimization

1. **Database Indexes:**
```javascript
// Connect to MongoDB and verify indexes
use habit_tracker
db.habits.getIndexes()
db.habitcompletions.getIndexes()
```

2. **Application Caching:**
- Enable Redis for session storage
- Implement API response caching
- Use CDN for static assets

3. **Frontend Optimization:**
```bash
# Build with production optimizations
cd frontend
NEXT_TELEMETRY_DISABLED=1 npm run build

# Analyze bundle size
npm install --save-dev @next/bundle-analyzer
npx next-bundle-analyzer
```

## Scaling Considerations

### Horizontal Scaling

1. **Database:**
- Use MongoDB Atlas for managed scaling
- Implement read replicas
- Consider sharding for large datasets

2. **Application:**
- Use load balancer (NGINX/HAProxy)
- Deploy multiple app instances
- Implement session affinity

3. **Frontend:**
- Deploy to CDN (Vercel, Netlify)
- Use edge caching
- Optimize bundle size

### Monitoring Tools

- **Application**: Sentry (error tracking), New Relic (APM)
- **Infrastructure**: Datadog, Grafana/Prometheus
- **Logs**: ELK Stack, Papertrail

## Support

For additional support:

1. Check the GitHub Issues page
2. Review Docker logs for error messages
3. Consult the MongoDB documentation
4. Refer to Next.js deployment guides

Remember to regularly update dependencies and monitor for security advisories.