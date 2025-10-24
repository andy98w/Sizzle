#!/usr/bin/env python3
"""
Script to resize a specific image by name.
Usage: python resize_image.py "Image Name"
Example: python resize_image.py "Eggs"
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import requests
from database import supabase_client
from oci_storage import resize_image, upload_file_to_oci, STANDARD_IMAGE_SIZE
from utils import logger, format_oci_url

def resize_single_image(name: str):
    """Resize a single image by name."""
    
    print(f"\n{'='*60}")
    print(f"Resizing: {name}")
    print(f"Target size: {STANDARD_IMAGE_SIZE}")
    print(f"{'='*60}\n")
    
    try:
        # Try to find in generated_images table (ingredient or equipment)
        result = supabase_client.table("generated_images").select("id, name, url, type").ilike("name", name).limit(1).execute()
        
        if not result.data or len(result.data) == 0:
            print(f"❌ Error: '{name}' not found in database")
            return False
        
        item = result.data[0]
        item_type = item.get('type', 'unknown')
        
        if not item.get('url'):
            print(f"❌ Error: No URL found for '{name}'")
            return False
        
        print(f"📋 Type: {item_type}")
        print(f"🔗 Current URL: {item['url'][:80]}...")
        
        # Convert to accessible URL
        accessible_url = format_oci_url(item['url'])
        
        # Download image
        print(f"\n📥 Downloading...")
        response = requests.get(accessible_url, timeout=30)
        response.raise_for_status()
        
        # Extract filename from URL
        url_parts = item['url'].split('/')
        filename = url_parts[-1] if url_parts else f"{name.lower().replace(' ', '_')}.png"
        
        print(f"🔄 Resizing to {STANDARD_IMAGE_SIZE}...")
        # Resize the image
        resized_content = resize_image(response.content, STANDARD_IMAGE_SIZE)
        
        # Upload to OCI
        print(f"📤 Uploading to OCI as {filename}...")
        new_url = upload_file_to_oci(
            file_content=resized_content,
            filename=filename,
            content_type="image/png",
            resize=False  # Already resized
        )
        
        if new_url:
            print(f"\n✅ Success! '{name}' resized and uploaded")
            print(f"🔗 New URL: {new_url}")
            return True
        else:
            print(f"\n❌ Upload failed")
            return False
            
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python resize_image.py <image_name>")
        print("\nExamples:")
        print("  python resize_image.py 'Eggs'")
        print("  python resize_image.py 'Black pepper'")
        print("  python resize_image.py 'Non-stick skillet'")
        sys.exit(1)
    
    image_name = sys.argv[1]
    success = resize_single_image(image_name)
    sys.exit(0 if success else 1)
