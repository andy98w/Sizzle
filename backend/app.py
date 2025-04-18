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

# Load environment variables
load_dotenv()

# Create directories for animations if they don't exist
os.makedirs("static/animations/actions", exist_ok=True)
os.makedirs("static/animations/ingredients", exist_ok=True)

# Initialize the RecipeAssistant
assistant = RecipeAssistant()

# Initialize Stability AI generator
stability_api_key = os.getenv("STABILITY_API_KEY")
if stability_api_key:
    image_generator = StabilityAIGenerator(stability_api_key)
else:
    image_generator = None
    print("Warning: STABILITY_API_KEY not found. AI image generation will be disabled.")

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

@app.get("/generate/ingredient/{ingredient}")
async def generate_ingredient_image(ingredient: str):
    """Generate an image for a cooking ingredient"""
    if not image_generator:
        raise HTTPException(status_code=400, detail="Image generation is not available. STABILITY_API_KEY not configured.")
    
    try:
        image_url = image_generator.generate_ingredient_image(ingredient)
        if not image_url:
            raise HTTPException(status_code=500, detail=f"Failed to generate image for ingredient: {ingredient}")
        
        return {
            "success": True,
            "image_url": image_url,
            "ingredient": ingredient
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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