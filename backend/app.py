"""Main FastAPI application module for the Sizzle backend."""

import os
import time
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from config import API_CORS_ORIGINS, API_DEBUG, STATIC_DIR, TEMP_DIR, OPENAI_API_KEY, OCI_BUCKET_NAME
from utils import logger, format_api_response, format_error_response, format_oci_url, log_exception
from database import get_database_status, execute_query_dict, execute_query_dict_single_row, supabase_client
from recipe_assistant import RecipeAssistant
from oci_storage import OCIObjectStorage
from image_generator import generate_and_store_step_image

# Create directories for static files if they don't exist
os.makedirs(os.path.join(STATIC_DIR, "animations/actions"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "animations/ingredients"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "images/ingredients"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "images/actions"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "images/steps"), exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# Initialize the FastAPI application
app = FastAPI(
    title="Sizzle API",
    description="API for Sizzle recipe assistant",
    version="1.0.0",
    debug=API_DEBUG
)

# Set up CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=API_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
recipe_assistant = RecipeAssistant()
oci_storage = OCIObjectStorage()

# Mount static files directory
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Helper functions
def format_item_urls(items: List[Dict], *url_fields: str) -> None:
    """Format OCI URLs for items in-place."""
    for item in items:
        for field in url_fields:
            if item.get(field):
                item[field] = format_oci_url(item[field])

def enrich_items_with_images(items: List[Dict], item_type: str) -> None:
    """Fetch and add image URLs to items (ingredients or equipment)."""
    for item in items:
        if item.get('name'):
            try:
                result = supabase_client.table("generated_images").select("url, prompt").eq("type", item_type).ilike("name", item['name']).limit(1).execute()
                if result.data and len(result.data) > 0:
                    item['url'] = format_oci_url(result.data[0].get('url', ''))
                    item['prompt'] = result.data[0].get('prompt')
            except Exception as e:
                logger.warning(f"Could not fetch image for {item_type} '{item['name']}': {str(e)}")

def enrich_recipe_with_full_data(recipe: Dict) -> Dict:
    """Fetch and add all related data to a recipe."""
    recipe_id = recipe['id']

    # Get ingredients and equipment
    ingredients = execute_query_dict("SELECT * FROM recipe_ingredients WHERE recipe_id = %s", (recipe_id,))
    equipment = execute_query_dict("SELECT * FROM recipe_equipment WHERE recipe_id = %s", (recipe_id,))

    # Enrich with images
    enrich_items_with_images(ingredients, "ingredient")
    enrich_items_with_images(equipment, "equipment")

    # Get steps
    steps = execute_query_dict("SELECT * FROM recipe_steps WHERE recipe_id = %s ORDER BY id", (recipe_id,))

    # For each step, get its ingredients and equipment
    for step in steps:
        step_id = step['id']
        step['ingredients'] = execute_query_dict(
            "SELECT ri.* FROM step_ingredients si JOIN recipe_ingredients ri ON si.ingredient_id = ri.id WHERE si.step_id = %s",
            (step_id,)
        )
        step['equipment'] = execute_query_dict(
            "SELECT re.* FROM step_equipment se JOIN recipe_equipment re ON se.equipment_id = re.id WHERE se.step_id = %s",
            (step_id,)
        )

        # Enrich step ingredients and equipment with generated images
        enrich_items_with_images(step['ingredients'], "ingredient")
        enrich_items_with_images(step['equipment'], "equipment")

        # Format all image URLs
        format_item_urls(step['ingredients'], 'url')
        format_item_urls(step['equipment'], 'url')
        format_item_urls([step], 'action_image', 'step_image', 'image_url')

    recipe['ingredients'] = ingredients
    recipe['equipment'] = equipment
    recipe['steps'] = steps
    return recipe

def list_items_with_search(item_type: str, limit: int, offset: int, search: Optional[str]) -> Dict:
    """Generic function to list ingredients or equipment with search and pagination."""
    query = supabase_client.table("generated_images").select("*").eq("type", item_type)

    if search:
        query = query.ilike("name", f"%{search}%")

    query = query.order("id")
    count_result = query.execute()
    total_count = len(count_result.data) if count_result.data else 0

    # Fallback search with individual words if no results
    if search and total_count == 0:
        for word in search.split():
            if len(word) >= 3:
                test_query = supabase_client.table("generated_images").select("id").eq("type", item_type).ilike("name", f"%{word}%")
                test_result = test_query.execute()
                if test_result.data and len(test_result.data) > 0:
                    query = supabase_client.table("generated_images").select("*").eq("type", item_type).ilike("name", f"%{word}%")
                    total_count = len(test_result.data)
                    break

    # Apply pagination
    query_with_pagination = query
    if limit:
        query_with_pagination = query_with_pagination.limit(limit)
    if offset:
        query_with_pagination = query_with_pagination.range(offset, offset + limit - 1)

    result = query_with_pagination.execute()
    items = result.data if result.data else []

    format_item_urls(items, 'url')

    return {"items": items, "total": total_count, "limit": limit, "offset": offset}

# Setup request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log request information and timing."""
    start_time = time.time()
    
    # Process the request
    response = await call_next(request)
    
    # Calculate processing time
    process_time = time.time() - start_time
    
    # Log request details
    logger.info(
        f"{request.method} {request.url.path} "
        f"- Status: {response.status_code} "
        f"- Time: {process_time:.3f}s"
    )
    
    return response

# API Models
class RecipeQuery(BaseModel):
    query: str = Field(..., description="The recipe query or search term")
    
class IngredientCreate(BaseModel):
    name: str = Field(..., description="Ingredient name")
    url: Optional[str] = Field(None, description="Image URL")
    prompt: Optional[str] = Field(None, description="Image generation prompt")
    
class IngredientResponse(BaseModel):
    id: int
    name: str
    url: Optional[str] = None
    prompt: Optional[str] = None
    
class RecipeResponse(BaseModel):
    id: int
    title: str
    description: str
    prep_time: str
    cook_time: str
    servings: int
    ingredients: List[Dict[str, Any]]
    equipment: List[Dict[str, Any]]
    steps: List[Dict[str, Any]]

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    log_exception(exc, f"Unhandled exception in {request.method} {request.url.path}")
    
    # Determine if this is a known exception type
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=format_error_response(exc.detail, exc.status_code)
        )
    
    # Handle unexpected errors
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=format_error_response(
            "An unexpected error occurred",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            {"type": type(exc).__name__} if API_DEBUG else None
        )
    )

