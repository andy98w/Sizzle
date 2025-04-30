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
import re
from dotenv import load_dotenv
from db_manager import db as supabase_db
from oci_storage import OCIObjectStorage

# Load environment variables
load_dotenv()

# Create directories for animations if they don't exist
os.makedirs("static/animations/actions", exist_ok=True)
os.makedirs("static/animations/ingredients", exist_ok=True)

assistant = RecipeAssistant()

# Force reload .env file
load_dotenv(override=True)

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
    """Parse a recipe description into structured format with animations and return matching recipes"""
    try:
        # Search for matching recipes in the database first
        matching_recipes = []
        if supabase_db.is_connected():
            try:
                print(f"Searching for recipes matching: '{query.query}'")
                
                # Use the enhanced database search function to find relevant recipes
                matching_recipes = supabase_db.search_recipes(query.query)
                print(f"Found {len(matching_recipes)} matching recipes")
                
                # If we found matching recipes, return them
                if matching_recipes:
                    return {
                        "matching_recipes": matching_recipes,
                        "count": len(matching_recipes),
                        "query": query.query
                    }
                
                # If no matching recipes, generate one with AI
                print(f"No recipes found for '{query.query}', generating with AI...")
                
                # Get a recipe from the AI assistant
                recipe_text = assistant.get_recipe(query.query)
                
                # Extract title from the first line (should be markdown heading now)
                title_match = re.search(r'#\s*(.+)', recipe_text.split('\n')[0])
                if title_match:
                    title = title_match.group(1).strip()
                else:
                    # Fallback to query if heading not found
                    title = query.query.title()
                    
                # Clean up the title - ensure it's not just an ingredient name
                # Remove common words like "recipe" or "dish"
                title = re.sub(r'\b(?:recipe|dish|how to make|directions for)\b', '', title, flags=re.IGNORECASE).strip()
                
                # If title became too short, use original query
                if len(title) < 3:
                    title = query.query.title()
                
                # Create a structured recipe
                structured_recipe = {
                    "title": title,
                    "description": f"AI-generated recipe for {query.query}",
                    "prep_time": "20 mins",
                    "cook_time": "30 mins",
                    "servings": 4,
                    "ingredients": [],
                    "equipment": [],
                    "steps": [],
                    "original_text": recipe_text
                }
                
                # Parse equipment section from the formatted AI response
                equipment_list = []
                
                # Find the Equipment section (should be between ## Equipment and ## Ingredients)
                equipment_match = re.search(r'##\s*Equipment\s*([\s\S]+?)##\s*Ingredients', recipe_text)
                if equipment_match:
                    equipment_section = equipment_match.group(1).strip()
                    
                    # Extract each item from the list
                    for line in equipment_section.split('\n'):
                        # Look for list items with the format "- Item"
                        item_match = re.match(r'-\s+(.+)', line.strip())
                        if item_match:
                            equipment_name = item_match.group(1).strip()
                            # Skip "list at least X items" instruction
                            if not equipment_name.startswith('(') and not 'needed' in equipment_name.lower():
                                equipment_list.append({"name": equipment_name})
                
                # Check if essential cooking equipment is missing and add it if necessary
                equipment_names_lower = [e["name"].lower() for e in equipment_list]
                
                # Check for baking recipes
                is_baking_recipe = any(word in recipe_text.lower() for word in ["bake", "oven", "degrees", "°f", "°c", "350°", "375°"])
                if is_baking_recipe and not any(word in name for name in equipment_names_lower for word in ["oven"]):
                    equipment_list.append({"name": "Oven"})
                
                # Check for stovetop cooking
                is_stovetop_recipe = any(word in recipe_text.lower() for word in ["simmer", "boil", "sauté", "fry", "skillet", "pan", "pot", "heat"])
                if is_stovetop_recipe and not any(word in name for name in equipment_names_lower for word in ["stove", "stovetop", "burner", "range"]):
                    equipment_list.append({"name": "Stovetop/Range"})
                
                # Check for essential prep tools
                if not any(word in name for name in equipment_names_lower for word in ["knife", "cutting"]):
                    for ingredient in structured_recipe["ingredients"]:
                        if any(word in ingredient["name"].lower() for word in ["chop", "dice", "mince", "slice", "cut"]):
                            equipment_list.append({"name": "Knife and cutting board"})
                            break
                
                # Fallback if still no equipment found
                if not equipment_list:
                    equipment_list = [{"name": "Cooking utensils as needed"}]
                
                structured_recipe["equipment"] = equipment_list
                
                # Parse ingredients section from the formatted AI response
                ingredients_list = []
                
                # Find the Ingredients section (should be between ## Ingredients and ## Instructions)
                ingredients_match = re.search(r'##\s*Ingredients\s*([\s\S]+?)##\s*Instructions', recipe_text)
                if ingredients_match:
                    ingredients_section = ingredients_match.group(1).strip()
                    
                    # Extract each ingredient from the list
                    for line in ingredients_section.split('\n'):
                        # Look for list items with the format "- Quantity Ingredient"
                        item_match = re.match(r'-\s+(.+)', line.strip())
                        if item_match:
                            ingredient_text = item_match.group(1).strip()
                            
                            # Skip instructions line
                            if ingredient_text.startswith('(') or 'ingredient' in ingredient_text.lower():
                                continue
                                
                            # Try to separate quantity from ingredient name
                            quantity_match = re.match(r'^([\d\s/]+(?:\s*(?:cup|tablespoon|teaspoon|pound|g|oz|ml|tbsp|tsp|lb|ounce|gram)s?))\s+(.+)$', ingredient_text)
                            
                            if quantity_match:
                                # We have a quantity and name
                                quantity = quantity_match.group(1).strip()
                                name = quantity_match.group(2).strip()
                                # Capitalize the first letter of the ingredient name
                                name = name[0].upper() + name[1:] if name else ""
                                ingredients_list.append({"name": name, "quantity": quantity})
                            else:
                                # No clear quantity/name separation
                                # Capitalize the first letter
                                capitalized_text = ingredient_text[0].upper() + ingredient_text[1:] if ingredient_text else ""
                                ingredients_list.append({"name": capitalized_text, "quantity": ""})
                
                structured_recipe["ingredients"] = ingredients_list
                
                # Parse steps section from the formatted AI response
                steps_list = []
                
                # Find the Instructions section (should be after ## Instructions)
                instructions_match = re.search(r'##\s*Instructions\s*([\s\S]+?)$', recipe_text)
                if instructions_match:
                    instructions_section = instructions_match.group(1).strip()
                    
                    # Extract each step
                    step_id = 1
                    for line in instructions_section.split('\n'):
                        # Look for numbered steps with the format "1. Step instructions"
                        step_match = re.match(r'(\d+)\.\s+(.+)', line.strip())
                        if step_match:
                            step_num = int(step_match.group(1))
                            step_text = step_match.group(2).strip()
                            
                            # Skip instruction explanation line
                            if step_text.startswith('(') or 'detailed steps' in step_text.lower():
                                continue
                            
                            # Extract ingredients mentioned in this step
                            step_ingredients = []
                            step_text_lower = step_text.lower()
                            
                            for ingredient in structured_recipe["ingredients"]:
                                ingredient_name = ingredient["name"].lower()
                                
                                # Skip very short ingredient names (like "a", "of", etc) to avoid false matches
                                if len(ingredient_name) <= 2:
                                    continue
                                    
                                # Check for ingredient name as a standalone word (not part of another word)
                                if re.search(r'\b' + re.escape(ingredient_name) + r'\b', step_text_lower):
                                    step_ingredients.append({"name": ingredient["name"]})
                            
                            # Extract equipment mentioned in this step
                            step_equipment = []
                            
                            for equip in structured_recipe["equipment"]:
                                equip_name = equip["name"].lower()
                                
                                # Skip very short equipment names to avoid false matches
                                if len(equip_name) <= 2:
                                    continue
                                    
                                # Check for equipment name as a standalone word or partial match for common equipment
                                if re.search(r'\b' + re.escape(equip_name) + r'\b', step_text_lower) or (
                                   # Allow partial matches for common equipment types
                                   any(word in equip_name for word in ["bowl", "pan", "pot", "mixer", "oven"]) and
                                   any(word in step_text_lower for word in ["bowl", "pan", "pot", "mixer", "oven"])
                                ):
                                    step_equipment.append({"name": equip["name"]})
                            
                            # Determine action based on step text
                            action = "cook"  # Default action
                            
                            # Try to determine a more specific action
                            action_keywords = {
                                "mix": ["mix", "stir", "whisk", "blend", "combine", "beat", "fold"],
                                "chop": ["chop", "dice", "mince", "cut", "slice", "julienne"],
                                "cook": ["cook", "bake", "roast", "fry", "sauté", "simmer", "boil", "grill"],
                                "heat": ["heat", "warm", "preheat"],
                                "cool": ["cool", "chill", "refrigerate", "freeze"]
                            }
                            
                            for act, keywords in action_keywords.items():
                                if any(kw in step_text_lower for kw in keywords):
                                    action = act
                                    break
                            
                            # Make sure all steps have some equipment and ingredients for better visualization
                            
                            # We'll be more conservative about adding equipment to steps
                            # Only add equipment when it's highly likely to be used in that step
                            # This prevents weird associations like cake pans for mixing ingredients
                            
                            # Only add ingredient/equipment if it's explicitly mentioned in the step
                            # We won't add additional ingredients that aren't mentioned in the step
                            # This keeps the recipe display more accurate
                            
                            # However, we should ensure mixing steps have bowls and cooking steps have cooking equipment
                            if not step_equipment and structured_recipe["equipment"]:
                                # Limit automatic equipment association to only certain key actions
                                if action == "mix" and "bowl" in step_text_lower:
                                    # Find a bowl in the equipment list
                                    for e in structured_recipe["equipment"]:
                                        if "bowl" in e["name"].lower():
                                            step_equipment.append({"name": e["name"]})
                                            break
                                elif action == "cook" and any(w in step_text_lower for w in ["pan", "bake", "oven"]):
                                    # Find a cooking vessel in the equipment list
                                    for e in structured_recipe["equipment"]:
                                        if any(w in e["name"].lower() for w in ["pan", "pot", "oven", "skillet"]):
                                            step_equipment.append({"name": e["name"]})
                                            break
                            
                            steps_list.append({
                                "id": step_id,
                                "instruction": step_text,
                                "action": action,
                                "ingredients": step_ingredients,
                                "equipment": step_equipment
                            })
                            step_id += 1
                
                structured_recipe["steps"] = steps_list
                
                # Save the AI-generated recipe to the database
                if supabase_db.is_connected():
                    try:
                        print("Saving AI-generated recipe to database")
                        saved_recipe = supabase_db.save_recipe(structured_recipe)
                        if saved_recipe and saved_recipe.get("id"):
                            structured_recipe["id"] = saved_recipe.get("id")
                            print(f"Saved new recipe with ID: {saved_recipe.get('id')}")
                    except Exception as save_err:
                        print(f"Error saving recipe: {save_err}")
                
                # Return the AI-generated recipe
                return {
                    "matching_recipes": [structured_recipe],
                    "count": 1,
                    "query": query.query,
                    "ai_generated": True
                }
                
            except Exception as search_err:
                print(f"ERROR in recipe search: {search_err}")
                import traceback
                traceback.print_exc()
                
                # Return an empty result set with error info
                return {
                    "matching_recipes": [],
                    "count": 0,
                    "query": query.query,
                    "error": str(search_err)
                }
        else:
            # Database not connected
            print("WARNING: Database not connected, cannot search for recipes")
            return {
                "matching_recipes": [],
                "count": 0,
                "query": query.query,
                "error": "Database not connected"
            }
    except Exception as e:
        print(f"ERROR in parse_recipe: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)