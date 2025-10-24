"""
Helper functions for saving recipes and managing recipe data.
Consolidates database operations and integrates with image generation.
"""

from typing import Dict, Any, List, Optional
from database import supabase_client
from utils import logger, log_exception
from background_tasks import generate_step_image_async


def save_recipe_to_db(recipe_data: Dict[str, Any], auto_generate_images: bool = True) -> Optional[int]:
    """
    Save a complete recipe to the database with all related data.
    If a recipe with the same title exists, it will be overwritten.

    Args:
        recipe_data: Recipe dictionary with title, description, ingredients, equipment, steps
        auto_generate_images: If True, automatically start generating step images in background

    Returns:
        recipe_id if successful, None otherwise
    """
    try:
        # Check if a recipe with the same title already exists
        recipe_title = recipe_data.get('title')
        existing_recipe = _get_existing_recipe_by_title(recipe_title)

        if existing_recipe:
            recipe_id = existing_recipe['id']
            logger.info(f"Found existing recipe with ID {recipe_id}: {recipe_title}. Overwriting...")

            # Delete all related data for the existing recipe
            _delete_recipe_data(recipe_id)

            # Update the main recipe record
            _update_recipe(recipe_id, recipe_data)
        else:
            # 1. Insert main recipe
            recipe_id = _insert_recipe(recipe_data)
            if not recipe_id:
                logger.error("Failed to insert recipe")
                return None

            logger.info(f"Inserted new recipe {recipe_id}: {recipe_data.get('title')}")

        # 2. Insert ingredients
        if recipe_data.get('ingredients'):
            _insert_recipe_ingredients(recipe_id, recipe_data['ingredients'])

        # 3. Insert equipment
        if recipe_data.get('equipment'):
            _insert_recipe_equipment(recipe_id, recipe_data['equipment'])

        # 4. Insert steps (and optionally trigger image generation)
        if recipe_data.get('steps'):
            _insert_recipe_steps(
                recipe_id,
                recipe_data['steps'],
                recipe_title=recipe_data.get('title', 'Unknown Recipe'),
                auto_generate_images=auto_generate_images
            )

        logger.info(f"Successfully saved complete recipe {recipe_id}")
        return recipe_id

    except Exception as e:
        log_exception(e, "Error saving recipe to database")
        return None


def _get_existing_recipe_by_title(title: str) -> Optional[Dict[str, Any]]:
    """Check if a recipe with the given title already exists."""
    if not title:
        return None

    try:
        result = supabase_client.table("recipes").select("*").ilike("title", title).limit(1).execute()

        if result.data and len(result.data) > 0:
            return result.data[0]
        return None

    except Exception as e:
        log_exception(e, f"Error checking for existing recipe: {title}")
        return None


def _delete_recipe_data(recipe_id: int):
    """Delete all related data for a recipe (ingredients, equipment, steps)."""
    try:
        # Get all step IDs for this recipe first
        steps_result = supabase_client.table("recipe_steps").select("id").eq("recipe_id", recipe_id).execute()
        step_ids = [step['id'] for step in steps_result.data] if steps_result.data else []

        # Delete step ingredients and equipment for all steps
        for step_id in step_ids:
            supabase_client.table("step_ingredients").delete().eq("step_id", step_id).execute()
            supabase_client.table("step_equipment").delete().eq("step_id", step_id).execute()

        # Delete recipe steps
        supabase_client.table("recipe_steps").delete().eq("recipe_id", recipe_id).execute()

        # Delete recipe ingredients
        supabase_client.table("recipe_ingredients").delete().eq("recipe_id", recipe_id).execute()

        # Delete recipe equipment
        supabase_client.table("recipe_equipment").delete().eq("recipe_id", recipe_id).execute()

        logger.info(f"Deleted all related data for recipe {recipe_id}")

    except Exception as e:
        log_exception(e, f"Error deleting recipe data for recipe {recipe_id}")


def _update_recipe(recipe_id: int, recipe_data: Dict[str, Any]):
    """Update the main recipe record."""
    try:
        recipe_update = {
            "title": recipe_data.get('title'),
            "description": recipe_data.get('description'),
            "prep_time": recipe_data.get('prep_time') or recipe_data.get('prepTime'),
            "cook_time": recipe_data.get('cook_time') or recipe_data.get('cookTime'),
            "servings": recipe_data.get('servings', 4)
        }

        supabase_client.table("recipes").update(recipe_update).eq("id", recipe_id).execute()
        logger.info(f"Updated recipe {recipe_id}: {recipe_data.get('title')}")

    except Exception as e:
        log_exception(e, f"Error updating recipe {recipe_id}")


