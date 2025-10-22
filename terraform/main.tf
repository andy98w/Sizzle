terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

# Variables
variable "tenancy_ocid" {
  description = "OCID of the OCI tenancy"
  type        = string
  sensitive   = true
}

variable "user_ocid" {
  description = "OCID of the OCI user"
  type        = string
  sensitive   = true
}

variable "fingerprint" {
  description = "Fingerprint of the OCI API key"
  type        = string
  sensitive   = true
}

variable "private_key_path" {
  description = "Path to the OCI private key"
  type        = string
}

variable "compartment_id" {
  description = "OCID of the compartment where resources will be created"
  type        = string
}

variable "vcn_cidr_block" {
  description = "CIDR block for the VCN"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_cidr_block" {
  description = "CIDR block for the subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "region" {
  description = "OCI region"
  type        = string
  default     = "ca-toronto-1"
}

variable "ssh_public_key_path" {
  description = "Path to the SSH public key for instance access"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "admin_ip_cidr" {
  description = "CIDR block for admin SSH access (your public IP)"
  type        = string
  default     = "160.34.113.43/32"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  sensitive   = true
}

variable "supabase_key" {
  description = "Supabase service role key"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key for recipe generation"
  type        = string
  sensitive   = true
}

# Virtual Cloud Network
resource "oci_core_vcn" "sizzle_vcn" {
  compartment_id = var.compartment_id
  display_name   = "sizzle-vcn"
  cidr_block     = var.vcn_cidr_block
  dns_label      = "sizzlevcn"
}

# Subnet
resource "oci_core_subnet" "sizzle_subnet" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.sizzle_vcn.id
  display_name      = "sizzle-subnet"
  cidr_block        = var.subnet_cidr_block
  dns_label         = "sizzlesubnet"
  security_list_ids = [oci_core_security_list.sizzle_security_list.id]
  route_table_id    = oci_core_route_table.sizzle_route_table.id
}

# Internet Gateway
resource "oci_core_internet_gateway" "sizzle_internet_gateway" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.sizzle_vcn.id
  display_name   = "sizzle-internet-gateway"
  enabled        = true
}

# Route Table
resource "oci_core_route_table" "sizzle_route_table" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.sizzle_vcn.id
  display_name   = "sizzle-route-table"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.sizzle_internet_gateway.id
  }
}

# Security List
resource "oci_core_security_list" "sizzle_security_list" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.sizzle_vcn.id
  display_name   = "sizzle-security-list"

  # HTTP from anywhere
  ingress_security_rules {
    protocol    = "6" # TCP
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = false

    tcp_options {
      min = 80
      max = 80
    }

    description = "HTTP access from anywhere"
  }

  # HTTPS from anywhere
  ingress_security_rules {
    protocol    = "6" # TCP
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = false

    tcp_options {
      min = 443
      max = 443
    }

    description = "HTTPS access from anywhere"
  }

  # SSH from admin IP
  ingress_security_rules {
    protocol    = "6" # TCP
    source      = var.admin_ip_cidr
    source_type = "CIDR_BLOCK"
    stateless   = false

    tcp_options {
      min = 22
      max = 22
    }

    description = "SSH access from admin IP"
  }

  egress_security_rules {
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    protocol         = "all"
  }
}

data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_id
}

output "server_instructions" {
  value = <<EOF
Sizzle Infrastructure Created Successfully!

Server will be available at: http://${var.domain_name != "" ? var.domain_name : "PENDING"}

Next steps:
1. Wait for cloud-init to complete (~5 minutes)
2. Deploy backend and frontend (see DEPLOY.md on server)
3. Configure DNS to point to the server IP

EOF
  description = "Post-deployment instructions"
}