# API Status route
@app.get("/api-status")
async def get_api_status():
    """Get the status of the API and its dependencies."""
    # Check database connection
    db_status = get_database_status()
    
    # Check if OpenAI API key is configured
    openai_configured = bool(OPENAI_API_KEY)
    
    # Check OCI storage
    oci_configured = bool(OCI_BUCKET_NAME)
    
    return format_api_response({
        "status": "online",
        "timestamp": time.time(),
        "version": "1.0.0",
        "dependencies": {
            "database": db_status,
            "openai": {"configured": openai_configured},
            "oci_storage": {"configured": oci_configured}
        }
    })

# Recipe parsing endpoint
@app.post("/recipe/parse")
async def parse_recipe(query: RecipeQuery):
    """Parse a recipe query and return structured recipe data."""
    try:
        # First, search for existing recipes in the database using Supabase
        logger.info(f"Searching for recipes matching: {query.query}")

        # Use Supabase text search (ilike for case-insensitive partial match)
        result = supabase_client.table("recipes").select("*").or_(
            f"title.ilike.%{query.query}%,description.ilike.%{query.query}%"
        ).limit(5).execute()

        matching_recipes = result.data if result.data else []

        if matching_recipes and len(matching_recipes) > 0:
            logger.info(f"Found {len(matching_recipes)} matching recipes in database for query: {query.query}")
            enriched_recipes = [enrich_recipe_with_full_data(recipe) for recipe in matching_recipes]
            return format_api_response({"matching_recipes": enriched_recipes})

        # If no matching recipes found, return empty list (frontend will show "generate new recipe" button)
        logger.info(f"No matching recipes found in database for query: {query.query}")
        return format_api_response({"matching_recipes": []})
    except Exception as e:
        log_exception(e, "Error parsing recipe")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse recipe: {str(e)}"
        )

