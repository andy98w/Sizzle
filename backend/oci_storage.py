import base64
import os
import requests
from typing import Optional
import mimetypes
from pathlib import Path

try:
    import oci
    OCI_AVAILABLE = True
except ImportError:
    OCI_AVAILABLE = False
    print("Warning: OCI module not available. Cloud storage functionality will be limited.")

class OCIObjectStorage:
    """Class to handle Oracle Cloud Infrastructure Object Storage operations using PAR URLs"""
    
    def __init__(self, par_url: str):
        """Initialize with a Pre-Authenticated Request URL for the bucket"""
        self.par_url = par_url.rstrip('/')
        self.enabled = OCI_AVAILABLE and par_url
        if self.enabled:
            print(f"Initialized OCI Object Storage with PAR URL: {self.par_url}")
        else:
            print(f"OCI Object Storage is disabled. Images will be stored locally only.")
    
    def upload_image(self, image_path: str, object_name: str) -> Optional[str]:
        """Upload an image file to OCI Object Storage using PAR URL"""
        # If OCI is not available, return None to indicate fallback to local storage
        if not self.enabled:
            print(f"OCI Storage disabled - not uploading {image_path}")
            return None
            
        try:
            # Check if the file exists
            if not os.path.exists(image_path):
                print(f"Error: File not found at {image_path}")
                return None
                
            # Get file content and MIME type
            with open(image_path, 'rb') as file:
                file_content = file.read()
            
            # Determine content type based on file extension
            content_type, _ = mimetypes.guess_type(image_path)
            if not content_type:
                content_type = 'application/octet-stream'
            
            # Construct the object URL (PAR URL + object name)
            object_url = f"{self.par_url}/{object_name}"
            
            # Set up headers
            headers = {
                'Content-Type': content_type
            }
            
            # Upload the file
            print(f"Uploading {image_path} to {object_url}")
            response = requests.put(object_url, data=file_content, headers=headers)
            
            if response.status_code in (200, 201):
                print(f"Successfully uploaded {image_path} to OCI Object Storage")
                print(f"OCI URL: {object_url}")
                
                # Create a direct access URL
                direct_url = object_url
                print(f"Direct Access URL: {direct_url}")
                
                return direct_url
            else:
                print(f"Error uploading to OCI: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Error in upload_image: {e}")
            return None
    
    def upload_base64_image(self, base64_data: str, object_name: str) -> Optional[str]:
        """Upload a base64-encoded image directly to OCI Object Storage"""
        # If OCI is not available, return None to indicate fallback to local storage
        if not self.enabled:
            print(f"OCI Storage disabled - not uploading base64 image")
            return None
            
        try:
            # Remove data URL prefix if present
            if base64_data.startswith('data:image'):
                # Extract the base64 part after the comma
                base64_data = base64_data.split(',', 1)[1]
            
            # Decode the base64 data
            image_data = base64.b64decode(base64_data)
            
            # Determine content type based on object name
            content_type, _ = mimetypes.guess_type(object_name)
            if not content_type:
                content_type = 'image/png'  # Default to PNG
            
            # Construct the object URL
            object_url = f"{self.par_url}/{object_name}"
            
            # Set up headers
            headers = {
                'Content-Type': content_type
            }
            
            # Upload the file
            print(f"Uploading base64 image to {object_url}")
            response = requests.put(object_url, data=image_data, headers=headers)
            
            if response.status_code in (200, 201):
                print(f"Successfully uploaded base64 image to OCI Object Storage")
                return object_url
            else:
                print(f"Error uploading to OCI: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Error in upload_base64_image: {e}")
            return None
            
    def delete_object(self, object_name: str) -> bool:
        """Delete an object from OCI Object Storage"""
        # If OCI is not available, return False
        if not self.enabled:
            print(f"OCI Storage disabled - not deleting {object_name}")
            return False
            
        try:
            # Construct the object URL
            object_url = f"{self.par_url}/{object_name}"
            
            # Send DELETE request
            response = requests.delete(object_url)
            
            if response.status_code == 204:
                print(f"Successfully deleted {object_name} from OCI Object Storage")
                return True
            else:
                print(f"Error deleting from OCI: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"Error in delete_object: {e}")
            return False

if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    par_url = os.getenv("OCI_PAR_URL")
    
    if not par_url:
        print("OCI_PAR_URL environment variable not set")
        exit(1)
    
    storage = OCIObjectStorage(par_url)
    
    test_image_path = "static/images/tests/test_image.png"
    if os.path.exists(test_image_path):
        result = storage.upload_image(test_image_path, "test/test_upload.png")
        print(f"Upload result: {result}")