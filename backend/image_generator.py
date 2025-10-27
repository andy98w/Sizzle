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
    REPLICATE_API_TOKEN, STABLE_DIFFUSION_MODEL,
    IMAGE_GENERATION_BACKEND, DALLE_MODEL, DALLE_SIZE, DALLE_QUALITY,
    SD_WIDTH, SD_HEIGHT, SD_SEED, HTTP_REQUEST_TIMEOUT
)
from utils import logger, log_exception, format_oci_url
from oci_storage import upload_file_to_oci

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)


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

    # Use output if available, otherwise create appropriate subject
    # For steps with dependencies, the output already describes the merge
    if step_output:
        subject = step_output.lower()

        # Transform container descriptions to prevent duplicate object hallucinations
        # This adds "single" before containers to explicitly tell SD to show only ONE object
        import re

        # Try multiple patterns to catch different phrasings
        container_keywords = r'(bowl|skillet|pot|pan|plate|dish|cutting board|tray)'

        # Pattern 1: "[food] poured into [container]" or "[food] added to [container]"
        poured_pattern = rf'(.+?)\s+(?:poured into|added to|placed in)\s+(?:\w+\s+)?({container_keywords})'
        match = re.search(poured_pattern, subject)
        if match:
            food_desc = match.group(1)
            container = match.group(2)
            # Emphasize "single" to prevent duplicates
            subject = f"single {container} completely filled with {food_desc}, centered, one {container} only"
        else:
            # Pattern 2: "[food] in [container]"
            in_pattern = rf'(.+?)\s+in\s+({container_keywords})'
            match = re.search(in_pattern, subject)
            if match:
                food_desc = match.group(1)
                container = match.group(2)
                # Rewrite with "single" to prevent duplicate objects
                subject = f"single {container} filled with {food_desc}, centered, one {container} only"
    else:
        # For final serving steps with no output, create a generic completed dish prompt
        # Check if this looks like a serving/plating step
        instruction_lower = step_instruction.lower()
        if any(word in instruction_lower for word in ['serving', 'serve immediately', 'plate', 'plating', 'transfer to', 'enjoy immediately']):
            # Final presentation step - show completed dish
            subject = f"completed {recipe_title.lower()} plated and ready to serve"
        else:
            # Regular step without output - use instruction
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
            model=DALLE_MODEL,
            prompt=prompt,
            size=size if size else DALLE_SIZE,
            quality=quality if quality else DALLE_QUALITY,
            n=1,
        )

        image_url = response.data[0].url
        logger.info(f"Image generated successfully: {image_url}")
        return image_url

    except Exception as e:
        log_exception(e, "Error generating image with DALL-E")
        return None


