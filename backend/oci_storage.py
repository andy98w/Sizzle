"""Oracle Cloud Infrastructure (OCI) Object Storage integration module."""

import mimetypes
from typing import Tuple
from pathlib import Path
import requests

mimetypes.init()

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


def upload_file_to_oci(file_content: bytes, filename: str, content_type: str = "image/png") -> str:
    """
    Upload file content (bytes) to OCI Object Storage.

    Args:
        file_content: The file content as bytes
        filename: The filename to use in OCI storage
        content_type: MIME type of the file

    Returns:
        Full URL to the uploaded file, or empty string if upload failed
    """
    if not OCI_PAR_URL:
        logger.error("OCI PAR URL not configured")
        return ""

    try:
        par_upload_url = f"{OCI_PAR_URL.rstrip('/')}/{filename}"
        response = requests.put(par_upload_url, data=file_content, headers={'Content-Type': content_type})

        if response.status_code in (200, 201):
            logger.info(f"File uploaded successfully to OCI: {filename}")
            # Return the full OCI URL
            return par_upload_url
        else:
            logger.error(f"Failed to upload to OCI. Status: {response.status_code}, Response: {response.text}")
            return ""

    except Exception as e:
        log_exception(e, f"Error uploading to OCI: {filename}")
        return ""