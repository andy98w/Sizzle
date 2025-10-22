"""Oracle Cloud Infrastructure (OCI) Object Storage integration module."""

import mimetypes
from typing import Tuple
from pathlib import Path
import requests
from io import BytesIO
from PIL import Image

mimetypes.init()

# Standard image size for all uploads
STANDARD_IMAGE_SIZE = (512, 512)

OCI_AVAILABLE = False

try:
    import oci
    from oci.config import from_file
    OCI_AVAILABLE = True
except ImportError:
    OCI_AVAILABLE = False

from config import OCI_BUCKET_NAME, OCI_NAMESPACE, STATIC_DIR, OCI_PAR_URL
from utils import logger, log_exception, format_oci_url

class OCIObjectStorage:
    """Class to handle Oracle Cloud Infrastructure Object Storage operations."""

    def __init__(self):
        """Initialize the OCIObjectStorage instance."""
        self.client = None
        self.namespace = OCI_NAMESPACE
        self.bucket_name = OCI_BUCKET_NAME
        self.configured = False
        self.par_configured = bool(OCI_PAR_URL)

        if OCI_AVAILABLE:
            self._try_initialize()

    def _try_initialize(self) -> bool:
        """Try to initialize the OCI Object Storage client."""
        try:
            self.configured = self.par_configured
            if self.configured:
                logger.info(f"OCI Object Storage PAR configured for bucket: {self.bucket_name}")
            else:
                logger.warning("OCI Object Storage PAR not configured")
            return self.configured
        except Exception as e:
            log_exception(e, "Failed to initialize OCI Object Storage")
            self.configured = False
            return False
    
    def upload_file(self, file_path: str, object_name: str = None) -> Tuple[bool, str]:
        """Upload a file to OCI Object Storage using PAR URL."""
        if not self.par_configured:
            return False, "OCI PAR not configured"

        try:
            file_path = Path(file_path)
            if not file_path.exists():
                return False, f"File not found: {file_path}"

            if not object_name:
                object_name = file_path.name

            content_type, _ = mimetypes.guess_type(str(file_path))
            if not content_type:
                content_type = 'application/octet-stream'

            with open(file_path, 'rb') as f:
                par_upload_url = f"{OCI_PAR_URL.rstrip('/')}/{object_name}"
                response = requests.put(par_upload_url, data=f, headers={'Content-Type': content_type})

                if response.status_code in (200, 201):
                    logger.info(f"File uploaded successfully: {object_name}")
                    return True, object_name
                else:
                    error_msg = f"Failed to upload file. Status: {response.status_code}, Response: {response.text}"
                    logger.error(error_msg)
                    return False, error_msg

        except Exception as e:
            error_msg = f"Error uploading file: {str(e)}"
            log_exception(e, error_msg)
            return False, error_msg

    def get_object_url(self, object_name: str) -> str:
        """Get a URL for an object using the PAR."""
        if not self.par_configured:
            return ""
        object_name = object_name.lstrip('/')
        return f"{OCI_PAR_URL.rstrip('/')}/{object_name}"

    def object_exists(self, object_name: str) -> bool:
        """Check if an object exists in the bucket."""
        if not self.par_configured:
            return False

        try:
            object_name = object_name.lstrip('/')
            url = f"{OCI_PAR_URL.rstrip('/')}/{object_name}"
            response = requests.head(url)
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Error checking if object exists: {str(e)}")
            return False


def crop_transparent_padding(img: Image.Image, alpha_threshold: int = 20) -> Image.Image:
    """
    Crop transparent padding from an image to get tight bounds around visible content.

    Args:
        img: PIL Image in RGBA mode
        alpha_threshold: Minimum alpha value to consider as visible (0-255)

    Returns:
        Cropped PIL Image
    """
    try:
        # Get image data
        pixels = img.load()
        width, height = img.size

        # Find bounds of non-transparent pixels
        min_x, min_y = width, height
        max_x, max_y = 0, 0

        for y in range(height):
            for x in range(width):
                # Check alpha channel (4th value in RGBA)
                if pixels[x, y][3] > alpha_threshold:
                    min_x = min(min_x, x)
                    min_y = min(min_y, y)
                    max_x = max(max_x, x)
                    max_y = max(max_y, y)

        # If no visible pixels found, return original
        if min_x >= max_x or min_y >= max_y:
            return img

        # Crop to visible bounds
        cropped = img.crop((min_x, min_y, max_x + 1, max_y + 1))
        logger.info(f"Cropped from {width}x{height} to {cropped.size[0]}x{cropped.size[1]}")
        return cropped

    except Exception as e:
        logger.error(f"Error cropping transparent padding: {str(e)}")
        return img


def resize_image(image_content: bytes, target_size: Tuple[int, int] = STANDARD_IMAGE_SIZE) -> bytes:
    """
    Resize an image to a standard size while maintaining aspect ratio and transparency.
    Intelligently crops transparent padding before resizing.

    Args:
        image_content: The image content as bytes
        target_size: Target size (width, height)

    Returns:
        Resized image as bytes in PNG format with transparent background
    """
    try:
        img = Image.open(BytesIO(image_content))

        # Ensure image has alpha channel for transparency
        if img.mode != 'RGBA':
            img = img.convert('RGBA')

        # Crop transparent padding to get tight bounds around actual content
        img = crop_transparent_padding(img)

        # Resize with high-quality resampling, maintaining aspect ratio
        img.thumbnail(target_size, Image.Resampling.LANCZOS)

        # Create a new transparent image with the target size
        new_img = Image.new('RGBA', target_size, (0, 0, 0, 0))

        # Paste the resized image centered
        paste_x = (target_size[0] - img.size[0]) // 2
        paste_y = (target_size[1] - img.size[1]) // 2
        new_img.paste(img, (paste_x, paste_y), img)

        # Convert back to bytes
        output = BytesIO()
        new_img.save(output, format='PNG', optimize=True)
        return output.getvalue()

    except Exception as e:
        logger.error(f"Error resizing image: {str(e)}")
        return image_content


def upload_file_to_oci(file_content: bytes, filename: str, content_type: str = "image/png", resize: bool = True) -> str:
    """
    Upload file content (bytes) to OCI Object Storage.

    Args:
        file_content: The file content as bytes
        filename: The filename to use in OCI storage
        content_type: MIME type of the file
        resize: If True, resize the image to standard size before upload

    Returns:
        Full URL to the uploaded file, or empty string if upload failed
    """
    if not OCI_PAR_URL:
        logger.error("OCI PAR URL not configured")
        return ""

    try:
        # Resize image if requested and it's an image file
        if resize and content_type.startswith('image/'):
            logger.info(f"Resizing image to {STANDARD_IMAGE_SIZE} before upload")
            file_content = resize_image(file_content)

        par_upload_url = f"{OCI_PAR_URL.rstrip('/')}/{filename}"
        response = requests.put(par_upload_url, data=file_content, headers={'Content-Type': content_type})

        if response.status_code in (200, 201):
            logger.info(f"File uploaded successfully to OCI: {filename}")
            return par_upload_url
        else:
            logger.error(f"Failed to upload to OCI. Status: {response.status_code}, Response: {response.text}")
            return ""

    except Exception as e:
        log_exception(e, f"Error uploading to OCI: {filename}")
        return ""