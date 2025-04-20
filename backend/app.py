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
from db_manager import db as supabase_db
from oci_storage import OCIObjectStorage

# Load environment variables
load_dotenv()

# Create directories for animations if they don't exist
os.makedirs("static/animations/actions", exist_ok=True)
os.makedirs("static/animations/ingredients", exist_ok=True)

assistant = RecipeAssistant()

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

class RecipeQuery(BaseModel):
    query: str
    
class ChatHistory(BaseModel):
    messages: List[dict]

@app.get("/")
def read_root():
    return {"message": "Recipe Assistant API is running!"}

@app.get("/api-status")
def check_api_status():
    """Check if Supabase is available and working"""
    result = {
        "supabase": {
            "status": "not_configured",
            "message": "Supabase connection not configured"
        }
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

@app.get("/check-ingredient-image/{ingredient}")
async def check_ingredient_image(ingredient: str):
    """Check if an image exists for an ingredient without generating one"""
    try:
        clean_name = ingredient.lower().replace(" ", "_")
        existing_path = f"static/images/ingredients/{clean_name}.png"
        
        if os.path.exists(existing_path):
            abs_path = os.path.abspath(existing_path)
            
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
                    pass  # Silently continue if database error

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
        
        return {
            "exists": False,
            "error": str(e),
            "ingredient": ingredient
        }

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
            if not ingredient.get("url"):
                try:
                    direct_query = supabase_db.get_image_by_name("ingredient", ingredient["name"])
                    if direct_query and direct_query.get("url"):
                        ingredient["url"] = direct_query.get("url")
                except Exception:
                    pass
                
            # Format and clean URLs
            if "url" in ingredient and ingredient["url"]:
                # Handle local paths
                if not ingredient["url"].startswith("http"):
                    if ingredient["url"].startswith("/"):
                        # URL already has a leading slash, keep as is
                        pass
                    else:
                        # Add a leading slash for consistency
                        ingredient["url"] = f"/{ingredient['url']}"
                else:
                    # For HTTP URLs, especially Oracle Cloud ones, clean up spaces
                    if "objectstorage" in ingredient["url"] and " " in ingredient["url"]:
                        # Remove spaces that can break Oracle Cloud URLs
                        old_url = ingredient["url"]
                        ingredient["url"] = old_url.replace(" ", "")

                        # Update the database with the cleaned URL silently
                        try:
                            if ingredient.get("id"):
                                # Create update data with cleaned URL
                                update_data = {
                                    'url': ingredient["url"],
                                    'type': 'ingredient',
                                    'name': ingredient["name"],
                                    'prompt': ingredient.get("prompt", "")
                                }
                                
                                # Update in the database
                                supabase_db.client.table('generated_images').update(update_data).eq('id', ingredient["id"]).execute()
                        except Exception:
                            # Silently continue if update fails
                            pass
            
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
        if "url" in ingredient and ingredient["url"]:
            # Check for local paths
            if not ingredient["url"].startswith("http"):
                if ingredient["url"].startswith("/"):
                    # URL already has a leading slash, keep as is
                    pass
                else:
                    # Add a leading slash for consistency
                    ingredient["url"] = f"/{ingredient['url']}"
            else:
                # For HTTP URLs, especially Oracle Cloud ones, clean up spaces
                if "objectstorage" in ingredient["url"] and " " in ingredient["url"]:
                    # Remove spaces that can break Oracle Cloud URLs
                    old_url = ingredient["url"]
                    ingredient["url"] = old_url.replace(" ", "")

                    # Update the database with the cleaned URL
                    try:
                        if ingredient["id"]:
                            # Create update data with cleaned URL
                            update_data = {
                                'url': ingredient["url"],
                                'type': 'ingredient',
                                'name': ingredient["name"],
                                'prompt': ingredient.get("prompt", "")
                            }
                            
                            # Update in the database
                            supabase_db.client.table('generated_images').update(update_data).eq('id', ingredient["id"]).execute()
                            
                    except Exception as update_err:
                        pass  # Silently continue if update fails

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
                    pass  # Removed debug print
            except Exception as e:
                pass  # Continue even if cleanup fails
        
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

                    # Run another cleanup after recipe creation
                    cleanup_count = supabase_db.cleanup_placeholder_ingredients()
                    if cleanup_count > 0:
                        pass  # Removed debug print
                else:
                    pass  # Removed debug print
            except Exception as e:
                pass  # Continue without saving if there's an error
        
        return structured_recipe
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)