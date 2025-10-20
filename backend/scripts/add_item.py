#!/usr/bin/env python3
"""
Script to add ingredients or equipment with images to the database.

Usage:
    python add_item.py ingredient "Rice" ingredients_clean/rice.jpg
    python add_item.py equipment "Rice Cooker" equipment_clean/rice_cooker.jpg
"""

import os
import sys
from pathlib import Path
import requests
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# OCI Configuration
OCI_PAR_URL = os.getenv('OCI_PAR_URL')

# Supabase Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Initialize clients
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def upload_to_oci(local_file_path: str, object_name: str) -> str:
    """Upload a file to OCI Object Storage using PAR URL and return the full URL."""
    print(f"📤 Uploading {local_file_path} to OCI as {object_name}...")

    # Construct the upload URL (PAR URL + object name)
    upload_url = OCI_PAR_URL + object_name

    # Read the file and upload
    with open(local_file_path, 'rb') as file:
        response = requests.put(upload_url, data=file)

        if response.status_code not in [200, 201]:
            raise Exception(f"Upload failed with status {response.status_code}: {response.text}")

    print(f"✅ Uploaded to OCI successfully")

    # Return the URL for accessing the object
    return upload_url


def add_to_database(item_type: str, name: str, url: str, category: str = None) -> dict:
    """Add an ingredient or equipment to the Supabase database."""
    print(f"💾 Adding {item_type} '{name}' to database...")

    # All items go into the 'generated_images' table with a 'type' field
    data = {
        'name': name,
        'type': item_type,
        'url': url
    }

    result = supabase.table('generated_images').insert(data).execute()

    print(f"✅ Added to database with ID: {result.data[0]['id']}")

    return result.data[0]


def main():
    if len(sys.argv) < 4:
        print("Usage: python add_item.py <type> <name> <image_path> [category]")
        print()
        print("Arguments:")
        print("  type        : 'ingredient' or 'equipment'")
        print("  name        : Name of the item (e.g., 'Rice', 'Rice Cooker')")
        print("  image_path  : Path to the image file (e.g., 'ingredients_clean/rice.jpg')")
        print("  category    : (Optional) Category for ingredients (e.g., 'grain', 'vegetable')")
        print()
        print("Examples:")
        print("  python add_item.py ingredient 'Japanese Short-Grain Rice' ingredients_clean/rice.jpg grain")
        print("  python add_item.py equipment 'Rice Cooker' equipment_clean/rice_cooker.jpg")
        sys.exit(1)

    item_type = sys.argv[1].lower()
    name = sys.argv[2]
    image_path = sys.argv[3]
    category = sys.argv[4] if len(sys.argv) > 4 else None

    # Validate type
    if item_type not in ['ingredient', 'equipment']:
        print(f"❌ Error: Type must be 'ingredient' or 'equipment', got '{item_type}'")
        sys.exit(1)

    # Validate file exists
    if not os.path.exists(image_path):
        print(f"❌ Error: Image file not found: {image_path}")
        sys.exit(1)

    # Get file extension
    file_ext = Path(image_path).suffix

    # Create object name (sanitize the name for use as filename)
    sanitized_name = name.lower().replace(' ', '_').replace('-', '_')
    object_name = f"{sanitized_name}{file_ext}"

    print(f"\n{'='*60}")
    print(f"Adding {item_type}: {name}")
    print(f"Image: {image_path}")
    print(f"Object name: {object_name}")
    if category:
        print(f"Category: {category}")
    print(f"{'='*60}\n")

    try:
        # Upload to OCI
        url = upload_to_oci(image_path, object_name)
        print(f"📍 URL: {url}\n")

        # Add to database
        result = add_to_database(item_type, name, url, category)

        print(f"\n{'='*60}")
        print(f"✨ Success! Added {item_type} '{name}'")
        print(f"   ID: {result['id']}")
        print(f"   URL: {url}")
        print(f"{'='*60}\n")

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
