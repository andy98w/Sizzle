import os
import io
import base64
import json
import requests
from typing import List, Dict, Any, Optional
from pathlib import Path
import time
from PIL import Image, ImageOps
from rembg import remove

class StabilityAIGenerator:
    """Class to handle image generation with Stability AI API"""
    
    def __init__(self, api_key: str):
        """Initialize with Stability AI API key"""
        self.api_key = api_key
        self.base_url = "https://api.stability.ai"
        self.model = "stable-diffusion-xl-1024-v1-0"  # Updated to a valid model ID
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Create directories for storing generated images
        os.makedirs("static/images/actions", exist_ok=True)
        os.makedirs("static/images/ingredients", exist_ok=True)
        os.makedirs("static/images/equipment", exist_ok=True)
        os.makedirs("static/images/steps", exist_ok=True)
        os.makedirs("static/images/tests", exist_ok=True)
    
    def check_api_connection(self) -> bool:
        """Test the API connection"""
        try:
            # Use a simpler endpoint for checking the connection
            endpoint = f"{self.base_url}/v1/user/account"
            
            response = requests.get(
                endpoint, 
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            
            if response.status_code == 200:
                print("Successfully connected to Stability AI API")
                return True
            else:
                print(f"Failed to connect to Stability AI API: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"API connection error: {e}")
            return False
    
    def generate_image(
        self, 
        prompt: str, 
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        steps: int = 30,
        cfg_scale: float = 7.0,
        samples: int = 1,
    ) -> Optional[List[str]]:
        """Generate an image using Stability AI API with Stable Image Core v2 API"""
        try:
            # Try v2 API first (Stable Image Core)
            endpoint = f"{self.base_url}/v2beta/stable-image/generate/core"
            
            # Create multipart/form-data request for v2 API
            files = {
                'prompt': (None, prompt),
                'width': (None, str(width)),
                'height': (None, str(height)),
                'num_outputs': (None, str(samples)),
                'output_format': (None, 'png'),  # Specify PNG output format
                'background': (None, 'transparent'),  # Set transparent background
            }
            
            if negative_prompt:
                files['negative_prompt'] = (None, negative_prompt)
            
            # Headers for v2 API (authorization only)
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Accept": "application/json"
            }
            
            print(f"Trying Stable Image Core v2 API at {endpoint} with prompt: {prompt}")
            response = requests.post(endpoint, headers=headers, files=files)
            
            # If v2 API works
            if response.status_code == 200:
                print("Successfully used Stable Image Core v2 API")
                result = response.json()
                
                # Debug response structure - only print the keys, not the values
                print(f"Response keys: {list(result.keys())}")
                
                # Handle v2 API response format
                if 'artifacts' in result:
                    # Legacy v1 format
                    return [img.get('base64') for img in result.get('artifacts', []) if 'base64' in img]
                elif 'images' in result:
                    # v2 batch format
                    return result.get('images', [])
                elif 'image' in result:
                    # v2 single image format - this appears to be the current format
                    print("Found single image in response")
                    # Return as a list with one item to maintain interface compatibility
                    return [result['image']]
                else:
                    # Unknown format, truncate result for debugging
                    first_100_chars = str(result)[:100] + "..." if len(str(result)) > 100 else str(result)
                    print(f"Unexpected response format: {first_100_chars}")
                    return None
                
            # If v2 API fails, try v1 API as fallback
            print(f"v2 API failed with: {response.status_code} - {response.text}")
            print("Falling back to v1 API...")
            
            # List available v1 engines
            engines_endpoint = f"{self.base_url}/v1/engines/list"
            engines_response = requests.get(engines_endpoint, headers={"Authorization": f"Bearer {self.api_key}"})
            
            if engines_response.status_code != 200:
                print(f"Error getting engines: {engines_response.status_code} - {engines_response.text}")
                return None
                
            engines = engines_response.json()
            available_engines = [engine["id"] for engine in engines]
            print(f"Available v1 engines: {available_engines}")
            
            # Use the first available engine if none specified
            if not available_engines:
                print("No v1 engines available")
                return None
                
            engine_id = available_engines[0]
            
            # Use v1 API endpoint with available engine
            v1_endpoint = f"{self.base_url}/v1/generation/{engine_id}/text-to-image"
            
            # Create payload for JSON body (v1 API)
            payload = {
                "text_prompts": [
                    {
                        "text": prompt,
                        "weight": 1.0
                    }
                ],
                "cfg_scale": cfg_scale,
                "height": height,
                "width": width,
                "samples": samples,
                "steps": steps
            }
            
            if negative_prompt:
                payload["text_prompts"].append({
                    "text": negative_prompt,
                    "weight": -1.0
                })
            
            # Headers for v1 API (includes Content-Type)
            v1_headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            print(f"Sending request to v1 API: {v1_endpoint}")
            v1_response = requests.post(v1_endpoint, headers=v1_headers, json=payload)
            
            if v1_response.status_code != 200:
                print(f"v1 API error: {v1_response.status_code} - {v1_response.text}")
                return None
                
            result = v1_response.json()
            image_data = []
            
            # Process the generated images from v1 API format
            for i, image in enumerate(result.get('artifacts', [])):
                if 'base64' in image:
                    image_data.append(image['base64'])
            
            return image_data
            
        except Exception as e:
            print(f"Image generation error: {e}")
            return None
    
    def make_transparent(self, image_data: bytes) -> bytes:
        """Remove background using rembg library"""
        try:
            # Open image from bytes
            img = Image.open(io.BytesIO(image_data))
            
            # Convert to RGBA if not already
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            print("Using rembg to remove background...")
            # Use rembg to remove background with the 'u2net' model (general purpose)
            # The first time this runs, it will download the model which may take some time
            output_img = remove(img, alpha_matting=True, alpha_matting_foreground_threshold=240)
            
            # Save to bytes
            output = io.BytesIO()
            output_img.save(output, format='PNG')
            output_bytes = output.getvalue()
            
            print(f"Background removal complete. Original size: {len(image_data)} bytes, New size: {len(output_bytes)} bytes")
            return output_bytes
            
        except Exception as e:
            print(f"Error removing background with rembg: {e}")
            # Return original image data if processing fails
            return image_data
    
    def save_image(self, image_data: str, folder: str, filename: str) -> str:
        """Save a base64 image to file and return the file path"""
        try:
            print(f"Saving image for {filename} in {folder}")
            print(f"Image data type: {type(image_data)}")
            if isinstance(image_data, dict):
                print(f"Image data keys: {image_data.keys()}")
                # Handle if the image data is a dictionary (common in v2 API responses)
                if 'base64' in image_data:
                    image_data = image_data['base64']
                else:
                    print(f"Unexpected image data format: {image_data}")
                    return ""
            
            # Ensure the image data is a proper base64 string
            if not isinstance(image_data, str):
                print(f"Invalid image data type: {type(image_data)}")
                return ""
                
            # Remove data URL prefix if present
            if image_data.startswith('data:image'):
                # Extract the base64 part after the comma
                image_data = image_data.split(',', 1)[1]
            
            # Define local path for saving
            folder_path = f"static/images/{folder}"
            image_path = f"{folder_path}/{filename}.png"
            
            # Ensure directory exists and has correct permissions
            os.makedirs(folder_path, exist_ok=True)
            os.chmod(folder_path, 0o755)  # rwxr-xr-x
            
            # Decode base64 to binary
            binary_data = base64.b64decode(image_data)
            
            # Process image to make background transparent
            if folder == "ingredients":  # Only process ingredients
                print(f"Making transparent background for {filename}")
                binary_data = self.make_transparent(binary_data)
            
            print(f"Saving to: {image_path}")
            # Save the processed image locally
            with open(image_path, "wb") as f:
                f.write(binary_data)
            
            # Set correct permissions on the image file
            os.chmod(image_path, 0o644)  # rw-r--r--
            
            # Verify file was created and is readable
            if os.path.exists(image_path):
                file_size = os.path.getsize(image_path)
                print(f"Image saved successfully to {image_path} (size: {file_size} bytes)")
                return image_path
            else:
                print(f"Failed to verify image file creation at {image_path}")
                return ""
        except Exception as e:
            print(f"Error saving image: {e}")
            return ""
    
    def generate_cooking_action_image(self, action: str) -> Optional[str]:
        """Generate an image for a cooking action"""
        # Check if we already have an image for this action
        existing_path = f"static/images/actions/{action}.png"
        if os.path.exists(existing_path):
            return f"/static/images/actions/{action}.png"
        
        # Prompt engineering for cooking actions
        prompts = {
            "chop": "2D flat icon of a knife chopping vegetables, emoji style, minimal cartoon vector art, white background",
            "stir": "2D flat icon of a wooden spoon stirring in a bowl, emoji style, minimal cartoon vector art, white background",
            "boil": "2D flat icon of a pot with bubbling water and steam, emoji style, minimal cartoon vector art, white background",
            "bake": "2D flat icon of an oven with a baking tray, emoji style, minimal cartoon vector art, white background",
            "mix": "2D flat icon of a mixing bowl with whisk, emoji style, minimal cartoon vector art, white background",
            "fry": "2D flat icon of a frying pan with sizzling food, emoji style, minimal cartoon vector art, white background",
            "grill": "2D flat icon of a grill with food, emoji style, minimal cartoon vector art, white background",
            "cook_rice": "2D flat icon of a rice cooker with steam, emoji style, minimal cartoon vector art, white background"
        }
        
        # Default prompt if action not in dictionary
        prompt = prompts.get(
            action, 
            f"2D flat icon of {action} food, emoji style, minimal cartoon vector art, white background"
        )
        
        # Generate the image
        images = self.generate_image(prompt=prompt)
        if not images:
            return None
            
        # Save the first image
        image_path = self.save_image(images[0], "actions", action)
        if not image_path:
            return None
            
        return f"/{image_path}"
    
    def generate_ingredient_image(self, ingredient: str) -> Optional[str]:
        """Generate an image for a cooking ingredient"""
        # Clean ingredient name for filename
        clean_name = ingredient.lower().replace(" ", "_")
        
        # Check if we already have an image for this ingredient
        existing_path = f"static/images/ingredients/{clean_name}.png"
        if os.path.exists(existing_path):
            print(f"Using existing image for {ingredient}")
            # Return absolute path for debugging purposes
            abs_path = os.path.abspath(existing_path)
            print(f"Absolute path: {abs_path}")
            return f"/static/images/ingredients/{clean_name}.png"
        
        print(f"Generating new image for ingredient: {ingredient}")
        # Generate the image
        prompt = f"2D flat icon of cooking {ingredient}, emoji style, minimal cartoon vector art, transparent background"
        images = self.generate_image(prompt=prompt)
        
        print(f"Generate_image returned: {type(images)}")
        if images is None:
            print(f"No images generated for {ingredient}")
            return None
            
        if not images:
            print(f"Empty images list for {ingredient}")
            return None
        
        try:
            # Check what we received
            print(f"First image type: {type(images[0])}")
            
            # Save the first image
            image_path = self.save_image(images[0], "ingredients", clean_name)
            if not image_path:
                print(f"Failed to save image for {ingredient}")
                return None
            
            # Verify file exists and has permissions
            if os.path.exists(image_path):
                image_stat = os.stat(image_path)
                readable = bool(image_stat.st_mode & 0o444)  # Check if file is readable
                
                print(f"Successfully created image for {ingredient}")
                print(f"Image path: {image_path}")
                print(f"Absolute path: {os.path.abspath(image_path)}")
                print(f"File permissions: {oct(image_stat.st_mode)}")
                print(f"File is readable: {readable}")
                
                # Ensure file has correct permissions
                os.chmod(image_path, 0o644)  # rw-r--r--
                
                # Ensure the URL starts with a slash
                if not image_path.startswith('/'):
                    return f"/{image_path}"
                return image_path
            else:
                print(f"Image file not found after saving: {image_path}")
                return None
                
        except Exception as e:
            print(f"Error in generate_ingredient_image: {e}")
            return None
    
    def generate_equipment_image(self, equipment: str) -> Optional[str]:
        """Generate an image for cooking equipment"""
        # Clean equipment name for filename
        clean_name = equipment.lower().replace(" ", "_")
        
        # Check if we already have an image for this equipment
        existing_path = f"static/images/equipment/{clean_name}.png"
        if os.path.exists(existing_path):
            return f"/static/images/equipment/{clean_name}.png"
        
        # Generate the image
        prompt = f"2D flat icon of {equipment}, kitchen tool, emoji style, minimal cartoon vector art, white background"
        images = self.generate_image(prompt=prompt)
        
        if not images:
            return None
            
        # Save the first image
        image_path = self.save_image(images[0], "equipment", clean_name)
        if not image_path:
            return None
            
        return f"/{image_path}"
    
    def generate_recipe_step_image(self, step_description: str, step_id: str) -> Optional[str]:
        """Generate an image for a recipe step based on its description"""
        # Clean step id for filename
        clean_id = step_id.replace(" ", "_")
        
        # Check if we already have an image for this step
        existing_path = f"static/images/steps/{clean_id}.png"
        if os.path.exists(existing_path):
            return f"/static/images/steps/{clean_id}.png"
        
        # Simplify the prompt for better results
        prompt = f"2D flat illustration of {step_description}, cooking step, emoji style, minimal cartoon vector art, white background"
        
        # Generate the image
        images = self.generate_image(prompt=prompt)
        
        if not images:
            return None
            
        # Save the first image
        image_path = self.save_image(images[0], "steps", clean_id)
        if not image_path:
            return None
            
        return f"/{image_path}"


# Example usage
if __name__ == "__main__":
    # Test the API
    api_key = os.getenv("STABILITY_API_KEY")
    if not api_key:
        print("No API key found. Set STABILITY_API_KEY environment variable.")
        exit(1)
        
    generator = StabilityAIGenerator(api_key)
    print(f"API connection: {generator.check_api_connection()}")
    
    # Test generating an action image
    action_image = generator.generate_cooking_action_image("stir")
    print(f"Action image: {action_image}")