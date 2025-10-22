# Sizzle Deployment Guide

## Quick Start

### Step 1: Prepare Credentials

You need to gather:

1. **Your OCI Credentials** (from `~/.oci/config`)
   ```bash
   cat ~/.oci/config
   ```
   Note down:
   - `tenancy` (tenancy_ocid)
   - `user` (user_ocid)
   - `fingerprint`
   - `key_file` path
   - `region`

2. **Your Compartment ID**
   - Go to: https://cloud.oracle.com/identity/compartments
   - Copy the OCID of your compartment

3. **Your Public IP**
   ```bash
   curl https://ifconfig.me
   ```

4. **Your Supabase Credentials**
   - Project URL: https://app.supabase.com/project/YOUR-PROJECT/settings/api
   - Service Role Key (secret!)

5. **Your OpenAI API Key**
   - From: https://platform.openai.com/api-keys

### Step 2: Create terraform.tfvars

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
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
admin_ip_cidr       = "123.456.789.0/32"  # Your IP from ifconfig.me

# Application
domain_name = ""  # Optional: leave empty for now

# Supabase
supabase_url = "https://qfekzirldnundznyrwfz.supabase.co"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# OpenAI
openai_api_key = "sk-..."
```

### Step 3: Deploy Infrastructure

```bash
cd terraform

# Initialize Terraform
terraform init

# Preview what will be created
terraform plan

# Create infrastructure (~5 minutes)
terraform apply
```

Type `yes` when prompted.

**Terraform will output:**
- Server public IP
- SSH command
- PAR URL (keep this secret!)

### Step 4: Wait for Server Setup

The server needs ~5-10 minutes to install everything.

```bash
# Get the server IP from terraform output
terraform output server_public_ip

# SSH to server
ssh opc@<SERVER_IP>

# Watch cloud-init progress
tail -f /var/log/cloud-init-sizzle.log

# Wait for: "=== Sizzle Setup Complete ==="
```

### Step 5: Deploy Backend

```bash
# From your local machine, in the Sizzle directory
cd /Users/andywu/Sizzle

# Deploy backend (replace with your server IP)
./scripts/deploy-backend.sh <SERVER_IP>

# Example:
./scripts/deploy-backend.sh 123.456.789.0
```

This will:
- Upload all Python files
- Install dependencies
- Start the backend with PM2

### Step 6: Deploy Frontend

```bash
# From your local machine
./scripts/deploy-frontend.sh <SERVER_IP>

# Example:
./scripts/deploy-frontend.sh 123.456.789.0
```

This will:
- Build the Next.js app
- Upload the build
- Install dependencies
- Start the frontend with PM2

### Step 7: Access Your App

```bash
# Get your server IP
cd terraform
terraform output server_public_ip
```

Open in browser:
- **Frontend:** http://<SERVER_IP>
- **Backend API:** http://<SERVER_IP>/api
- **Health Check:** http://<SERVER_IP>/health

## Subsequent Deployments

After initial setup, deploying updates is simple:

```bash
# Update backend
./scripts/deploy-backend.sh <SERVER_IP>

# Update frontend
./scripts/deploy-frontend.sh <SERVER_IP>

# Or both
./scripts/deploy-backend.sh <SERVER_IP> && ./scripts/deploy-frontend.sh <SERVER_IP>
```

## Useful Commands

### On Server

```bash
# SSH to server
ssh opc@<SERVER_IP>

# Check status
pm2 status

# View logs
pm2 logs

# Restart services
pm2 restart all

# Monitor resources
pm2 monit
htop
```

### Terraform

```bash
cd terraform

# View current infrastructure
terraform show

# View outputs (including PAR URL)
terraform output

# View sensitive outputs
terraform output par_url

# Update infrastructure
terraform apply

# Destroy everything
terraform destroy
```

## Troubleshooting

### Cloud-Init Still Running
```bash
ssh opc@<SERVER_IP>
tail -f /var/log/cloud-init-sizzle.log
# Wait for completion
```

### Backend Won't Start
```bash
ssh opc@<SERVER_IP>
pm2 logs sizzle-backend
# Check for errors
```

### Frontend Won't Start
```bash
ssh opc@<SERVER_IP>
pm2 logs sizzle-frontend
# Check for errors
```

### Can't Connect
```bash
# Check if server is running
ping <SERVER_IP>

# Check if services are running
ssh opc@<SERVER_IP> "pm2 status"

# Check nginx
ssh opc@<SERVER_IP> "sudo systemctl status nginx"
```

## Security Notes

- **NEVER commit `terraform.tfvars`** - it contains secrets!
- The PAR URL from terraform output is sensitive - don't share it
- SSH is only allowed from your IP (`admin_ip_cidr`)
- Keep your Supabase and OpenAI keys secure

## Cost Estimate

- **Compute:** FREE (E2.1.Micro free tier)
- **Network:** First 10TB/month FREE
- **Object Storage:** First 10GB FREE, then ~$0.0255/GB/month
- **Supabase:** FREE tier (500MB database)

**Total:** ~$0-5/month

## Next Steps

After deployment:
1. Test all features on http://<SERVER_IP>
2. (Optional) Set up a domain name
3. (Optional) Configure SSL with Let's Encrypt
4. Monitor with `pm2 monit`