def generate_image_with_stable_diffusion(
    prompt: str,
    width: int = None,
    height: int = None,
    seed: int = None,
    reference_image_url: str = None
) -> Optional[str]:
    """
    Generate an image using Stable Diffusion via Replicate.

    Optimized for flat vector infographic-style recipe illustrations.
    Can use a container equipment image as reference for consistency.

    Args:
        prompt: The text prompt for image generation
        width: Image width (default 1792 for landscape)
        height: Image height (default 1024 for landscape)
        seed: Random seed for reproducibility (ensures consistent style)
        reference_image_url: Optional container equipment image URL to use as reference

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
        # Emphasize preventing duplicate objects, multiple containers, and side objects
        negative_prompt = "duplicate objects, multiple containers, multiple bowls, multiple pans, multiple skillets, two bowls, two pans, two skillets, fused objects, overlapping containers, merging pans, double pan, double skillet, twin pans, connected pans, attached pans, split containers, extra bowl on side, side objects, corner objects, scattered objects, duplicate handles, multiple handles on skillet, extra skillet handle, background objects, objects in corners, extra objects, additional objects, unlisted items, objects not in prompt, items not mentioned, random objects, unrelated items, additional cookware, extra utensils, extra dishes, extra plates, extra tools, disconnected objects, floating objects, separate pieces, text, words, letters, numbers, labels, writing, font, typography, realistic, 3D, photo, photograph, side view, angled view, perspective, gradient, heavy texture, detailed shading, noisy background, watermark, blur, noise, unnecessary decorations, excessive patterns, complex details, harsh shadows, highlights, depth effect, multiple backgrounds, cluttered"

        # Build input parameters (use config defaults if not provided)
        input_params = {
            "prompt": prompt,
            "width": width if width is not None else SD_WIDTH,
            "height": height if height is not None else SD_HEIGHT,
            "seed": seed if seed is not None else SD_SEED,
            "num_inference_steps": 75,  # Increased from 50 for better denoising and prompt adherence
            "guidance_scale": 27.5,  # Increased from 25.0 to further reduce hallucinations
            "scheduler": "DPMSolverMultistep",
            "negative_prompt": negative_prompt
        }

        # If reference image provided, use img2img mode to preserve equipment shape only
        if reference_image_url:
            logger.info(f"Using reference image for equipment consistency: {reference_image_url[:80]}...")
            input_params["image"] = reference_image_url
            # prompt_strength: 0.96 = preserve only 4% of reference (minimal shape hint), modify 96% (all colors, details, ingredients)
            # Higher strength = more changes, lower strength = more preservation
            # We use very high strength to barely preserve shape, giving prompt maximum control
            input_params["prompt_strength"] = 0.96
            logger.info("Using img2img mode with prompt_strength=0.96 to minimize composition influence")

        # Generate image
        output = replicate.run(STABLE_DIFFUSION_MODEL, input=input_params)

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
        response = requests.get(url, timeout=HTTP_REQUEST_TIMEOUT)
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

        # Fetch step output early to check for equipment mentioned in output
        step_result = supabase_client.table("recipe_steps").select("output, dependencies, step_number").eq("id", step_id).execute()
        step_output = None
        if step_result.data and len(step_result.data) > 0:
            step_output = step_result.data[0].get('output')

        # If equipment list has no containers but output mentions one, infer equipment from output
        # This handles cases where LLM didn't add container equipment to step but mentions it in output
        container_keywords = ['bowl', 'pot', 'skillet', 'pan', 'plate', 'dish', 'tray', 'baking sheet']
        has_container = any(any(keyword in eq.lower() for keyword in container_keywords) for eq in equipment) if equipment else False

        if not has_container and step_output:
            output_lower = step_output.lower()
            for keyword in container_keywords:
                if keyword in output_lower:
                    # Found a container mentioned in output - add it to equipment for composition image
                    equipment.append(keyword.capitalize())
                    logger.info(f"Inferred equipment from output: {equipment}")
                    break

        # Composition images disabled - rely purely on text prompts
        # Using composition images was causing color influence issues
        composition_image_url = None

        # # Fetch composition image URL for primary container equipment
        # composition_image_url = None
        # if equipment:
        #     # Define container types (primary equipment that should be used as reference)
        #     container_keywords = ['bowl', 'pot', 'skillet', 'pan', 'plate', 'dish', 'tray', 'baking sheet']
        #
        #     # Find the first container in equipment list
        #     primary_container = None
        #     for eq_name in equipment:
        #         eq_lower = eq_name.lower()
        #         if any(keyword in eq_lower for keyword in container_keywords):
        #             primary_container = eq_name
        #             break
        #
        #     if primary_container:
        #         logger.info(f"Primary container identified: {primary_container}")
        #         # Fetch composition_url from equipment table
        #         try:
        #             # Normalize equipment name for matching (remove hyphens, extra spaces)
        #             normalized_name = primary_container.lower().replace('-', '').replace('  ', ' ')
        #
        #             # Fetch all equipment with composition URLs and match manually
        #             eq_result = supabase_client.table("equipment").select("id, name, composition_url").execute()
        #
        #             # Find best match
        #             for eq in eq_result.data:
        #                 if eq.get('composition_url'):
        #                     eq_normalized = eq['name'].lower().replace('-', '').replace('  ', ' ')
        #                     # Check if the normalized names match
        #                     if normalized_name in eq_normalized or eq_normalized in normalized_name:
        #                         composition_image_url = eq['composition_url']
        #                         logger.info(f"Found composition image for {primary_container} (matched {eq['name']}): {composition_image_url[:80]}...")
        #                         break
        #
        #             if not composition_image_url:
        #                 logger.info(f"No composition image available for {primary_container}")
        #         except Exception as e:
        #             logger.warning(f"Could not fetch composition image: {str(e)}")

        # Fetch dependencies for graph-based workflow (step_output already fetched above)
        dependency_outputs = []

        if step_result.data and len(step_result.data) > 0:
            step_data = step_result.data[0]
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

        # Generate image based on configured backend with retry logic for NSFW failures
        max_retries = 2
        image_url = None

        if IMAGE_GENERATION_BACKEND == 'stable_diffusion':
            # Use configured seed for all image generation for maximum consistency
            # This ensures visual consistency across all recipes and steps
            logger.info(f"Using seed {SD_SEED} for step {step_id}")

            # Retry up to max_retries times if NSFW failure occurs
            for attempt in range(max_retries + 1):
                if attempt > 0:
                    logger.info(f"Retry attempt {attempt} for step {step_id} due to NSFW failure")

                image_url = generate_image_with_stable_diffusion(
                    prompt,
                    seed=SD_SEED,
                    reference_image_url=composition_image_url  # Pass container reference for consistency
                )

                if image_url:
                    break  # Success, exit retry loop

                # If last attempt failed, log and return None
                if attempt == max_retries:
                    logger.error(f"Failed to generate image for step {step_id} after {max_retries + 1} attempts")
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
