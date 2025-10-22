resource "oci_core_instance" "sizzle_server" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_id
  display_name        = "sizzle-server"
  shape               = "VM.Standard.E2.1.Micro"  # Free tier

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.app_server_image.images[0].id
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.sizzle_subnet.id
    display_name     = "sizzle-server-vnic"
    assign_public_ip = true
    hostname_label   = "sizzle-server"
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data = base64encode(
      templatefile("${path.module}/scripts/cloud-init.tpl", {
        supabase_url    = var.supabase_url
        supabase_key    = var.supabase_key
        openai_api_key  = var.openai_api_key
        oci_namespace   = data.oci_objectstorage_namespace.user_namespace.namespace
        oci_bucket_name = oci_objectstorage_bucket.sizzle_images.name
        oci_par_url     = "https://objectstorage.${var.region}.oraclecloud.com${oci_objectstorage_preauthrequest.upload_preauth.access_uri}"
        domain_name     = var.domain_name
      })
    )
  }

  lifecycle {
    ignore_changes = [metadata["user_data"]]
  }
}

data "oci_core_images" "app_server_image" {
  compartment_id   = var.compartment_id
  operating_system = "Oracle Linux"
  sort_by          = "TIMECREATED"
  sort_order       = "DESC"
  state            = "AVAILABLE"
  shape            = "VM.Standard.E2.1.Micro"
}

output "server_public_ip" {
  value       = oci_core_instance.sizzle_server.public_ip
  description = "Public IP of the Sizzle application server"
}

output "ssh_command" {
  value       = "ssh opc@${oci_core_instance.sizzle_server.public_ip}"
  description = "SSH command to connect to the server"
}
