import os
import io
import base64
import json
import requests
from typing import List, Dict, Any, Optional
from pathlib import Path
import time

class StabilityAIGenerator:
    """Class to handle image generation with Stability AI API"""
    
    def __init__(self, api_key: str):
        """Initialize with Stability AI API key"""
        self.api_key = api_key
        self.base_url = "https://api.stability.ai"
        self.model = "stable-diffusion-2.1"
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
        width: int = 512,
        height: int = 512,
        steps: int = 30,
        cfg_scale: float = 7.0,
        samples: int = 1,
    ) -> Optional[List[str]]:
        """Generate an image using Stability AI API"""
        try:
            endpoint = f"{self.base_url}/v2beta/stable-image/generate/core"
            
            # Create a multipart/form-data request
            files = {
                "prompt": (None, prompt),
                "negative_prompt": (None, negative_prompt),
                "width": (None, str(width)),
                "height": (None, str(height)),
                "steps": (None, str(steps)),
                "cfg_scale": (None, str(cfg_scale)),
                "samples": (None, str(samples)),
                "model": (None, self.model),
            }
            
            # Request headers - remove Content-Type so requests sets it correctly with the boundary
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Accept": "application/json"
            }
            
            print(f"Sending request to {endpoint} with prompt: {prompt}")
            response = requests.post(endpoint, headers=headers, files=files)
            
            if response.status_code != 200:
                print(f"Error: {response.status_code} - {response.text}")
                return None
                
            result = response.json()
            image_data = []
            
            # Process and save the generated images
            for i, image_base64 in enumerate(result.get('images', [])):
                image_data.append(image_base64)
            
            return image_data
            
        except Exception as e:
            print(f"Image generation error: {e}")
            return None
    
    def save_image(self, image_data: str, folder: str, filename: str) -> str:
        """Save a base64 image to file and return the file path"""
        try:
            image_path = f"static/images/{folder}/{filename}.png"
            
            # Save the image
            with open(image_path, "wb") as f:
                f.write(base64.b64decode(image_data))
            
            return image_path
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
            return f"/static/images/ingredients/{clean_name}.png"
        
        # Generate the image
        prompt = f"2D flat icon of {ingredient}, emoji style, minimal cartoon vector art, white background"
        images = self.generate_image(prompt=prompt)
        
        if not images:
            return None
            
        # Save the first image
        image_path = self.save_image(images[0], "ingredients", clean_name)
        if not image_path:
            return None
            
        return f"/{image_path}"
    
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