def _insert_recipe(recipe_data: Dict[str, Any]) -> Optional[int]:
    """Insert the main recipe record."""
    try:
        recipe_insert = {
            "title": recipe_data.get('title'),
            "description": recipe_data.get('description'),
            "prep_time": recipe_data.get('prep_time') or recipe_data.get('prepTime'),
            "cook_time": recipe_data.get('cook_time') or recipe_data.get('cookTime'),
            "servings": recipe_data.get('servings', 4)
        }

        result = supabase_client.table("recipes").insert(recipe_insert).execute()

        if result.data and len(result.data) > 0:
            return result.data[0]['id']
        return None

    except Exception as e:
        log_exception(e, "Error inserting recipe")
        return None


def _insert_recipe_ingredients(recipe_id: int, ingredients: List[Dict[str, Any]]):
    """Insert recipe ingredients."""
    try:
        for ingredient in ingredients:
            ingredient_name = ingredient.get('name')
            if not ingredient_name:
                logger.warning("Skipping ingredient with no name")
                continue

            # Get or create the ingredient
            ingredient_id = _get_or_create_ingredient(ingredient_name)

            if ingredient_id:
                # Extract quantity and unit from the ingredient data
                # Handle both "2 cups" format and separate quantity/unit
                quantity_str = ingredient.get('quantity', '')
                unit = ingredient.get('unit', '')

                # Link to recipe - include name since it's required
                link_data = {
                    "recipe_id": recipe_id,
                    "ingredient_id": ingredient_id,
                    "name": ingredient_name,  # Add name field
                    "quantity": quantity_str,
                    "unit": unit
                }

                # Insert ingredient link
                supabase_client.table("recipe_ingredients").insert(link_data).execute()
                logger.debug(f"Inserted ingredient: {ingredient_name}")

    except Exception as e:
        log_exception(e, "Error inserting recipe ingredients")


def _insert_recipe_equipment(recipe_id: int, equipment_list: List[Dict[str, Any]]):
    """Insert recipe equipment."""
    try:
        for equipment in equipment_list:
            equipment_name = equipment.get('name')
            if not equipment_name:
                logger.warning("Skipping equipment with no name")
                continue

            # Get or create the equipment
            equipment_id = _get_or_create_equipment(equipment_name)

            if equipment_id:
                # Link to recipe - include name since it's required
                link_data = {
                    "recipe_id": recipe_id,
                    "equipment_id": equipment_id,
                    "name": equipment_name  # Add name field
                }

                # Insert equipment link
                supabase_client.table("recipe_equipment").insert(link_data).execute()
                logger.debug(f"Inserted equipment: {equipment_name}")

    except Exception as e:
        log_exception(e, "Error inserting recipe equipment")


def _insert_recipe_steps(
    recipe_id: int,
    steps: List[Dict[str, Any]],
    recipe_title: str,
    auto_generate_images: bool = True
):
    """
    Insert recipe steps and optionally trigger image generation.

    This is where the magic happens - as each step is saved,
    we can immediately start generating its image in the background!
    """
    try:
        for step in steps:
            step_number = step.get('step_number') or step.get('id')
            instruction = step.get('instruction')

            if not instruction:
                logger.warning(f"Step {step_number} has no instruction, skipping")
                continue

            # Insert the step (including output and dependencies if available)
            step_data = {
                "recipe_id": recipe_id,
                "step_number": step_number,
                "instruction": instruction,
                "output": step.get('output'),  # Step output for better image generation
                "dependencies": step.get('dependencies', [])  # Step dependencies for graph-based workflows
            }

            result = supabase_client.table("recipe_steps").insert(step_data).execute()

            if not result.data or len(result.data) == 0:
                logger.error(f"Failed to insert step {step_number}")
                continue

            step_id = result.data[0]['id']
            logger.info(f"Inserted step {step_number} with ID {step_id}")

            # Insert step ingredients
            if step.get('ingredients'):
                _insert_step_ingredients(step_id, step['ingredients'])

            # Insert step equipment
            if step.get('equipment'):
                _insert_step_equipment(step_id, step['equipment'])

            # 🚀 AUTO-GENERATE IMAGE IN BACKGROUND!
            if auto_generate_images:
                logger.info(f"Starting async image generation for step {step_number}")
                generate_step_image_async(
                    step_id=step_id,
                    step_number=step_number,
                    step_instruction=instruction,
                    recipe_id=recipe_id,
                    recipe_title=recipe_title
                )

    except Exception as e:
        log_exception(e, "Error inserting recipe steps")


