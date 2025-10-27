#!/usr/bin/env python3
"""
Script to upload composition images from static/images/comp/ to OCI storage
and update the equipment table with composition_url.

Usage: python upload_comp_images.py
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from pathlib import Path
from database import supabase_client
from oci_storage import upload_file_to_oci
from utils import logger

def upload_composition_images():
    """Upload all composition images from comp folder to OCI and update equipment table."""

    # Get the comp folder path
    comp_folder = Path(__file__).parent.parent / "static" / "images" / "comp"

    if not comp_folder.exists():
        print(f"❌ Error: Composition folder not found at {comp_folder}")
        return False

    # Get all image files in comp folder
    image_files = list(comp_folder.glob("*.jpg")) + list(comp_folder.glob("*.png")) + list(comp_folder.glob("*.jpeg"))

    if not image_files:
        print(f"❌ Error: No images found in {comp_folder}")
        return False

    print(f"🎨 Found {len(image_files)} composition images:")
    print(f"📁 Source folder: {comp_folder}")
    print()

    # Display available images
    for idx, img in enumerate(sorted(image_files), 1):
        print(f"  {idx}. {img.name}")

    print()
    print("Enter equipment names to upload (comma-separated), or 'all' for all images:")
    print("Examples: 'bowl, skillet' or 'all'")
    user_input = input("> ").strip()

    if user_input.lower() == 'all':
        selected_files = image_files
    else:
        # Parse user input
        selected_names = [name.strip().lower() for name in user_input.split(',')]
        selected_files = []
        for name in selected_names:
            # Find matching file
            found = False
            for img_file in image_files:
                if name in img_file.stem.lower():
                    selected_files.append(img_file)
                    found = True
                    break
            if not found:
                print(f"⚠️  Warning: No image found matching '{name}'")

        if not selected_files:
            print("❌ No valid images selected")
            return False

    print(f"\n📤 Will upload {len(selected_files)} image(s)")
    print()

    success = 0
    failed = 0
    skipped = 0

    for image_path in sorted(selected_files):
        filename = image_path.name
        # Remove _comp suffix and extension to get equipment name
        # e.g., "bowl_comp.jpg" -> "bowl", "skillet.jpg" -> "skillet"
        equipment_name = filename.replace('_comp', '').rsplit('.', 1)[0]

        print(f"{'='*60}")
        print(f"Processing: {filename}")
        print(f"Equipment name: {equipment_name}")
        print(f"{'='*60}")

        try:
            # Check if equipment exists in database
            eq_result = supabase_client.table("equipment").select("id, name").ilike("name", f"%{equipment_name}%").limit(1).execute()

            if not eq_result.data or len(eq_result.data) == 0:
                print(f"⚠️  Warning: Equipment '{equipment_name}' not found in database, skipping")
                skipped += 1
                print()
                continue

            equipment_id = eq_result.data[0]['id']
            equipment_full_name = eq_result.data[0]['name']
            print(f"✓ Found equipment: {equipment_full_name} (ID: {equipment_id})")

            # Read the image file
            with open(image_path, 'rb') as f:
                image_content = f.read()

            file_size_mb = len(image_content) / (1024 * 1024)
            print(f"📦 File size: {file_size_mb:.2f} MB")

            # Determine content type
            ext = image_path.suffix.lower()
            content_type = "image/jpeg" if ext in ['.jpg', '.jpeg'] else "image/png"

            # Upload to OCI in comp folder
            oci_filename = f"comp/{filename}"
            print(f"☁️  Uploading to OCI: {oci_filename}")

            oci_url = upload_file_to_oci(
                file_content=image_content,
                filename=oci_filename,
                content_type=content_type,
                resize=False  # Don't resize composition images
            )

            if not oci_url:
                print(f"❌ Failed to upload to OCI")
                failed += 1
                print()
                continue

            print(f"✓ Uploaded: {oci_url[:80]}...")

            # Update equipment table with composition_url
            print(f"💾 Updating equipment table...")
            update_result = supabase_client.table("equipment").update({
                "composition_url": oci_url
            }).eq("id", equipment_id).execute()

            if update_result.data:
                print(f"✅ Success! Updated {equipment_full_name} with composition URL")
                success += 1
            else:
                print(f"⚠️  Warning: Upload succeeded but database update failed")
                failed += 1

        except Exception as e:
            print(f"❌ Error processing {filename}: {str(e)}")
            import traceback
            traceback.print_exc()
            failed += 1

        print()

    # Print summary
    print(f"{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"Total images processed: {len(selected_files)}")
    print(f"✅ Successfully uploaded and updated: {success}")
    print(f"❌ Failed: {failed}")
    print(f"⏭️  Skipped (not in database): {skipped}")
    print(f"{'='*60}")

    if success > 0:
        print(f"\n🎉 Composition images uploaded successfully!")
        print(f"☁️  Images stored in OCI under: comp/")
        print(f"📝 Equipment table updated with composition URLs")
        print(f"\n✨ Recipe step generation will now use these images as references")

    return success > 0


if __name__ == '__main__':
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║       Composition Image Upload Utility                  ║
    ║                                                          ║
    ║  This will:                                              ║
    ║  1. Upload images from static/images/comp/ to OCI        ║
    ║  2. Store them in the 'comp/' folder in OCI              ║
    ║  3. Update equipment table with composition_url          ║
    ║                                                          ║
    ║  Images will be used as references for recipe steps      ║
    ║  to ensure consistent equipment appearance.              ║
    ╚══════════════════════════════════════════════════════════╝
    """)

    success = upload_composition_images()
    sys.exit(0 if success else 1)
