"""
Image generation module for recipe steps using OpenAI DALL-E.
"""

import os
import requests
import base64
from datetime import datetime
from typing import Optional, Dict, Any
from openai import OpenAI
import replicate

from config import (
    OPENAI_API_KEY, OCI_BUCKET_NAME, OCI_NAMESPACE, OCI_REGION,
    REPLICATE_API_TOKEN, STABLE_DIFFUSION_MODEL
)
from utils import logger, log_exception, format_oci_url
from oci_storage import upload_file_to_oci

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

# Image generation backend: 'dalle' or 'stable_diffusion'
IMAGE_GENERATION_BACKEND = os.environ.get('IMAGE_GENERATION_BACKEND', 'stable_diffusion')


def generate_step_image_prompt(
    step_instruction: str,
    recipe_title: str,
    ingredients: list = None,
    equipment: list = None,
    step_output: str = None,
    dependency_outputs: list = None
) -> str:
    """
    Generate an optimized Stable Diffusion prompt from a recipe step instruction.

    Creates simple, clean single-object illustrations optimized for SD.
    Uses dependency graph to avoid hallucinating items from unrelated previous steps.

    Args:
        step_instruction: The step instruction text
        recipe_title: The recipe title for context
        ingredients: List of ingredient names for this step
        equipment: List of equipment names for this step
        step_output: The product/result of this step (e.g., "beaten eggs in bowl")
        dependency_outputs: List of outputs from steps this step depends on

    Returns:
        A well-formatted SD prompt (under 200 chars for optimal results)
    """
    # Build item list from ingredients and equipment
    items_to_show = []
    if ingredients:
        items_to_show.extend(ingredients)
    if equipment:
        items_to_show.extend(equipment)

    items_list = ", ".join(items_to_show) if items_to_show else "cooking items"

    # Use output if available, otherwise use instruction
    # For steps with dependencies, the output already describes the merge
    if step_output:
        subject = step_output.lower()
    else:
        instruction_lower = step_instruction.lower()
        subject = f"{instruction_lower}, {items_list}"

    # Ultra-minimal prompt - less room for hallucination
    # The output already captures dependencies (e.g., "egg mixture cooking in skillet")
    # so we don't need to explicitly list dependency outputs

    # Be very explicit: ONLY show what's mentioned, nothing else
    prompt = f"simple flat illustration, overhead view, ONLY {subject}, no extra objects, plain tan background, vector style"

    # Keep very short
    return prompt[:180]


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


def generate_image_with_stable_diffusion(prompt: str, width: int = 1792, height: int = 1024, seed: int = 42) -> Optional[str]:
    """
    Generate an image using Stable Diffusion via Replicate.

    Optimized for flat vector infographic-style recipe illustrations.

    Args:
        prompt: The text prompt for image generation
        width: Image width (default 1792 for landscape)
        height: Image height (default 1024 for landscape)
        seed: Random seed for reproducibility (ensures consistent style)

    Returns:
        URL of the generated image, or None if generation failed
    """
    try:
        if not REPLICATE_API_TOKEN:
            logger.error("REPLICATE_API_TOKEN not configured")
            return None

        logger.info(f"Generating image with Stable Diffusion: {prompt[:100]}...")

        # Set the API token
        os.environ["REPLICATE_API_TOKEN"] = REPLICATE_API_TOKEN

        # Generic negative prompt - avoid hallucinations without blocking specific foods
        # Focus on rejecting ANY objects not explicitly mentioned in the prompt
        negative_prompt = "extra objects, additional objects, unlisted items, objects not in prompt, items not mentioned, random objects, unrelated items, additional cookware, extra utensils, extra dishes, extra plates, extra tools, disconnected objects, floating objects, separate pieces, text, words, letters, numbers, labels, writing, font, typography, realistic, 3D, photo, photograph, side view, angled view, perspective, gradient, heavy texture, detailed shading, noisy background, watermark, blur, noise, unnecessary decorations, excessive patterns, complex details, harsh shadows, highlights, depth effect, multiple backgrounds, cluttered"

        # Generate image with MAXIMUM constraint
        output = replicate.run(
            STABLE_DIFFUSION_MODEL,
            input={
                "prompt": prompt,
                "width": width,
                "height": height,
                "seed": seed,  # Fixed seed for consistency
                "num_inference_steps": 50,  # Maximum steps for accuracy
                "guidance_scale": 15.0,  # ULTRA high = maximum prompt adherence
                "scheduler": "DPMSolverMultistep",
                "negative_prompt": negative_prompt
            }
        )

        # Output is a list of URLs
        if output and len(output) > 0:
            image_url = output[0]
            logger.info(f"Image generated successfully with Stable Diffusion: {image_url}")
            return image_url
        else:
            logger.error("Stable Diffusion returned no output")
            return None

    except Exception as e:
        log_exception(e, "Error generating image with Stable Diffusion")
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

        # Fetch step output and dependencies for graph-based workflow
        step_result = supabase_client.table("recipe_steps").select("output, dependencies, step_number").eq("id", step_id).execute()
        step_output = None
        dependency_outputs = []

        if step_result.data and len(step_result.data) > 0:
            step_data = step_result.data[0]
            step_output = step_data.get('output')
            dependencies = step_data.get('dependencies', [])
            current_step_number = step_data.get('step_number')

            if step_output:
                logger.info(f"Step {step_id} output: {step_output}")

            # Fetch outputs from dependency steps
            if dependencies:
                logger.info(f"Step {step_id} depends on steps: {dependencies}")
                for dep_step_num in dependencies:
                    dep_result = supabase_client.table("recipe_steps").select("output").eq("recipe_id", recipe_id).eq("step_number", dep_step_num).execute()
                    if dep_result.data and len(dep_result.data) > 0:
                        dep_output = dep_result.data[0].get('output')
                        if dep_output:
                            dependency_outputs.append(dep_output)
                            logger.info(f"  Dependency step {dep_step_num} output: {dep_output}")

        # Generate prompt with dependencies context
        prompt = generate_step_image_prompt(step_instruction, recipe_title, ingredients, equipment, step_output, dependency_outputs)
        logger.info(f"Generated prompt for step {step_id}: {prompt}")

        # Generate image based on configured backend
        if IMAGE_GENERATION_BACKEND == 'stable_diffusion':
            # Use unique seed per step for varied compositions while maintaining determinism
            # This prevents artifact carryover between steps (e.g., hallucinated objects appearing in same position)
            step_seed = 1000 + step_id  # Unique but deterministic seed for each step
            logger.info(f"Using seed {step_seed} for step {step_id}")
            image_url = generate_image_with_stable_diffusion(prompt, seed=step_seed)
        else:
            # Fall back to DALL-E
            image_url = generate_image_with_dalle(prompt)

        if not image_url:
            logger.error(f"Failed to generate image for step {step_id}")
            return None

        # Download the generated image
        image_bytes = download_image(image_url)
        if not image_bytes:
            logger.error(f"Failed to download generated image for step {step_id}")
            return None

        # Upload to OCI without resizing (step images should maintain landscape aspect ratio)
        oci_url = upload_file_to_oci(
            file_content=image_bytes,
            filename=filename,
            content_type="image/png",
            resize=False  # Don't resize step images - keep them landscape
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