def _insert_step_ingredients(step_id: int, ingredients: List[Dict[str, Any]]):
    """Link ingredients to a step."""
    try:
        # First get the recipe_id from this step
        step_result = supabase_client.table("recipe_steps").select("recipe_id").eq("id", step_id).execute()
        if not step_result.data or len(step_result.data) == 0:
            logger.error(f"Could not find step {step_id}")
            return

        recipe_id = step_result.data[0]['recipe_id']

        for ingredient in ingredients:
            ingredient_name = ingredient.get('name')
            if not ingredient_name:
                continue

            # Find the recipe_ingredients row for this recipe and ingredient name
            recipe_ing_result = supabase_client.table("recipe_ingredients").select("id").eq("recipe_id", recipe_id).ilike("name", ingredient_name).execute()

            if recipe_ing_result.data and len(recipe_ing_result.data) > 0:
                recipe_ingredient_id = recipe_ing_result.data[0]['id']

                link_data = {
                    "step_id": step_id,
                    "ingredient_id": recipe_ingredient_id  # Use recipe_ingredients.id, not ingredients.id
                }
                supabase_client.table("step_ingredients").insert(link_data).execute()

    except Exception as e:
        log_exception(e, "Error inserting step ingredients")


def _insert_step_equipment(step_id: int, equipment_list: List[Dict[str, Any]]):
    """Link equipment to a step."""
    try:
        # First get the recipe_id from this step
        step_result = supabase_client.table("recipe_steps").select("recipe_id").eq("id", step_id).execute()
        if not step_result.data or len(step_result.data) == 0:
            logger.error(f"Could not find step {step_id}")
            return

        recipe_id = step_result.data[0]['recipe_id']

        for equipment in equipment_list:
            equipment_name = equipment.get('name')
            if not equipment_name:
                continue

            # Find the recipe_equipment row for this recipe and equipment name
            recipe_eq_result = supabase_client.table("recipe_equipment").select("id").eq("recipe_id", recipe_id).ilike("name", equipment_name).execute()

            if recipe_eq_result.data and len(recipe_eq_result.data) > 0:
                recipe_equipment_id = recipe_eq_result.data[0]['id']

                link_data = {
                    "step_id": step_id,
                    "equipment_id": recipe_equipment_id  # Use recipe_equipment.id, not equipment.id
                }
                supabase_client.table("step_equipment").insert(link_data).execute()

    except Exception as e:
        log_exception(e, "Error inserting step equipment")


def _get_or_create_ingredient(name: str) -> Optional[int]:
    """Get existing ingredient or create new one."""
    if not name:
        return None

    try:
        # Try to get existing (case-insensitive)
        result = supabase_client.table("ingredients").select("id").ilike("name", name).limit(1).execute()

        if result.data and len(result.data) > 0:
            return result.data[0]['id']

        # Create new
        insert_result = supabase_client.table("ingredients").insert({"name": name}).execute()

        if insert_result.data and len(insert_result.data) > 0:
            return insert_result.data[0]['id']

        return None

    except Exception as e:
        log_exception(e, f"Error getting/creating ingredient: {name}")
        return None


def _get_or_create_equipment(name: str) -> Optional[int]:
    """Get existing equipment or create new one."""
    if not name:
        return None

    try:
        # Try to get existing (case-insensitive)
        result = supabase_client.table("equipment").select("id").ilike("name", name).limit(1).execute()

        if result.data and len(result.data) > 0:
            return result.data[0]['id']

        # Create new
        insert_result = supabase_client.table("equipment").insert({"name": name}).execute()

        if insert_result.data and len(insert_result.data) > 0:
            return insert_result.data[0]['id']

        return None

    except Exception as e:
        log_exception(e, f"Error getting/creating equipment: {name}")
        return None


def update_recipe_step_image(step_id: int, image_url: str, prompt: str):
    """
    Update a recipe step with its generated image.
    Called by background tasks when image generation completes.
    """
    try:
        update_data = {
            "image_url": image_url,
            "image_prompt": prompt,
            "image_generated_at": "now()"
        }

        supabase_client.table("recipe_steps").update(update_data).eq("id", step_id).execute()
        logger.info(f"Updated step {step_id} with generated image")

    except Exception as e:
        log_exception(e, f"Error updating step {step_id} with image")
