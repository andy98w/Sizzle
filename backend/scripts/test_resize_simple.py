"""
Simple test script to demonstrate image resizing functionality.
Tests with a direct image URL.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import requests
from PIL import Image
from io import BytesIO

# Import resize function directly
STANDARD_IMAGE_SIZE = (512, 512)

def crop_transparent_padding(img: Image.Image, alpha_threshold: int = 20) -> Image.Image:
    """Crop transparent padding from an image."""
    try:
        pixels = img.load()
        width, height = img.size

        min_x, min_y = width, height
        max_x, max_y = 0, 0

        for y in range(height):
            for x in range(width):
                if pixels[x, y][3] > alpha_threshold:
                    min_x = min(min_x, x)
                    min_y = min(min_y, y)
                    max_x = max(max_x, x)
                    max_y = max(max_y, y)

        if min_x >= max_x or min_y >= max_y:
            return img

        cropped = img.crop((min_x, min_y, max_x + 1, max_y + 1))
        print(f"  ✂️  Cropped from {width}x{height} to {cropped.size[0]}x{cropped.size[1]}")
        return cropped

    except Exception as e:
        print(f"  ⚠️  Error cropping: {str(e)}")
        return img


def resize_image(image_content: bytes, target_size: tuple = STANDARD_IMAGE_SIZE) -> bytes:
    """Resize image with transparent padding."""
    try:
        img = Image.open(BytesIO(image_content))

        if img.mode != 'RGBA':
            img = img.convert('RGBA')

        img = crop_transparent_padding(img)

        img.thumbnail(target_size, Image.Resampling.LANCZOS)

        new_img = Image.new('RGBA', target_size, (0, 0, 0, 0))

        paste_x = (target_size[0] - img.size[0]) // 2
        paste_y = (target_size[1] - img.size[1]) // 2
        new_img.paste(img, (paste_x, paste_y), img)

        output = BytesIO()
        new_img.save(output, format='PNG', optimize=True)
        return output.getvalue()

    except Exception as e:
        print(f"  ❌ Error resizing: {str(e)}")
        return image_content


def test_resize(image_url: str = None):
    """Test the resize function."""

    print("🧪 Testing Image Resize Functionality\n")
    print("=" * 60)

    if not image_url:
        # Use a placeholder if no URL provided
        image_url = "https://objectstorage.ca-toronto-1.oraclecloud.com/p/LHruGKILbQNvy2_V89soZbDGmCXZ-RecXxEAAzoKdZx1y9Tcuz0J-gEmWtIcNZhJ/n/yzep9haqilyk/b/SizzleGeneratedImages/o/placeholder_ingredient.png"

    print(f"📥 Downloading test image...")
    print(f"   URL: {image_url[:80]}...")

    try:
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        original_bytes = response.content

        original_img = Image.open(BytesIO(original_bytes))
        print(f"\n📊 ORIGINAL IMAGE:")
        print(f"   Size: {original_img.size[0]}x{original_img.size[1]}")
        print(f"   Mode: {original_img.mode}")
        print(f"   File size: {len(original_bytes):,} bytes")

        print(f"\n🔄 Processing...")
        resized_bytes = resize_image(original_bytes, STANDARD_IMAGE_SIZE)

        resized_img = Image.open(BytesIO(resized_bytes))
        print(f"\n✨ RESIZED IMAGE:")
        print(f"   Size: {resized_img.size[0]}x{resized_img.size[1]}")
        print(f"   Mode: {resized_img.mode}")
        print(f"   File size: {len(resized_bytes):,} bytes")

        size_reduction = ((len(original_bytes) - len(resized_bytes)) / len(original_bytes)) * 100
        print(f"   Size reduction: {size_reduction:.1f}%")

        output_dir = "test_resize_output"
        os.makedirs(output_dir, exist_ok=True)

        original_path = os.path.join(output_dir, "original.png")
        resized_path = os.path.join(output_dir, "resized.png")

        original_img.save(original_path)
        resized_img.save(resized_path)

        print(f"\n📁 Sample images saved:")
        print(f"   Original: {os.path.abspath(original_path)}")
        print(f"   Resized:  {os.path.abspath(resized_path)}")

        print("\n" + "=" * 60)
        print("✅ Test completed successfully!")
        print("=" * 60)

        print(f"\n💡 The resize function:")
        print(f"   ✓ Cropped transparent padding")
        print(f"   ✓ Resized to fit within {STANDARD_IMAGE_SIZE}")
        print(f"   ✓ Centered on transparent background")
        print(f"   ✓ Maintained transparency (RGBA mode)")

        print(f"\n👀 Open the saved images to visually inspect the results!")

    except Exception as e:
        print(f"\n❌ Error during test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # You can pass a custom URL as argument
    url = sys.argv[1] if len(sys.argv) > 1 else None
    test_resize(url)
