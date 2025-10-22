"""
Script to batch resize all existing images in OCI Object Storage to a standard size.
Run this once to standardize all existing images.
Downloads, resizes, saves locally, and re-uploads to OCI.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import requests
from database import supabase_client
from oci_storage import resize_image, upload_file_to_oci, STANDARD_IMAGE_SIZE
from utils import logger, format_oci_url
from pathlib import Path

def resize_all_images():
    """Resize all images in the database to standard size."""

    print(f"🎨 Starting batch image resize to {STANDARD_IMAGE_SIZE}...")

    # Create local directories for saving images
    base_dir = Path(__file__).parent.parent.parent / "static" / "images"
    ingredients_dir = base_dir / "ingredients_clean"
    equipment_dir = base_dir / "equipment_clean"

    ingredients_dir.mkdir(parents=True, exist_ok=True)
    equipment_dir.mkdir(parents=True, exist_ok=True)

    print(f"📁 Local save directories:")
    print(f"   Ingredients: {ingredients_dir}")
    print(f"   Equipment: {equipment_dir}")

    # Get all ingredients with images from generated_images table
    print("\n📦 Fetching ingredients...")
    ingredients_result = supabase_client.table("generated_images").select("id, name, url").eq("type", "ingredient").execute()
    ingredients = ingredients_result.data if ingredients_result.data else []
    print(f"Found {len(ingredients)} ingredients")

    # Get all equipment with images from generated_images table
    print("\n🔧 Fetching equipment...")
    equipment_result = supabase_client.table("generated_images").select("id, name, url").eq("type", "equipment").execute()
    equipment = equipment_result.data if equipment_result.data else []
    print(f"Found {len(equipment)} equipment")

    # Get all recipe steps with images
    print("\n📸 Fetching recipe step images...")
    steps_result = supabase_client.table("recipe_steps").select("id, recipe_id, step_number, image_url").execute()
    steps = steps_result.data if steps_result.data else []
    steps_with_images = [s for s in steps if s.get('image_url')]
    print(f"Found {len(steps_with_images)} recipe steps with images")

    total_images = len(ingredients) + len(equipment) + len(steps_with_images)
    processed = 0
    success = 0
    failed = 0
    skipped = 0

    print(f"\n🚀 Processing {total_images} total images...\n")

    # Process ingredients
    print("=" * 60)
    print("PROCESSING INGREDIENTS")
    print("=" * 60)
    for ing in ingredients:
        if not ing.get('url'):
            skipped += 1
            continue

        processed += 1
        print(f"\n[{processed}/{total_images}] Ingredient: {ing['name']}")

        try:
            # Convert to PAR URL for access
            accessible_url = format_oci_url(ing['url'])

            # Download image
            print(f"  Downloading from: {accessible_url[:80]}...")
            response = requests.get(accessible_url, timeout=30)
            response.raise_for_status()

            # Extract filename from URL or create sanitized name
            url_parts = ing['url'].split('/')
            filename = url_parts[-1] if url_parts else f"ingredient_{ing['id']}.png"

            # Sanitize filename for local save
            safe_name = ing['name'].lower().replace(' ', '_').replace('/', '_')
            local_filename = f"{safe_name}.png"
            local_path = ingredients_dir / local_filename

            print(f"  Resizing...")
            # Resize the image
            resized_content = resize_image(response.content, STANDARD_IMAGE_SIZE)

            # Save locally
            print(f"  Saving locally: {local_filename}")
            with open(local_path, 'wb') as f:
                f.write(resized_content)

            # Upload to OCI
            print(f"  Uploading to OCI...")
            new_url = upload_file_to_oci(
                file_content=resized_content,
                filename=filename,
                content_type="image/png",
                resize=False  # Already resized
            )

            if new_url:
                print(f"  ✅ Success! Saved and uploaded")
                success += 1
            else:
                print(f"  ⚠️  Saved locally but OCI upload failed")
                failed += 1

        except Exception as e:
            print(f"  ❌ Error: {str(e)}")
            failed += 1

    # Process equipment
    print("\n" + "=" * 60)
    print("PROCESSING EQUIPMENT")
    print("=" * 60)
    for eq in equipment:
        if not eq.get('url'):
            skipped += 1
            continue

        processed += 1
        print(f"\n[{processed}/{total_images}] Equipment: {eq['name']}")

        try:
            # Convert to PAR URL for access
            accessible_url = format_oci_url(eq['url'])

            # Download image
            print(f"  Downloading from: {accessible_url[:80]}...")
            response = requests.get(accessible_url, timeout=30)
            response.raise_for_status()

            # Extract filename from URL or create sanitized name
            url_parts = eq['url'].split('/')
            filename = url_parts[-1] if url_parts else f"equipment_{eq['id']}.png"

            # Sanitize filename for local save
            safe_name = eq['name'].lower().replace(' ', '_').replace('/', '_')
            local_filename = f"{safe_name}.png"
            local_path = equipment_dir / local_filename

            print(f"  Resizing...")
            # Resize the image
            resized_content = resize_image(response.content, STANDARD_IMAGE_SIZE)

            # Save locally
            print(f"  Saving locally: {local_filename}")
            with open(local_path, 'wb') as f:
                f.write(resized_content)

            # Upload to OCI
            print(f"  Uploading to OCI...")
            new_url = upload_file_to_oci(
                file_content=resized_content,
                filename=filename,
                content_type="image/png",
                resize=False  # Already resized
            )

            if new_url:
                print(f"  ✅ Success! Saved and uploaded")
                success += 1
            else:
                print(f"  ⚠️  Saved locally but OCI upload failed")
                failed += 1

        except Exception as e:
            print(f"  ❌ Error: {str(e)}")
            failed += 1

    # Process recipe step images
    print("\n" + "=" * 60)
    print("PROCESSING RECIPE STEP IMAGES")
    print("=" * 60)
    for step in steps_with_images:
        processed += 1
        print(f"\n[{processed}/{total_images}] Recipe {step['recipe_id']}, Step {step['step_number']}")

        try:
            # Convert to PAR URL for access
            accessible_url = format_oci_url(step['image_url'])

            # Download image
            print(f"  Downloading from: {accessible_url[:80]}...")
            response = requests.get(accessible_url, timeout=30)
            response.raise_for_status()

            # Extract filename from URL or create one
            url_parts = step['image_url'].split('/')
            filename = url_parts[-1] if url_parts else f"recipe_steps/recipe_{step['recipe_id']}_step_{step['step_number']}.png"

            print(f"  Resizing...")
            # Resize the image
            resized_content = resize_image(response.content, STANDARD_IMAGE_SIZE)

            # Upload to OCI (no local save for recipe steps)
            print(f"  Uploading to OCI...")
            new_url = upload_file_to_oci(
                file_content=resized_content,
                filename=filename,
                content_type="image/png",
                resize=False  # Already resized
            )

            if new_url:
                print(f"  ✅ Success! Uploaded")
                success += 1
            else:
                print(f"  ❌ Upload failed")
                failed += 1

        except Exception as e:
            print(f"  ❌ Error: {str(e)}")
            failed += 1

    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total images: {total_images}")
    print(f"✅ Successfully resized: {success}")
    print(f"❌ Failed: {failed}")
    print(f"⏭️  Skipped (no URL): {skipped}")
    print("=" * 60)

    if success > 0:
        print(f"\n🎉 All images have been resized to {STANDARD_IMAGE_SIZE}!")
        print(f"\n📁 Local images saved to:")
        print(f"   {ingredients_dir}")
        print(f"   {equipment_dir}")
        print("\n☁️  All resized images uploaded to OCI")
        print("   New images uploaded going forward will automatically be resized.")

    return success, failed, skipped


if __name__ == "__main__":
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║         OCI Image Batch Resize Utility                  ║
    ║                                                          ║
    ║  This will resize ALL existing images to 512x512        ║
    ║  - Crops transparent padding first                      ║
    ║  - Resizes actual content to fit                        ║
    ║  - Centers with transparent padding                     ║
    ║  - Preserves transparency                               ║
    ║                                                          ║
    ║  Images will be saved to:                               ║
    ║  - static/images/ingredients_clean/                     ║
    ║  - static/images/equipment_clean/                       ║
    ║                                                          ║
    ║  WARNING: This will re-upload images to OCI             ║
    ╚══════════════════════════════════════════════════════════╝
    """)

    response = input("\nDo you want to continue? (yes/no): ")
    if response.lower() != 'yes':
        print("Cancelled.")
        sys.exit(0)

    resize_all_images()
