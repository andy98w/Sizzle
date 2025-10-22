"""
Quick test script to demonstrate image resizing functionality.
Downloads one image, resizes it, and shows the results.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import requests
from database import supabase_client
from oci_storage import resize_image, STANDARD_IMAGE_SIZE
from PIL import Image
from io import BytesIO

def test_resize():
    """Test the resize function on a real image from the database."""

    print("🧪 Testing Image Resize Functionality\n")
    print("=" * 60)

    # Get one ingredient image to test
    print("Fetching a sample ingredient from database...")
    result = supabase_client.table("ingredients").select("id, name, url").limit(1).execute()

    if not result.data or len(result.data) == 0:
        print("❌ No ingredients found in database")
        return

    ingredient = result.data[0]
    print(f"✅ Found: {ingredient['name']}")

    if not ingredient.get('url'):
        print("❌ This ingredient has no image URL")
        return

    print(f"📥 Downloading from: {ingredient['url']}\n")

    try:
        # Download the image
        response = requests.get(ingredient['url'], timeout=30)
        response.raise_for_status()
        original_bytes = response.content

        # Get original image info
        original_img = Image.open(BytesIO(original_bytes))
        print("ORIGINAL IMAGE:")
        print(f"  Size: {original_img.size[0]}x{original_img.size[1]}")
        print(f"  Mode: {original_img.mode}")
        print(f"  Format: {original_img.format}")
        print(f"  File size: {len(original_bytes):,} bytes")

        # Test resize function
        print(f"\n🔄 Resizing to {STANDARD_IMAGE_SIZE}...")
        resized_bytes = resize_image(original_bytes, STANDARD_IMAGE_SIZE)

        # Get resized image info
        resized_img = Image.open(BytesIO(resized_bytes))
        print("\nRESIZED IMAGE:")
        print(f"  Size: {resized_img.size[0]}x{resized_img.size[1]}")
        print(f"  Mode: {resized_img.mode}")
        print(f"  File size: {len(resized_bytes):,} bytes")

        # Calculate savings
        size_reduction = ((len(original_bytes) - len(resized_bytes)) / len(original_bytes)) * 100
        print(f"\n💾 File size reduced by: {size_reduction:.1f}%")

        # Save sample outputs for visual inspection
        output_dir = "test_resize_output"
        os.makedirs(output_dir, exist_ok=True)

        original_path = os.path.join(output_dir, "original.png")
        resized_path = os.path.join(output_dir, "resized.png")

        original_img.save(original_path)
        resized_img.save(resized_path)

        print(f"\n📁 Sample images saved to:")
        print(f"  Original: {original_path}")
        print(f"  Resized:  {resized_path}")

        print("\n" + "=" * 60)
        print("✅ Test completed successfully!")
        print("=" * 60)

        print(f"\n💡 The resize function:")
        print(f"   1. Cropped transparent padding")
        print(f"   2. Resized to fit within {STANDARD_IMAGE_SIZE}")
        print(f"   3. Centered on transparent background")
        print(f"   4. Maintained transparency (RGBA mode)")

    except Exception as e:
        print(f"\n❌ Error during test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_resize()
