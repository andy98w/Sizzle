"""
Image generation module for recipe steps using OpenAI DALL-E.
"""

import os
import requests
import base64
from datetime import datetime
from typing import Optional, Dict, Any
from openai import OpenAI

from config import OPENAI_API_KEY, OCI_BUCKET_NAME, OCI_NAMESPACE, OCI_REGION
from utils import logger, log_exception, format_oci_url
from oci_storage import upload_file_to_oci

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)


def generate_step_image_prompt(
    step_instruction: str,
    recipe_title: str,
    ingredients: list = None,
    equipment: list = None
) -> str:
    """
    Generate a DALL-E prompt from a recipe step instruction with ingredients and equipment.

    Args:
        step_instruction: The step instruction text
        recipe_title: The recipe title for context
        ingredients: List of ingredient names for this step
        equipment: List of equipment names for this step

    Returns:
        A well-formatted DALL-E prompt
    """
    # Build the scene description with ingredients and equipment
    items = []
    if ingredients:
        items.extend([f"{ing}" for ing in ingredients])
    if equipment:
        items.extend([f"{eq}" for eq in equipment])

    items_str = ", ".join(items) if items else ""

    # Create a minimal, flat illustration-style prompt
    if items_str:
        prompt = f"""Flat illustration showing ONLY {items_str} for '{step_instruction}'.
Style: Extremely minimal flat design, simple vector art, neutral beige/cream background, birds-eye overhead view,
ONLY show the specific items listed: {items_str}, nothing else.
Include hands if action is needed. No extra decorations, no patterns, no textures, no shadows, no labels, no text.
Clean simple shapes with flat colors, 3-4 muted colors maximum (beige, brown, cream tones).
Organized composition like a cooking diagram. NO random tools or ingredients not mentioned."""
    else:
        prompt = f"""Flat illustration of {step_instruction.lower()} for {recipe_title}.
Style: Extremely minimal flat design, simple vector art, neutral beige/cream background, birds-eye overhead view,
ONLY show items directly needed for this action, nothing else.
Include hands if action is needed. No extra decorations, no patterns, no textures, no shadows, no labels, no text.
Clean simple shapes with flat colors, 3-4 muted colors maximum (beige, brown, cream tones).
Organized composition like a cooking diagram."""

    return prompt[:1000]  # DALL-E has a 1000 character limit


def generate_image_with_dalle(prompt: str, size: str = "1792x1024", quality: str = "standard") -> Optional[str]:
    """
    Generate an image using OpenAI DALL-E.

    Args:
        prompt: The text prompt for image generation
        size: Image size (1024x1024, 1024x1792, or 1792x1024)
        quality: Image quality (standard or hd)

    Returns:
        URL of the generated image, or None if generation failed
    """
    try:
        logger.info(f"Generating image with DALL-E: {prompt[:100]}...")

        response = client.images.generate(
            model="dall-e-3",  # or "dall-e-2" for cheaper option
            prompt=prompt,
            size=size,
            quality=quality,
            n=1,
        )

        image_url = response.data[0].url
        logger.info(f"Image generated successfully: {image_url}")
        return image_url

    except Exception as e:
        log_exception(e, "Error generating image with DALL-E")
        return None


def download_image(url: str) -> Optional[bytes]:
    """
    Download an image from a URL.

    Args:
        url: The image URL

    Returns:
        Image bytes, or None if download failed
    """
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.content
    except Exception as e:
        log_exception(e, f"Error downloading image from {url}")
        return None


def generate_and_store_step_image(
    step_id: int,
    step_instruction: str,
    recipe_title: str,
    recipe_id: int,
    step_number: int,
    check_existing: bool = True
) -> Optional[Dict[str, Any]]:
    """
    Generate an image for a recipe step and upload it to OCI storage.

    Args:
        step_id: The step ID
        step_instruction: The step instruction text
        recipe_title: The recipe title
        recipe_id: The recipe ID
        step_number: The step number (for better naming)
        check_existing: If True, skip if image already exists

    Returns:
        Dict with image_url and prompt, or None if generation failed
    """
    try:
        # Use deterministic filename (no timestamp) to prevent duplicates
        filename = f"recipe_steps/recipe_{recipe_id}_step_{step_number}.png"

        # Check if image already exists (optimization)
        if check_existing:
            from oci_storage import OCIObjectStorage
            oci_storage = OCIObjectStorage()
            if oci_storage.object_exists(filename):
                logger.info(f"Image already exists for step {step_id}, skipping generation")
                # Get the full OCI URL for the existing image
                existing_url = oci_storage.get_object_url(filename)
                return {
                    "image_url": existing_url,
                    "prompt": "existing",
                    "generated_at": datetime.now().isoformat(),
                    "skipped": True
                }

        # Fetch step ingredients and equipment from database
        from database import supabase_client

        # Get step ingredients - need to join through recipe_ingredients, not ingredients table
        step_ingredients_result = supabase_client.table("step_ingredients").select(
            "ingredient_id, recipe_ingredients(name)"
        ).eq("step_id", step_id).execute()

        # Get step equipment - need to join through recipe_equipment, not equipment table
        step_equipment_result = supabase_client.table("step_equipment").select(
            "equipment_id, recipe_equipment(name)"
        ).eq("step_id", step_id).execute()

        ingredients = []
        equipment = []

        # Extract ingredient names
        if step_ingredients_result.data:
            ingredients = [si['recipe_ingredients']['name'] for si in step_ingredients_result.data if si.get('recipe_ingredients')]

        # Extract equipment names
        if step_equipment_result.data:
            equipment = [se['recipe_equipment']['name'] for se in step_equipment_result.data if se.get('recipe_equipment')]

        logger.info(f"Step {step_id} ingredients: {ingredients}, equipment: {equipment}")

        # Generate prompt with ingredients and equipment
        prompt = generate_step_image_prompt(step_instruction, recipe_title, ingredients, equipment)
        logger.info(f"Generated prompt for step {step_id}: {prompt}")

        # Generate image with DALL-E
        dalle_url = generate_image_with_dalle(prompt)
        if not dalle_url:
            logger.error(f"Failed to generate image for step {step_id}")
            return None

        # Download the generated image
        image_bytes = download_image(dalle_url)
        if not image_bytes:
            logger.error(f"Failed to download generated image for step {step_id}")
            return None

        # Upload to OCI (will overwrite if exists)
        oci_url = upload_file_to_oci(
            file_content=image_bytes,
            filename=filename,
            content_type="image/png"
        )

        if not oci_url:
            logger.error(f"Failed to upload image to OCI for step {step_id}")
            return None

        logger.info(f"Successfully generated and stored image for step {step_id}: {oci_url}")

        return {
            "image_url": oci_url,
            "prompt": prompt,
            "generated_at": datetime.now().isoformat()
        }

    except Exception as e:
        log_exception(e, f"Error in generate_and_store_step_image for step {step_id}")
        return None