# Recipe generation endpoint
@app.post("/recipe/generate")
async def generate_recipe(query: RecipeQuery, save_to_db: bool = True, auto_generate_images: bool = True):
    """
    Generate a new recipe using AI.

    Args:
        save_to_db: If True, save the generated recipe to database
        auto_generate_images: If True, automatically start generating step images in background
    """
    try:
        from recipe_helpers import save_recipe_to_db

        logger.info(f"Generating new recipe for: {query.query}")
        recipe_data = recipe_assistant.generate_recipe(query.query)

        if not recipe_data:
            raise HTTPException(
                status_code=500,
                detail="Could not generate a recipe for the given query"
            )

        # Save to database if requested (with auto image generation)
        if save_to_db and recipe_data.get('matching_recipes'):
            for recipe in recipe_data['matching_recipes']:
                recipe_id = save_recipe_to_db(recipe, auto_generate_images=auto_generate_images)

                if recipe_id:
                    recipe['id'] = recipe_id
                    logger.info(f"Saved recipe {recipe_id} to database")

                    if auto_generate_images:
                        logger.info(f"Background image generation started for recipe {recipe_id}")

        return format_api_response(recipe_data)
    except Exception as e:
        log_exception(e, "Error generating recipe")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate recipe: {str(e)}"
        )

# Recipe search endpoint
@app.get("/recipes")
async def list_recipes(
    limit: int = 10,
    offset: int = 0,
    search: Optional[str] = None
):
    """List recipes with optional search and pagination."""
    try:
        # Build the query
        query = "SELECT * FROM recipes"
        params = []
        
        # Add search condition if provided
        if search:
            query += " WHERE title ILIKE %s OR description ILIKE %s"
            search_term = f"%{search}%"
            params.extend([search_term, search_term])
        
        # Add pagination
        query += " ORDER BY id DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        # Execute the query
        recipes = execute_query_dict(query, tuple(params))
        
        # Get total count for pagination
        count_query = "SELECT COUNT(*) FROM recipes"
        if search:
            count_query += " WHERE title ILIKE %s OR description ILIKE %s"
            count_params = [f"%{search}%", f"%{search}%"]
        else:
            count_params = []
            
        count_result = execute_query_dict_single_row(count_query, tuple(count_params))
        total_count = count_result.get('count', 0) if count_result else 0
        
        return format_api_response({
            "recipes": recipes,
            "total": total_count,
            "limit": limit,
            "offset": offset
        })
    except Exception as e:
        log_exception(e, "Error listing recipes")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list recipes: {str(e)}"
        )
        
# Get recipe by ID
@app.get("/recipes/{recipe_id}")
async def get_recipe(recipe_id: int):
    """Get a recipe by ID with all related data."""
    try:
        recipe = execute_query_dict_single_row("SELECT * FROM recipes WHERE id = %s", (recipe_id,))
        if not recipe:
            raise HTTPException(status_code=404, detail=f"Recipe with ID {recipe_id} not found")
        return format_api_response(enrich_recipe_with_full_data(recipe))
    except HTTPException:
        raise
    except Exception as e:
        log_exception(e, f"Error getting recipe {recipe_id}")
        raise HTTPException(status_code=500, detail=f"Failed to get recipe: {str(e)}")

