from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from recipe_assistant import RecipeAssistant
from typing import List, Optional, Dict, Any, Union
import os
import json
import time
import random
from dotenv import load_dotenv
from stability_ai import StabilityAIGenerator
from db_manager import db as supabase_db
from oci_storage import OCIObjectStorage

# Load environment variables
load_dotenv()

# Create directories for animations if they don't exist
os.makedirs("static/animations/actions", exist_ok=True)
os.makedirs("static/animations/ingredients", exist_ok=True)

assistant = RecipeAssistant()

stability_api_key = os.getenv("STABILITY_API_KEY")
if stability_api_key:
    image_generator = StabilityAIGenerator(stability_api_key)
else:
    image_generator = None
    print("Warning: STABILITY_API_KEY not found. AI image generation will be disabled.")

oci_par_url = os.getenv("OCI_PAR_URL")
if not oci_par_url:
    print("Warning: OCI_PAR_URL not found in environment variables. Cloud storage will be disabled.")
oci_storage = OCIObjectStorage(oci_par_url or "")

# Initialize FastAPI
app = FastAPI(title="Sizzle - Animated Recipe Assistant API")

# Check if Supabase is configured
if supabase_db.is_connected():
    print("Supabase database connection is available.")
else:
    print("Warning: Supabase database is not configured or not available.")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")
print("Static files mounted at /static - serving from 'static' directory")

class RecipeQuery(BaseModel):
    query: str
    
class ChatHistory(BaseModel):
    messages: List[dict]

@app.get("/")
def read_root():
    return {"message": "Recipe Assistant API is running!"}

@app.get("/api-status")
def check_api_status():
    """Check if the Stability AI API and Supabase are available and working"""
    result = {
        "stability_ai": {
            "status": "not_configured",
            "message": "Stability AI API key not configured"
        },
        "supabase": {
            "status": "not_configured",
            "message": "Supabase connection not configured"
        }
    }
    
    # Check Stability AI
    if image_generator:
        try:
            api_status = image_generator.check_api_connection()
            if api_status:
                result["stability_ai"] = {
                    "status": "ok", 
                    "message": "Stability AI API is connected and working correctly"
                }
            else:
                result["stability_ai"] = {
                    "status": "error", 
                    "message": "Stability AI API connection failed"
                }
        except Exception as e:
            result["stability_ai"] = {
                "status": "error", 
                "message": f"Error checking API status: {str(e)}"
            }
    
    # Check Supabase
    if supabase_db.is_connected():
        try:
            db_status = supabase_db.test_connection()
            if db_status:
                result["supabase"] = {
                    "status": "ok", 
                    "message": "Supabase connection is working correctly"
                }
            else:
                result["supabase"] = {
                    "status": "error", 
                    "message": "Supabase connection test failed"
                }
        except Exception as e:
            result["supabase"] = {
                "status": "error", 
                "message": f"Error checking Supabase: {str(e)}"
            }
    
    return result

@app.post("/recipe")
def get_recipe(query: RecipeQuery):
    try:
        response = assistant.get_recipe(query.query)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/followup")
def ask_followup(query: RecipeQuery):
    try:
        response = assistant.ask_followup(query.query)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reset")
def reset_conversation():
    try:
        assistant.reset_conversation()
        return {"message": "Conversation reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history")
def get_history():
    history = [
        {"role": "human" if i % 2 == 0 else "ai", "content": msg.content}
        for i, msg in enumerate(assistant.chat_history)
    ]
    return {"history": history}

# Animation model classes
class AnimationRequest(BaseModel):
    action: str
    ingredients: Optional[List[str]] = None
    equipment: Optional[List[str]] = None

class RecipeStep(BaseModel):
    instruction: str
    action: str
    ingredients: List[Dict[str, Any]]
    equipment: List[Dict[str, Any]]

class Recipe(BaseModel):
    title: str
    description: str
    prepTime: str
    cookTime: str
    servings: int
    ingredients: List[Dict[str, Any]]
    equipment: List[Dict[str, Any]]
    steps: List[RecipeStep]

