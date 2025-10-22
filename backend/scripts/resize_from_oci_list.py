"""
Script to resize all images by listing them directly from OCI Object Storage.
This bypasses the database and works with actual files in OCI.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import requests
from oci_storage import resize_image, upload_file_to_oci, STANDARD_IMAGE_SIZE, OCI_PAR_URL
from pathlib import Path

def list_oci_files():
    """List all files in OCI bucket by trying common patterns."""

    # Since we're using PAR (Pre-Authenticated Request), we can't list files directly
    # We need to try downloading based on known patterns or get a list another way

    print("Note: Using PAR doesn't allow listing files.")
    print("We need to either:")
    print("1. Get a list of files from somewhere else")
    print("2. Use OCI SDK with credentials to list files")
    print("3. Manually provide a list of files")

    return []


def resize_from_file_list(file_list_path: str = None):
    """Resize images from a provided file list."""

    if not file_list_path:
        print("Please provide a file containing list of image URLs, one per line")
        return

    base_dir = Path(__file__).parent.parent.parent / "static" / "images"
    ingredients_dir = base_dir / "ingredients_clean"
    equipment_dir = base_dir / "equipment_clean"

    ingredients_dir.mkdir(parents=True, exist_ok=True)
    equipment_dir.mkdir(parents=True, exist_ok=True)

    print(f"🎨 Starting batch image resize to {STANDARD_IMAGE_SIZE}...")
    print(f"📁 Local save directories:")
    print(f"   Ingredients: {ingredients_dir}")
    print(f"   Equipment: {equipment_dir}\n")

    # Read file list
    with open(file_list_path, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]

    print(f"Found {len(urls)} URLs to process\n")

    success = 0
    failed = 0

    for idx, url in enumerate(urls, 1):
        print(f"[{idx}/{len(urls)}] Processing: {url[:80]}...")

        try:
            # Determine if ingredient or equipment based on URL
            is_ingredient = 'ingredient' in url.lower() or '/ingredients/' in url
            is_equipment = 'equipment' in url.lower() or '/equipment/' in url

            # Download
            response = requests.get(url, timeout=30)
            response.raise_for_status()

            # Extract filename
            filename = url.split('/')[-1]
            safe_name = filename.replace('.png', '').lower().replace(' ', '_').replace('/', '_')
            local_filename = f"{safe_name}.png"

            # Determine save directory
            if is_ingredient:
                local_path = ingredients_dir / local_filename
            elif is_equipment:
                local_path = equipment_dir / local_filename
            else:
                # Default to ingredients
                local_path = ingredients_dir / local_filename

            # Resize
            resized_content = resize_image(response.content, STANDARD_IMAGE_SIZE)

            # Save locally
            with open(local_path, 'wb') as f:
                f.write(resized_content)

            # Upload to OCI
            new_url = upload_file_to_oci(
                file_content=resized_content,
                filename=filename,
                content_type="image/png",
                resize=False
            )

            if new_url:
                print(f"  ✅ Success!\n")
                success += 1
            else:
                print(f"  ⚠️  Saved locally but upload failed\n")
                failed += 1

        except Exception as e:
            print(f"  ❌ Error: {str(e)}\n")
            failed += 1

    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total: {len(urls)}")
    print(f"✅ Success: {success}")
    print(f"❌ Failed: {failed}")
    print("=" * 60)


if __name__ == "__main__":
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║      Resize Images from OCI File List                   ║
    ║                                                          ║
    ║  This script needs a text file with one URL per line    ║
    ║                                                          ║
    ║  Usage: python resize_from_oci_list.py urls.txt         ║
    ╚══════════════════════════════════════════════════════════╝
    """)

    if len(sys.argv) < 2:
        print("❌ Error: Please provide a file containing URLs")
        print("\nExample:")
        print("  python resize_from_oci_list.py my_image_urls.txt")
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"❌ Error: File not found: {file_path}")
        sys.exit(1)

    resize_from_file_list(file_path)
