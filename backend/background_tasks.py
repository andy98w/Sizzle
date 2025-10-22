"""
Background task management for async operations like image generation.
"""

import threading
from typing import Dict, Any, List, Optional
from concurrent.futures import ThreadPoolExecutor, Future
from utils import logger, log_exception
from image_generator import generate_and_store_step_image

# Global thread pool for background tasks
_executor = ThreadPoolExecutor(max_workers=5)


def generate_step_image_async(
    step_id: int,
    step_number: int,
    step_instruction: str,
    recipe_id: int,
    recipe_title: str,
    check_existing: bool = True
) -> Future:
    """
    Start generating a step image in the background.

    Args:
        check_existing: If True, skip generation if image already exists

    Returns a Future that can be used to check status or get result.
    """
    def task():
        try:
            logger.info(f"Background: Generating image for recipe {recipe_id}, step {step_number}")

            image_data = generate_and_store_step_image(
                step_id=step_id,
                step_instruction=step_instruction,
                recipe_title=recipe_title,
                recipe_id=recipe_id,
                step_number=step_number,
                check_existing=check_existing
            )

            if image_data:
                # Update database with image URL using helper
                from recipe_helpers import update_recipe_step_image
                update_recipe_step_image(
                    step_id=step_id,
                    image_url=image_data['image_url'],
                    prompt=image_data.get('prompt', '')
                )
                logger.info(f"Background: Successfully generated image for step {step_number}")
                return {"success": True, "step_id": step_id, **image_data}
            else:
                logger.error(f"Background: Failed to generate image for step {step_number}")
                return {"success": False, "step_id": step_id}

        except Exception as e:
            log_exception(e, f"Background task error for step {step_id}")
            return {"success": False, "step_id": step_id, "error": str(e)}

    return _executor.submit(task)


def generate_all_step_images_parallel(
    recipe_id: int,
    recipe_title: str,
    steps: List[Dict[str, Any]],
    check_existing: bool = True
) -> List[Future]:
    """
    Generate images for all steps in parallel.

    Args:
        recipe_id: The recipe ID
        recipe_title: The recipe title
        steps: List of step dictionaries with id, step_number, instruction
        check_existing: If True, skip generation if image already exists

    Returns:
        List of Futures for each image generation task
    """
    futures = []

    for step in steps:
        future = generate_step_image_async(
            step_id=step['id'],
            step_number=step['step_number'],
            step_instruction=step['instruction'],
            recipe_id=recipe_id,
            recipe_title=recipe_title,
            check_existing=check_existing
        )
        futures.append(future)

    logger.info(f"Started parallel generation of {len(futures)} images for recipe {recipe_id}")
    return futures


def wait_for_all_images(futures: List[Future], timeout: Optional[int] = None) -> List[Dict]:
    """
    Wait for all image generation tasks to complete.

    Args:
        futures: List of Future objects from generate_step_image_async
        timeout: Maximum seconds to wait (None = wait forever)

    Returns:
        List of results from each task
    """
    results = []
    for future in futures:
        try:
            result = future.result(timeout=timeout)
            results.append(result)
        except Exception as e:
            log_exception(e, "Error waiting for image generation")
            results.append({"success": False, "error": str(e)})

    return results


# Callback-based approach (fire and forget)
def generate_step_image_callback(
    step_id: int,
    step_number: int,
    step_instruction: str,
    recipe_id: int,
    recipe_title: str,
    on_complete: Optional[callable] = None
):
    """
    Generate step image with optional callback when complete.

    Args:
        on_complete: Function to call when done, receives result dict
    """
    def task():
        result = generate_and_store_step_image(
            step_id=step_id,
            step_instruction=step_instruction,
            recipe_title=recipe_title,
            recipe_id=recipe_id,
            step_number=step_number,
            check_existing=True
        )

        if result:
            from recipe_helpers import update_recipe_step_image
            update_recipe_step_image(
                step_id=step_id,
                image_url=result['image_url'],
                prompt=result.get('prompt', '')
            )

        if on_complete:
            on_complete(result)

        return result

    _executor.submit(task)