# Animation endpoints
@app.get("/animations/actions/{action}")
def get_action_animation(action: str):
    """Return animation for common cooking actions"""
    # Check if we have a pre-generated animation
    animation_path = f"static/animations/actions/{action}.json"
    
    if os.path.exists(animation_path):
        # Return the existing animation
        with open(animation_path, "r") as f:
            animation_data = json.load(f)
        return {"animation_url": f"/static/animations/actions/{action}.json", "data": animation_data}
    else:
        # Placeholder for AI generation logic
        # In a real implementation, this would call an AI service
        # For demo purposes, we'll return a mock response
        return {
            "animation_url": None,
            "message": "Animation not found, would generate with AI in production",
            "action": action
        }

@app.post("/animations/generate")
async def generate_animation(request: AnimationRequest):
    """Generate a custom animation based on recipe step"""
    try:
        # This is where you would call the AI generation service
        # For demo purposes, we'll simulate a delay and return a mock response
        time.sleep(1)  # Simulate API call
        
        # In a real implementation, this would store the generated animation
        animation_id = f"{request.action}_{int(time.time())}"
        
        return {
            "status": "success",
            "message": "Animation generated successfully",
            "animation_id": animation_id,
            "animation_url": f"/static/animations/generated/{animation_id}.json"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/generate/image")
async def generate_test_image(prompt: str):
    """Test endpoint for generating an image with StabilityAI"""
    if not image_generator:
        raise HTTPException(status_code=400, detail="Image generation is not available. STABILITY_API_KEY not configured.")
    
    try:
        print(f"Generating test image with prompt: {prompt}")
        images = image_generator.generate_image(prompt=prompt)
        if not images:
            raise HTTPException(status_code=500, detail="Failed to generate image")
        
        # Save the first image
        timestamp = int(time.time())
        image_path = image_generator.save_image(images[0], "steps", f"test_{timestamp}")
        
        return {
            "success": True,
            "image_url": f"/{image_path}",
            "prompt": prompt
        }
    except Exception as e:
        print(f"Error in generate_test_image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test-image")
async def test_image_generation():
    """Simple test endpoint with a predefined prompt"""
    if not image_generator:
        raise HTTPException(status_code=400, detail="Image generation is not available. STABILITY_API_KEY not configured.")
    
    try:
        # Use a simple, predictable prompt
        test_prompt = "2D flat icon of sushi, emoji style, minimal cartoon vector art, white background"
        print(f"Testing image generation with prompt: {test_prompt}")
        
        images = image_generator.generate_image(prompt=test_prompt)
        if not images:
            raise HTTPException(status_code=500, detail="Failed to generate test image")
        
        # Save the image
        timestamp = int(time.time())
        image_path = image_generator.save_image(images[0], "tests", f"simple_test_{timestamp}")
        
        return {
            "success": True,
            "message": "Test image generated successfully",
            "image_url": f"/{image_path}",
            "prompt": test_prompt
        }
    except Exception as e:
        print(f"Error in test_image_generation: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to generate test image: {str(e)}"
        }

@app.get("/generate/action/{action}")
async def generate_action_image(action: str):
    """Generate an image for a cooking action"""
    if not image_generator:
        raise HTTPException(status_code=400, detail="Image generation is not available. STABILITY_API_KEY not configured.")
    
    try:
        image_url = image_generator.generate_cooking_action_image(action)
        if not image_url:
            raise HTTPException(status_code=500, detail=f"Failed to generate image for action: {action}")
        
        return {
            "success": True,
            "image_url": image_url,
            "action": action
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/check-ingredient-image/{ingredient}")
async def check_ingredient_image(ingredient: str):
    """Check if an image exists for an ingredient without generating one"""
    try:
        clean_name = ingredient.lower().replace(" ", "_")
        existing_path = f"static/images/ingredients/{clean_name}.png"
        
        if os.path.exists(existing_path):
            abs_path = os.path.abspath(existing_path)
            print(f"Found existing image for {ingredient} at {abs_path}")
            # Test file readability
            with open(existing_path, 'rb') as f:
                _ = f.read(1)  # Try to read 1 byte to check permissions
            
            # Check if we have a prompt for this ingredient in the database
            prompt = None
            if supabase_db.is_connected():
                try:
                    ingredient_data = supabase_db.get_image_by_name("ingredient", ingredient)
                    if ingredient_data and "prompt" in ingredient_data:
                        prompt = ingredient_data["prompt"]
                except Exception as db_err:
                    print(f"Error fetching prompt from database: {db_err}")
            
            return {
                "exists": True,
                "image_url": f"/static/images/ingredients/{clean_name}.png",
                "full_path": abs_path,
                "readable": True,
                "ingredient": ingredient,
                "prompt": prompt
            }
        else:
            return {
                "exists": False,
                "ingredient": ingredient
            }
    except Exception as e:
        print(f"Error checking image existence: {e}")
        return {
            "exists": False,
            "error": str(e),
            "ingredient": ingredient
        }

@app.get("/generate/ingredient/{ingredient}")
async def generate_ingredient_image(ingredient: str):
    """Generate an image for a cooking ingredient"""
    if not image_generator:
        raise HTTPException(status_code=400, detail="Image generation is not available. STABILITY_API_KEY not configured.")
    
    try:
        # First check if the image already exists
        clean_name = ingredient.lower().replace(" ", "_")
        existing_path = f"static/images/ingredients/{clean_name}.png"
        
        if os.path.exists(existing_path):
            print(f"Using existing image for {ingredient}")
            # Ensure the path is accessible
            abs_path = os.path.abspath(existing_path)
            image_url = f"/static/images/ingredients/{clean_name}.png"
            # Test access
            with open(existing_path, 'rb') as f:
                _ = f.read(1)
                
            return {
                "success": True,
                "image_url": image_url,
                "full_path": abs_path,
                "ingredient": ingredient,
                "cached": True
            }
            
        print(f"API endpoint: Generating image for ingredient: {ingredient}")
        image_url = image_generator.generate_ingredient_image(ingredient)
        
        if not image_url:
            print(f"API endpoint: Failed to generate image for {ingredient}")
            return {
                "success": False,
                "detail": f"Failed to generate image for ingredient: {ingredient}",
                "ingredient": ingredient
            }
        
        # Verify file exists after generation
        if os.path.exists(image_url[1:]):  # Remove leading slash from path
            print(f"API endpoint: Successfully generated image for {ingredient}: {image_url}")
            return {
                "success": True,
                "image_url": image_url,
                "full_path": os.path.abspath(image_url[1:]),
                "ingredient": ingredient,
                "cached": False
            }
        else:
            print(f"API endpoint: File not found after generation: {image_url[1:]}")
            return {
                "success": False,
                "detail": f"Image was generated but file not found at {image_url[1:]}",
                "ingredient": ingredient
            }
    except Exception as e:
        print(f"API endpoint error for {ingredient}: {str(e)}")
        return {
            "success": False,
            "detail": str(e),
            "ingredient": ingredient
        }

@app.get("/generate/equipment/{equipment}")
async def generate_equipment_image(equipment: str):
    """Generate an image for cooking equipment"""
    if not image_generator:
        raise HTTPException(status_code=400, detail="Image generation is not available. STABILITY_API_KEY not configured.")
    
    try:
        image_url = image_generator.generate_equipment_image(equipment)
        if not image_url:
            raise HTTPException(status_code=500, detail=f"Failed to generate image for equipment: {equipment}")
        
        return {
            "success": True,
            "image_url": image_url,
            "equipment": equipment
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Database-related models
class RecipeCreate(BaseModel):
    title: str
    description: str
    prep_time: str
    cook_time: str
    servings: int
    ingredients: List[Dict[str, Any]]
    equipment: List[Dict[str, Any]]
    steps: List[Dict[str, Any]]
    original_text: Optional[str] = None

@app.get("/recipes")
async def list_recipes(limit: int = 10):
    """Get a list of saved recipes"""
    if not supabase_db.is_connected():
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        recipes = supabase_db.list_recent_recipes(limit)
        return {"recipes": recipes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recipes/{recipe_id}")
async def get_recipe_by_id(recipe_id: int):
    """Get a recipe by its ID"""
    if not supabase_db.is_connected():
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        recipe = supabase_db.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        return recipe
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
@app.get("/common-ingredients")
async def get_common_ingredients(count: int = 500):
    """Get a list of common cooking ingredients"""
    try:
        ingredients = assistant.get_common_ingredients(count)
        return {"ingredients": ingredients}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class IngredientPrompt(BaseModel):
    ingredient: str
    custom_prompt: str

class SaveIngredientRequest(BaseModel):
    ingredient: str
    image_url: str
    prompt: str

@app.post("/generate/ingredient-with-prompt")
async def generate_ingredient_with_custom_prompt(request: IngredientPrompt):
    """Generate an ingredient image with a custom prompt"""
    if not image_generator:
        raise HTTPException(status_code=400, detail="Image generation is not available. STABILITY_API_KEY not configured.")
    
    try:
        # Clean ingredient name for filename
        clean_name = request.ingredient.lower().replace(" ", "_")
        
        # Generate the image with custom prompt
        prompt = request.custom_prompt
        print(f"Using custom prompt for {request.ingredient}: {prompt}")
        images = image_generator.generate_image(prompt=prompt)
        
        if not images:
            raise HTTPException(status_code=500, detail=f"Failed to generate image for ingredient: {request.ingredient}")
            
        # Save the first image
        image_path = image_generator.save_image(images[0], "ingredients", clean_name)
        if not image_path:
            raise HTTPException(status_code=500, detail=f"Failed to save image for ingredient: {request.ingredient}")
            
        # Return the image URL
        return {
            "success": True,
            "image_url": f"/{image_path}",
            "ingredient": request.ingredient,
            "prompt": prompt,
            "cost": 0.03  # Cost in dollars
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/save-ingredient")
async def save_ingredient(request: SaveIngredientRequest):
    """Save an approved ingredient to the database and upload to OCI Object Storage"""
    if not supabase_db.is_connected():
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        # Process the incoming image URL
        print(f"Original image URL: {request.image_url}")
        
        if request.image_url.startswith('/'):
            local_path = request.image_url[1:]  # Remove leading slash for filesystem path
        else:
            local_path = request.image_url
        
        print(f"Local file path: {local_path}")
        print(f"Checking file existence at: {os.path.abspath(local_path)}")
        
        # Verify file exists
        if not os.path.exists(local_path):
            raise HTTPException(status_code=404, detail=f"Image file not found at {local_path}")
        
        # Set permissions to ensure file is readable
        os.chmod(local_path, 0o644)  # rw-r--r--
        
        # Extract filename for OCI upload
        filename = os.path.basename(local_path)
        oci_object_name = f"ingredients/{filename}"
        
        # Upload to OCI if available
        oci_url = oci_storage.upload_image(local_path, oci_object_name)
        
        # Determine final URL for database storage
        if not oci_url:
            final_url = f"/static/images/ingredients/{filename}"  # Use standard format for local storage
            print(f"Using local URL for database: {final_url}")
        else:
            final_url = oci_url
            print(f"Using cloud URL for database: {final_url}")
            print(f"FINAL OCI URL for Supabase DB: {final_url}")
        
        # Save to database
        result = supabase_db.save_ingredient(
            name=request.ingredient,
            image_url=final_url,
            prompt=request.prompt
        )
        
        if not result:
            raise HTTPException(status_code=500, detail=f"Failed to save ingredient: {request.ingredient}")
        
        # Return detailed response
        return {
            "success": True,
            "message": f"Ingredient {request.ingredient} saved successfully",
            "ingredient": result,
            "image_url": final_url,  # URL that will be used for display
            "local_path": os.path.abspath(local_path),  # Absolute path for debugging
            "file_exists": os.path.exists(local_path),
            "file_size": os.path.getsize(local_path) if os.path.exists(local_path) else 0
        }
    except Exception as e:
        print(f"Error in save_ingredient: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ingredients")
async def list_ingredients(limit: int = 50, offset: int = 0):
    """Get a list of saved ingredients with pagination"""
    if not supabase_db.is_connected():
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        ingredients = supabase_db.list_ingredients(limit=limit, offset=offset)
        
        # Sort ingredients by ID
        ingredients.sort(key=lambda x: x.get('id', 999999))
        
        for ingredient in ingredients:
            if not ingredient.get("name"):
                continue
                
            # Ensure URLs are available
            if not ingredient.get("url") or not ingredient.get("storage_path"):
                try:
                    direct_query = supabase_db.get_image_by_name("ingredient", ingredient["name"])
                    if direct_query and (direct_query.get("url") or direct_query.get("storage_path")):
                        if direct_query.get("url"):
                            ingredient["url"] = direct_query.get("url")
                        if direct_query.get("storage_path"):
                            ingredient["storage_path"] = direct_query.get("storage_path")
                except Exception:
                    pass
                
            # Format local file URLs
            if "url" in ingredient and ingredient["url"] and not ingredient["url"].startswith("http"):
                if "storage_path" in ingredient and ingredient["storage_path"]:
                    if not ingredient["storage_path"].startswith("/"):
                        ingredient["url"] = f"/static/images/ingredients/{os.path.basename(ingredient['storage_path'])}"
                    else:
                        ingredient["url"] = ingredient["storage_path"]
            
            # Always show the save and prompt buttons
            ingredient["stored_in_cloud"] = False
            
        # Get the total count for pagination
        total_count = supabase_db.count_ingredients()
        
        return {
            "ingredients": ingredients,
            "total": total_count,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ingredient/{name}")
async def get_ingredient_by_name(name: str):
    """Get a specific ingredient by name"""
    if not supabase_db.is_connected():
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        ingredient = supabase_db.get_image_by_name("ingredient", name)
        
        if not ingredient:
            # Try case-insensitive search
            all_ingredients = supabase_db.list_ingredients(limit=500)
            name_lower = name.lower()
            
            for item in all_ingredients:
                if item.get("name") and item.get("name").lower() == name_lower:
                    ingredient = item
                    break
                    
        if not ingredient:
            raise HTTPException(status_code=404, detail=f"Ingredient '{name}' not found")
            
        # Fix URLs if needed
        if "url" in ingredient and ingredient["url"] and not ingredient["url"].startswith("http"):
            if "storage_path" in ingredient and ingredient["storage_path"]:
                if not ingredient["storage_path"].startswith("/"):
                    ingredient["url"] = f"/static/images/ingredients/{os.path.basename(ingredient['storage_path'])}"
                else:
                    ingredient["url"] = ingredient["storage_path"]
        
        # Always show the save and prompt buttons
        ingredient["stored_in_cloud"] = False
                    
        return ingredient
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
        

@app.post("/recipes")
async def create_recipe(recipe: RecipeCreate):
    """Create a new recipe in the database"""
    if not supabase_db.is_connected():
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        # Convert to dict for database storage
        recipe_data = recipe.dict()
        result = supabase_db.save_recipe(recipe_data)
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to save recipe")
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recipe/parse")
async def parse_recipe(query: RecipeQuery):
    """Parse a recipe description into structured format with animations"""
    try:
        # Get the recipe from the assistant
        recipe_text = assistant.get_recipe(query.query)
        
        # In a real implementation, this would use an LLM to parse the text response
        # into structured data with animation actions
        # For demo purposes, we'll return the sushi rice recipe
        
        # Sample structured recipe
        structured_recipe = {
            "title": "Sushi Rice",
            "description": "Perfect sushi rice for making your favorite sushi rolls.",
            "prepTime": "10 mins",
            "cookTime": "20 mins",
            "servings": 4,
            "ingredients": [
                {"name": "Japanese short-grain rice", "quantity": "2 cups"},
                {"name": "Water", "quantity": "2 cups"},
                {"name": "Rice vinegar", "quantity": "1/4 cup"},
                {"name": "Sugar", "quantity": "2 tablespoons"},
                {"name": "Salt", "quantity": "1 teaspoon"}
            ],
            "equipment": [
                {"name": "Rice cooker"},
                {"name": "Wooden spoon"},
                {"name": "Large bowl"},
                {"name": "Fan (optional)"}
            ],
            "steps": [
                {
                    "id": 1,
                    "instruction": "Rinse the rice in cold water until the water runs clear, about 2-3 times.",
                    "action": "stir",
                    "ingredients": [
                        {"name": "Japanese short-grain rice", "quantity": "2 cups"},
                        {"name": "Water"}
                    ],
                    "equipment": [
                        {"name": "Large bowl"}
                    ]
                },
                {
                    "id": 2,
                    "instruction": "Add the rinsed rice and 2 cups of water to the rice cooker and cook according to the manufacturer\\'s instructions.",
                    "action": "cook_rice",
                    "ingredients": [
                        {"name": "Japanese short-grain rice"},
                        {"name": "Water", "quantity": "2 cups"}
                    ],
                    "equipment": [
                        {"name": "Rice cooker"}
                    ]
                },
                {
                    "id": 3,
                    "instruction": "In a small bowl, mix the rice vinegar, sugar, and salt until the sugar and salt are dissolved.",
                    "action": "stir",
                    "ingredients": [
                        {"name": "Rice vinegar", "quantity": "1/4 cup"},
                        {"name": "Sugar", "quantity": "2 tablespoons"},
                        {"name": "Salt", "quantity": "1 teaspoon"}
                    ],
                    "equipment": [
                        {"name": "Small bowl"},
                        {"name": "Whisk"}
                    ]
                },
                {
                    "id": 4,
                    "instruction": "Once the rice is cooked, transfer it to a large wooden bowl and pour the vinegar mixture over it.",
                    "action": "stir",
                    "ingredients": [
                        {"name": "Cooked rice"},
                        {"name": "Vinegar mixture"}
                    ],
                    "equipment": [
                        {"name": "Large wooden bowl"},
                        {"name": "Wooden spoon"}
                    ]
                },
                {
                    "id": 5,
                    "instruction": "Gently fold the rice with a wooden spoon to mix the vinegar mixture evenly. Be careful not to mash the rice.",
                    "action": "stir",
                    "ingredients": [
                        {"name": "Seasoned rice"}
                    ],
                    "equipment": [
                        {"name": "Wooden spoon"}
                    ]
                },
                {
                    "id": 6,
                    "instruction": "Fan the rice as you mix it to cool it down quickly and give it a nice shine.",
                    "action": "stir",
                    "ingredients": [
                        {"name": "Seasoned rice"}
                    ],
                    "equipment": [
                        {"name": "Fan (optional)"},
                        {"name": "Wooden spoon"}
                    ]
                }
            ],
            "original_text": recipe_text
        }
        
        # First, clean up any placeholder ingredients in the database
        if supabase_db.is_connected():
            try:
                cleanup_count = supabase_db.cleanup_placeholder_ingredients()
                if cleanup_count > 0:
                    print(f"Cleaned up {cleanup_count} placeholder ingredients before recipe processing")
            except Exception as e:
                print(f"Error cleaning up placeholder ingredients: {e}")
                # Continue even if cleanup fails
        
        # Add AI-generated images if enabled
        if image_generator:
            try:
                # Generate action images for each unique action
                actions = set(step["action"] for step in structured_recipe["steps"])
                for action in actions:
                    image_url = image_generator.generate_cooking_action_image(action)
                    if image_url:
                        # Find all steps with this action and add the image
                        for step in structured_recipe["steps"]:
                            if step["action"] == action:
                                step["action_image"] = image_url
                        
                        # Save image metadata to Supabase if connected
                        if supabase_db.is_connected():
                            prompt = f"2D flat icon of {action}, cooking action, emoji style, minimal cartoon vector art, white background"
                            supabase_db.save_image_metadata(
                                image_type="action",
                                name=action,
                                prompt=prompt,
                                storage_path=image_url,
                                url=f"http://localhost:8000{image_url}"
                            )
                
                # Generate ingredient images
                for ingredient in structured_recipe["ingredients"]:
                    image_url = image_generator.generate_ingredient_image(ingredient["name"])
                    if image_url:
                        ingredient["image"] = image_url
                        
                        # Save image metadata to Supabase if connected
                        if supabase_db.is_connected():
                            prompt = f"2D flat icon of {ingredient['name']}, emoji style, minimal cartoon vector art, white background"
                            supabase_db.save_image_metadata(
                                image_type="ingredient",
                                name=ingredient["name"],
                                prompt=prompt,
                                storage_path=image_url,
                                url=f"http://localhost:8000{image_url}"
                            )
                
                # Generate equipment images
                for equipment in structured_recipe["equipment"]:
                    image_url = image_generator.generate_equipment_image(equipment["name"])
                    if image_url:
                        equipment["image"] = image_url
                        
                        # Save image metadata to Supabase if connected
                        if supabase_db.is_connected():
                            prompt = f"2D flat icon of {equipment['name']}, kitchen tool, emoji style, minimal cartoon vector art, white background"
                            supabase_db.save_image_metadata(
                                image_type="equipment",
                                name=equipment["name"],
                                prompt=prompt,
                                storage_path=image_url,
                                url=f"http://localhost:8000{image_url}"
                            )
                
                # Generate step images
                for step in structured_recipe["steps"]:
                    step_id = f"step_{step['id']}"
                    image_url = image_generator.generate_recipe_step_image(step["instruction"], step_id)
                    if image_url:
                        step["step_image"] = image_url
                        
                        # Save image metadata to Supabase if connected
                        if supabase_db.is_connected():
                            prompt = f"2D flat illustration of {step['instruction']}, cooking step, emoji style, minimal cartoon vector art, white background"
                            supabase_db.save_image_metadata(
                                image_type="step",
                                name=step_id,
                                prompt=prompt,
                                storage_path=image_url,
                                url=f"http://localhost:8000{image_url}"
                            )
            
            except Exception as e:
                print(f"Error generating images: {e}")
                # Continue without images if there's an error
        
        # Save the recipe to Supabase if connected
        if supabase_db.is_connected():
            try:
                # Convert to the format needed for database
                recipe_to_save = {
                    "title": structured_recipe["title"],
                    "description": structured_recipe["description"],
                    "prep_time": structured_recipe["prepTime"],
                    "cook_time": structured_recipe["cookTime"],
                    "servings": structured_recipe["servings"],
                    "ingredients": structured_recipe["ingredients"],
                    "equipment": structured_recipe["equipment"],
                    "steps": structured_recipe["steps"],
                    "original_text": structured_recipe["original_text"]
                }
                
                saved_recipe = supabase_db.save_recipe(recipe_to_save)
                if saved_recipe:
                    # Add the ID from the database to the response
                    structured_recipe["id"] = saved_recipe.get("id")
                    print(f"Saved recipe to database with ID: {saved_recipe.get('id')}")
                    
                    # Run another cleanup after recipe creation
                    cleanup_count = supabase_db.cleanup_placeholder_ingredients()
                    if cleanup_count > 0:
                        print(f"Cleaned up {cleanup_count} placeholder ingredients after recipe creation")
                else:
                    print("Failed to save recipe to database")
            except Exception as e:
                print(f"Error saving recipe to database: {e}")
                # Continue without saving if there's an error
        
        return structured_recipe
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)