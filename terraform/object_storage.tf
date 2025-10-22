# Object Storage Bucket for recipe images
resource "oci_objectstorage_bucket" "sizzle_images" {
  compartment_id = var.compartment_id
  name           = "SizzleGeneratedImages"
  namespace      = data.oci_objectstorage_namespace.user_namespace.namespace

  access_type = "NoPublicAccess"  # Use PAR for controlled access
  versioning  = "Enabled"
}

# Get the ObjectStorage namespace
data "oci_objectstorage_namespace" "user_namespace" {
  compartment_id = var.compartment_id
}

# Create a pre-authenticated request for uploads and downloads
resource "oci_objectstorage_preauthrequest" "upload_preauth" {
  access_type  = "AnyObjectReadWrite"  # Allow read and write
  bucket       = oci_objectstorage_bucket.sizzle_images.name
  name         = "sizzle-readwrite-preauth"
  namespace    = data.oci_objectstorage_namespace.user_namespace.namespace
  time_expires = timeadd(timestamp(), "87600h")  # Valid for 10 years
}

# Output bucket information
output "object_storage_bucket" {
  value = {
    name      = oci_objectstorage_bucket.sizzle_images.name
    namespace = data.oci_objectstorage_namespace.user_namespace.namespace
    region    = var.region
  }
  description = "Object storage bucket details"
}

# Output pre-authenticated request URL
output "par_url" {
  value       = "https://objectstorage.${var.region}.oraclecloud.com${oci_objectstorage_preauthrequest.upload_preauth.access_uri}"
  sensitive   = true
  description = "Pre-authenticated request URL for uploads/downloads (keep secret!)"
}
