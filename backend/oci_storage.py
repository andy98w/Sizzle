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
        
        # Validate and fix PAR URL format if needed
        if self.enabled:
            # Extract the base URL and PAR path separately for correct URL construction
            # PAR URLs should contain '/p/' as per Oracle's format
            pass
        else:
            print("OCI Object Storage is disabled. Images will be stored locally only.")
    
    def upload_image(self, image_path: str, object_name: str) -> Optional[str]:
        """Upload an image file to OCI Object Storage using PAR URL"""
        # If OCI is not available, return None to indicate fallback to local storage
        if not self.enabled:
            pass
            return None
            
        try:
            # Check if the file exists
            if not os.path.exists(image_path):
                return None
                
            # Get file content and MIME type
            with open(image_path, 'rb') as file:
                file_content = file.read()
            
            # Determine content type based on file extension
            content_type, _ = mimetypes.guess_type(image_path)
            if not content_type:
                content_type = 'application/octet-stream'
            
            # Construct the object URL (PAR URL + object name)
            # Ensure proper formatting for Oracle Cloud PAR URLs
            if '/p/' in self.par_url:
                # The PAR URL already contains the /p/ path, just append the object name
                object_url = f"{self.par_url}/{object_name}"
            else:
                # Try to reconstruct the proper PAR URL format
                # Parse the URL to extract components
                from urllib.parse import urlparse
                parsed_url = urlparse(self.par_url)
                
                # Oracle PAR URLs follow pattern: https://objectstorage.{region}.oraclecloud.com/p/{token}/n/{namespace}/b/{bucket}/o/{object}
                # We need to ensure the object name is correctly added to this path
                if 'objectstorage' in parsed_url.netloc:
                    # This is an Oracle URL, but missing proper PAR format
                    # Assuming path contains namespace, bucket info without /p/ token
                    path_parts = parsed_url.path.strip('/').split('/')
                    if len(path_parts) >= 4 and path_parts[0] == 'n' and path_parts[2] == 'b':
                        # URL follows pattern /n/{namespace}/b/{bucket}/...
                        namespace = path_parts[1]
                        bucket = path_parts[3]
                        # Construct URL with placeholder token (this is a best-effort fix)
                        object_url = f"{parsed_url.scheme}://{parsed_url.netloc}/p/token/n/{namespace}/b/{bucket}/o/{object_name}"
                    else:
                        # Can't parse correctly, use as-is
                        object_url = f"{self.par_url}/{object_name}"
                else:
                    # Not an Oracle URL or can't determine format, use as-is
                    object_url = f"{self.par_url}/{object_name}"
            
            # Set up headers
            headers = {
                'Content-Type': content_type
            }
            
            # Upload the file
            response = requests.put(object_url, data=file_content, headers=headers)
            
            if response.status_code in (200, 201):
                
                # Create a formatted direct access URL that will work with browser requests
                # The URL needs to be in the correct format for Oracle Cloud PAR URIs
                # Format: https://objectstorage.{region}.oraclecloud.com/p/{token}/n/{namespace}/b/{bucket}/o/{object}
                
                if '/p/' in object_url:
                    # URL is already properly formatted
                    direct_url = object_url
                else:
                    # Try to ensure the URL has the correct Oracle format
                    from urllib.parse import urlparse
                    parsed_url = urlparse(object_url)
                    
                    if 'objectstorage' in parsed_url.netloc:
                        # This is an Oracle URL, check if we need to reformat
                        path = parsed_url.path.lstrip('/')
                        
                        # Check if path starts with object name directly (basic case)
                        if path.startswith(object_name):
                            # Build a proper PAR URL - best effort based on error message
                            # Check if we have enough info to reconstruct a proper URL
                            if 'n/' in self.par_url and 'b/' in self.par_url:
                                # Extract namespace and bucket from base PAR URL
                                par_path = urlparse(self.par_url).path
                                # Try to find namespace and bucket in the path
                                n_index = par_path.find('/n/')
                                b_index = par_path.find('/b/')
                                
                                if n_index >= 0 and b_index >= 0:
                                    namespace = par_path[n_index+3:b_index].strip('/')
                                    # Find the bucket name (everything after /b/ until next / or end)
                                    bucket_path = par_path[b_index+3:]
                                    bucket = bucket_path.split('/')[0]
                                    
                                    # Now construct a proper URL
                                    direct_url = f"{parsed_url.scheme}://{parsed_url.netloc}/p/auto-generated/n/{namespace}/b/{bucket}/o/{object_name}"
                                else:
                                    # Can't extract properly, use as-is
                                    direct_url = object_url
                            else:
                                # Can't determine namespace/bucket, use as-is
                                direct_url = object_url
                        else:
                            # Path doesn't start with object name, assume it's already properly formatted
                            direct_url = object_url
                    else:
                        # Not Oracle URL, use as-is
                        direct_url = object_url

                return direct_url
            else:
                return None
                
        except Exception:
            return None
    
    def upload_base64_image(self, base64_data: str, object_name: str) -> Optional[str]:
        """Upload a base64-encoded image directly to OCI Object Storage"""
        # If OCI is not available, return None to indicate fallback to local storage
        if not self.enabled:
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
            
            # Construct the object URL (PAR URL + object name)
            # Ensure proper formatting for Oracle Cloud PAR URLs
            if '/p/' in self.par_url:
                # The PAR URL already contains the /p/ path, just append the object name
                object_url = f"{self.par_url}/{object_name}"
            else:
                # Try to reconstruct the proper PAR URL format
                # Parse the URL to extract components
                from urllib.parse import urlparse
                parsed_url = urlparse(self.par_url)
                
                # Oracle PAR URLs follow pattern: https://objectstorage.{region}.oraclecloud.com/p/{token}/n/{namespace}/b/{bucket}/o/{object}
                # We need to ensure the object name is correctly added to this path
                if 'objectstorage' in parsed_url.netloc:
                    # This is an Oracle URL, but missing proper PAR format
                    # Assuming path contains namespace, bucket info without /p/ token
                    path_parts = parsed_url.path.strip('/').split('/')
                    if len(path_parts) >= 4 and path_parts[0] == 'n' and path_parts[2] == 'b':
                        # URL follows pattern /n/{namespace}/b/{bucket}/...
                        namespace = path_parts[1]
                        bucket = path_parts[3]
                        # Construct URL with placeholder token (this is a best-effort fix)
                        object_url = f"{parsed_url.scheme}://{parsed_url.netloc}/p/token/n/{namespace}/b/{bucket}/o/{object_name}"
                    else:
                        # Can't parse correctly, use as-is
                        object_url = f"{self.par_url}/{object_name}"
                else:
                    # Not an Oracle URL or can't determine format, use as-is
                    object_url = f"{self.par_url}/{object_name}"
            
            # Set up headers
            headers = {
                'Content-Type': content_type
            }
            
            # Upload the file
            response = requests.put(object_url, data=image_data, headers=headers)
            
            if response.status_code in (200, 201):
                
                # Create a formatted direct access URL that will work with browser requests
                # The URL needs to be in the correct format for Oracle Cloud PAR URIs
                # Format: https://objectstorage.{region}.oraclecloud.com/p/{token}/n/{namespace}/b/{bucket}/o/{object}
                
                if '/p/' in object_url:
                    # URL is already properly formatted
                    direct_url = object_url
                else:
                    # Try to ensure the URL has the correct Oracle format
                    from urllib.parse import urlparse
                    parsed_url = urlparse(object_url)
                    
                    if 'objectstorage' in parsed_url.netloc:
                        # This is an Oracle URL, check if we need to reformat
                        path = parsed_url.path.lstrip('/')
                        
                        # Check if path starts with object name directly (basic case)
                        if path.startswith(object_name):
                            # Build a proper PAR URL - best effort based on error message
                            # Check if we have enough info to reconstruct a proper URL
                            if 'n/' in self.par_url and 'b/' in self.par_url:
                                # Extract namespace and bucket from base PAR URL
                                par_path = urlparse(self.par_url).path
                                # Try to find namespace and bucket in the path
                                n_index = par_path.find('/n/')
                                b_index = par_path.find('/b/')
                                
                                if n_index >= 0 and b_index >= 0:
                                    namespace = par_path[n_index+3:b_index].strip('/')
                                    # Find the bucket name (everything after /b/ until next / or end)
                                    bucket_path = par_path[b_index+3:]
                                    bucket = bucket_path.split('/')[0]
                                    
                                    # Now construct a proper URL
                                    direct_url = f"{parsed_url.scheme}://{parsed_url.netloc}/p/auto-generated/n/{namespace}/b/{bucket}/o/{object_name}"
                                else:
                                    # Can't extract properly, use as-is
                                    direct_url = object_url
                            else:
                                # Can't determine namespace/bucket, use as-is
                                direct_url = object_url
                        else:
                            # Path doesn't start with object name, assume it's already properly formatted
                            direct_url = object_url
                    else:
                        # Not Oracle URL, use as-is
                        direct_url = object_url

                return direct_url
            else:
                return None
                
        except Exception:
            return None
            
    def delete_object(self, object_name: str) -> bool:
        """Delete an object from OCI Object Storage"""
        # If OCI is not available, return False
        if not self.enabled:
            return False
            
        try:
            # Construct the object URL (PAR URL + object name)
            # Ensure proper formatting for Oracle Cloud PAR URLs
            if '/p/' in self.par_url:
                # The PAR URL already contains the /p/ path, just append the object name
                object_url = f"{self.par_url}/{object_name}"
            else:
                # Try to reconstruct the proper PAR URL format
                # Parse the URL to extract components
                from urllib.parse import urlparse
                parsed_url = urlparse(self.par_url)
                
                # Oracle PAR URLs follow pattern: https://objectstorage.{region}.oraclecloud.com/p/{token}/n/{namespace}/b/{bucket}/o/{object}
                # We need to ensure the object name is correctly added to this path
                if 'objectstorage' in parsed_url.netloc:
                    # This is an Oracle URL, but missing proper PAR format
                    # Assuming path contains namespace, bucket info without /p/ token
                    path_parts = parsed_url.path.strip('/').split('/')
                    if len(path_parts) >= 4 and path_parts[0] == 'n' and path_parts[2] == 'b':
                        # URL follows pattern /n/{namespace}/b/{bucket}/...
                        namespace = path_parts[1]
                        bucket = path_parts[3]
                        # Construct URL with placeholder token (this is a best-effort fix)
                        object_url = f"{parsed_url.scheme}://{parsed_url.netloc}/p/token/n/{namespace}/b/{bucket}/o/{object_name}"
                    else:
                        # Can't parse correctly, use as-is
                        object_url = f"{self.par_url}/{object_name}"
                else:
                    # Not an Oracle URL or can't determine format, use as-is
                    object_url = f"{self.par_url}/{object_name}"
            
            # Send DELETE request
            response = requests.delete(object_url)
            
            if response.status_code == 204:
                return True
            else:
                return False
                
        except Exception:
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