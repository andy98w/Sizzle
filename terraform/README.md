# Sizzle Infrastructure

Terraform configuration for deploying Sizzle to Oracle Cloud Infrastructure (OCI).

## Architecture

- **Compute**: OCI VM.Standard.E2.1.Micro (Free Tier, 1GB RAM)
- **Frontend**: Next.js (port 3000) → Nginx reverse proxy
- **Backend**: FastAPI + Uvicorn (port 8000) → Nginx reverse proxy
- **Database**: Supabase (Hosted PostgreSQL)
- **Storage**: OCI Object Storage with Pre-Authenticated Request URLs
- **Process Manager**: PM2 for both frontend and backend
- **Web Server**: Nginx (ports 80/443)

## Prerequisites

1. **OCI Account** with Free Tier available
2. **OCI CLI** configured (`~/.oci/config`)
3. **Terraform** installed (v1.0+)
4. **Supabase Project** created
5. **OpenAI API Key**

## Setup

### 1. Get Your OCI Credentials

```bash
# Your OCI config should be at ~/.oci/config
cat ~/.oci/config
```

You need:
- `tenancy_ocid`
- `user_ocid`
- `fingerprint`
- `key_file` path
- `compartment_id` (from OCI Console)

### 2. Get Your Public IP

```bash
curl https://ifconfig.me
```

### 3. Create terraform.tfvars

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:
```hcl
# OCI Configuration
tenancy_ocid     = "ocid1.tenancy.oc1..aaaaaaaa..."
user_ocid        = "ocid1.user.oc1..aaaaaaaa..."
fingerprint      = "xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx"
private_key_path = "~/.oci/oci_api_key.pem"
compartment_id   = "ocid1.compartment.oc1..aaaaaaaa..."
region           = "ca-toronto-1"

# SSH Configuration
ssh_public_key_path = "~/.ssh/id_rsa.pub"
admin_ip_cidr       = "YOUR.IP.ADDRESS/32"

# Application
domain_name = "sizzle.yourdomain.com"  # Optional

# Supabase
supabase_url = "https://xxx.supabase.co"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# OpenAI
openai_api_key = "sk-..."
```

**IMPORTANT:** Never commit `terraform.tfvars` to git!

### 4. Initialize Terraform

```bash
terraform init
```

### 5. Review the Plan

```bash
terraform plan
```

This will show you everything that will be created:
- VCN (Virtual Cloud Network)
- Subnet
- Internet Gateway
- Security Lists
- Compute Instance
- Object Storage Bucket
- Pre-Authenticated Request URLs

### 6. Apply Infrastructure

```bash
terraform apply
```

Type `yes` when prompted. This will take ~5 minutes.

## Post-Deployment

### 1. Wait for Cloud-Init

The server needs ~5-10 minutes to complete setup:
```bash
# SSH into the server
ssh opc@<SERVER_IP>

# Check cloud-init progress
tail -f /var/log/cloud-init-sizzle.log

# Wait for: "=== Sizzle Setup Complete ==="
```

### 2. Deploy Backend

```bash
# From your local machine
cd backend
scp -r *.py requirements.txt scripts/ opc@<SERVER_IP>:/opt/sizzle-backend/

# On the server
ssh opc@<SERVER_IP>
cd /opt/sizzle-backend
source venv/bin/activate
pip install -r requirements.txt
pm2 start /home/opc/ecosystem.config.js --only sizzle-backend
pm2 save
```

### 3. Deploy Frontend

```bash
# Build locally
cd frontend
npm run build

# Deploy
scp -r .next package.json package-lock.json public/ next.config.js opc@<SERVER_IP>:/opt/sizzle-frontend/

# On server
ssh opc@<SERVER_IP>
cd /opt/sizzle-frontend
npm install --production
pm2 start /home/opc/ecosystem.config.js --only sizzle-frontend
pm2 save
```

### 4. Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:3000
```

### 5. Configure DNS (Optional)

Point your domain to the server IP:
```
A Record: sizzle.yourdomain.com → <SERVER_IP>
```

## Useful Commands

### Terraform

```bash
# View current state
terraform show

# View outputs (including PAR URL)
terraform output

# Update infrastructure
terraform apply

# Destroy everything
terraform destroy
```

### Server Management

```bash
# SSH to server
ssh opc@<SERVER_IP>

# Check PM2 status
pm2 status

# Restart applications
pm2 restart all

# View logs
pm2 logs

# Monitor resources
pm2 monit
htop

# Check nginx
sudo systemctl status nginx
sudo nginx -t

# View application logs
tail -f /var/log/sizzle/*.log
```

### Deployment

```bash
# Quick backend redeploy
scp -r backend/*.py opc@<SERVER_IP>:/opt/sizzle-backend/
ssh opc@<SERVER_IP> "cd /opt/sizzle-backend && pm2 restart sizzle-backend"

# Quick frontend redeploy
npm run build && scp -r .next opc@<SERVER_IP>:/opt/sizzle-frontend/
ssh opc@<SERVER_IP> "pm2 restart sizzle-frontend"
```

## Security Notes

1. **PAR URL** - The Pre-Authenticated Request URL is output by Terraform. This is sensitive! It allows access to your OCI Object Storage.

2. **Environment Variables** - Stored in:
   - Backend: `/opt/sizzle-backend/.env`
   - Frontend: `/opt/sizzle-frontend/.env.production.local`

3. **SSH Access** - Only allowed from `admin_ip_cidr` defined in terraform.tfvars

4. **Firewall** - `firewalld` is configured to allow only HTTP, HTTPS, and SSH

## Costs

With Free Tier:
- **Compute**: FREE (E2.1.Micro)
- **Network**: First 10TB/month FREE
- **Storage**: First 10GB FREE, then ~$0.0255/GB/month
- **Supabase**: FREE tier (500MB database, 1GB file storage)

**Estimated Total**: $0-5/month (mostly storage if you exceed free tier)

## Troubleshooting

### Cloud-Init Failed
```bash
ssh opc@<SERVER_IP>
tail -100 /var/log/cloud-init-sizzle.log
# Look for errors
```

### Application Won't Start
```bash
ssh opc@<SERVER_IP>
pm2 logs
# Check for missing dependencies or configuration errors
```

### Nginx Errors
```bash
sudo nginx -t  # Test configuration
sudo systemctl status nginx
sudo tail -100 /var/log/nginx/error.log
```

### Out of Memory
The E2.1.Micro has only 1GB RAM. If applications crash:
```bash
pm2 restart all
# Consider upgrading to E2.1 (1 OCPU, more RAM)
```

## Updating Infrastructure

To modify the infrastructure:

1. Edit the `.tf` files
2. Run `terraform plan` to preview changes
3. Run `terraform apply` to apply changes

## Backup & Recovery

### Database
Supabase handles database backups automatically.

### Object Storage
OCI Object Storage has versioning enabled. Previous versions of images are kept.

### Configuration
Keep your `terraform.tfvars` backed up securely (encrypted!)

## Support

For issues:
1. Check cloud-init logs: `/var/log/cloud-init-sizzle.log`
2. Check application logs: `pm2 logs`
3. Check nginx logs: `/var/log/nginx/`
4. Check terraform state: `terraform show`