# Generate step images for a recipe (with parallel generation)
@app.post("/recipes/{recipe_id}/generate-step-images")
async def generate_recipe_step_images(recipe_id: int, parallel: bool = True, force: bool = False):
    """
    Generate images for all steps in a recipe using DALL-E.

    Args:
        parallel: If True, generate all images in parallel (faster but higher load)
        force: If True, regenerate images even if they already exist
    """
    try:
        from background_tasks import generate_all_step_images_parallel, wait_for_all_images

        # Get recipe details using Supabase
        recipe_result = supabase_client.table("recipes").select("*").eq("id", recipe_id).execute()
        if not recipe_result.data or len(recipe_result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Recipe with ID {recipe_id} not found")
        recipe = recipe_result.data[0]

        # Get all steps for this recipe using Supabase
        steps_result = supabase_client.table("recipe_steps").select("*").eq("recipe_id", recipe_id).order("step_number").execute()
        steps = steps_result.data if steps_result.data else []

        if not steps:
            raise HTTPException(status_code=404, detail=f"No steps found for recipe {recipe_id}")

        if parallel:
            # PARALLEL: Generate all images at once
            logger.info(f"Starting parallel generation of {len(steps)} images for recipe {recipe_id}")

            futures = generate_all_step_images_parallel(
                recipe_id=recipe_id,
                recipe_title=recipe['title'],
                steps=steps,
                check_existing=not force
            )

            # Wait for all to complete (with 5 minute timeout)
            results = wait_for_all_images(futures, timeout=300)

            success_count = sum(1 for r in results if r.get('success'))

            return format_api_response({
                "recipe_id": recipe_id,
                "total_steps": len(steps),
                "successful": success_count,
                "failed": len(steps) - success_count,
                "results": results,
                "mode": "parallel"
            })

        else:
            # SEQUENTIAL: Generate one at a time (original behavior)
            results = []
            for step in steps:
                logger.info(f"Generating image for step {step['step_number']}: {step['instruction'][:50]}...")

                image_data = generate_and_store_step_image(
                    step_id=step['id'],
                    step_instruction=step['instruction'],
                    recipe_title=recipe['title'],
                    recipe_id=recipe_id,
                    step_number=step['step_number'],
                    check_existing=not force
                )

                if image_data:
                    # Update database using Supabase
                    from datetime import datetime
                    supabase_client.table("recipe_steps").update({
                        "image_url": image_data['image_url'],
                        "image_prompt": image_data.get('prompt', ''),
                        "image_generated_at": datetime.now().isoformat()
                    }).eq("id", step['id']).execute()

                    results.append({
                        "step_id": step['id'],
                        "step_number": step['step_number'],
                        "success": True,
                        "image_url": image_data['image_url']
                    })
                else:
                    results.append({
                        "step_id": step['id'],
                        "step_number": step['step_number'],
                        "success": False,
                        "error": "Failed to generate image"
                    })

            success_count = sum(1 for r in results if r['success'])

            return format_api_response({
                "recipe_id": recipe_id,
                "total_steps": len(steps),
                "successful": success_count,
                "failed": len(steps) - success_count,
                "results": results,
                "mode": "sequential"
            })

    except HTTPException:
        raise
    except Exception as e:
        log_exception(e, f"Error generating step images for recipe {recipe_id}")
        raise HTTPException(status_code=500, detail=f"Failed to generate step images: {str(e)}")

# Ingredients endpoints
@app.get("/ingredients")
async def list_ingredients(limit: int = 10, offset: int = 0, search: Optional[str] = None):
    """List ingredients with optional search and pagination."""
    try:
        result = list_items_with_search("ingredient", limit, offset, search)
        return format_api_response({"ingredients": result["items"], "total": result["total"], "limit": limit, "offset": offset})
    except Exception as e:
        log_exception(e, "Error listing ingredients")
        raise HTTPException(status_code=500, detail=f"Failed to list ingredients: {str(e)}")

@app.get("/ingredients/{ingredient_id}")
async def get_ingredient(ingredient_id: int):
    """Get an ingredient by ID."""
    try:
        result = supabase_client.table("generated_images").select("*").eq("id", ingredient_id).eq("type", "ingredient").execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Ingredient with ID {ingredient_id} not found")
        ingredient = result.data[0]
        format_item_urls([ingredient], 'url')
        return format_api_response(ingredient)
    except HTTPException:
        raise
    except Exception as e:
        log_exception(e, f"Error getting ingredient {ingredient_id}")
        raise HTTPException(status_code=500, detail=f"Failed to get ingredient: {str(e)}")

# Equipment endpoints
@app.get("/equipment")
async def list_equipment(limit: int = 10, offset: int = 0, search: Optional[str] = None):
    """List equipment with optional search and pagination."""
    try:
        result = list_items_with_search("equipment", limit, offset, search)
        return format_api_response({"equipment": result["items"], "total": result["total"], "limit": limit, "offset": offset})
    except Exception as e:
        log_exception(e, "Error listing equipment")
        raise HTTPException(status_code=500, detail=f"Failed to list equipment: {str(e)}")

@app.get("/equipment/{equipment_id}")
async def get_equipment(equipment_id: int):
    """Get an equipment item by ID."""
    try:
        result = supabase_client.table("generated_images").select("*").eq("id", equipment_id).eq("type", "equipment").execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Equipment with ID {equipment_id} not found")
        equipment_item = result.data[0]
        format_item_urls([equipment_item], 'url')
        return format_api_response(equipment_item)
    except HTTPException:
        raise
    except Exception as e:
        log_exception(e, f"Error getting equipment {equipment_id}")
        raise HTTPException(status_code=500, detail=f"Failed to get equipment: {str(e)}")

# Main entry point
if __name__ == "__main__":
    import uvicorn
    from config import API_HOST, API_PORT
    
    logger.info(f"Starting Sizzle API on {API_HOST}:{API_PORT}")
    uvicorn.run("app:app", host=API_HOST, port=API_PORT, reload=API_DEBUG)