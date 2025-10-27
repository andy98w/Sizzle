"""
Recipe Assistant module for generating structured recipes.

This module provides functionality to generate detailed, structured recipes
from user queries using large language models.
"""

import os
import json
import re
from typing import List, Dict, Any, Optional

# Import from third-party libraries
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_openai import ChatOpenAI

# Local imports
from config import OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TIMEOUT, VALIDATE_FOOD_REQUESTS
from utils import logger, log_exception, parse_json_safely

class RecipeAssistant:
    """Assistant for generating structured recipe data."""
    
    def __init__(self, api_key: str = None):
        """
        Initialize the recipe assistant.
        
        Args:
            api_key: Optional OpenAI API key (defaults to environment variable)
        """
        # Use provided API key or environment variable
        self.api_key = api_key or OPENAI_API_KEY
        
        if not self.api_key:
            logger.warning("OpenAI API key is not set. Recipe generation will not work.")
            
        # Initialize the language model
        self.llm = ChatOpenAI(
            model=OPENAI_MODEL,
            openai_api_key=self.api_key,
            request_timeout=OPENAI_TIMEOUT
        )
        
        # Initialize chat history
        self.chat_history = []
        
        # Setup the recipe generation prompt - single step JSON generation
        self.recipe_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert chef and cooking instructor. Generate detailed, accurate recipes in JSON format.

IMPORTANT: Respond with ONLY valid JSON. No markdown, no code blocks, no explanation - just the JSON object.

Use this exact structure:
{{
  "title": "Recipe Name",
  "description": "Brief 1-2 sentence description of the dish",
  "prep_time": "X mins",
  "cook_time": "X mins",
  "servings": 4,
  "ingredients": [
    {{"name": "Ingredient Name", "quantity": "Amount with unit"}},
    {{"name": "Water", "quantity": "2 cups"}}
  ],
  "equipment": [
    {{"name": "Equipment Name"}},
    {{"name": "Large bowl"}}
  ],
  "steps": [
    {{
      "id": 1,
      "instruction": "Clear, detailed instruction for this step",
      "output": "The resulting product/state after this step (e.g., 'beaten eggs in bowl', 'melted butter in pan', 'mixed dough')",
      "dependencies": [2, 3],
      "ingredients": [
        {{"name": "Ingredient used", "quantity": "Amount"}}
      ],
      "equipment": [
        {{"name": "Equipment used"}}
      ]
    }}
  ]
}}

IMPORTANT: Only generate recipes for food and edible items. If the request is clearly not about food (e.g., furniture, electronics, non-edible objects), politely refuse with a helpful message.

CRITICAL GUIDELINES:
1. Ingredient Names: Use simple, common names (e.g., "Rice" not "Japanese short-grain rice", "Salt" not "Sea salt")
2. Equipment Names: Use generic names (e.g., "Bowl" not "Large wooden bowl", "Pot" not "3-quart saucepan")
3. Steps: Each step should be clear and actionable. Only include ingredients/equipment actually used in that specific step.
4. Step Output: REQUIRED - Describe the EXACT VISUAL STATE and physical appearance of what the step produces. ALWAYS include the container/equipment where the food is located (bowl, pot, skillet, plate, etc.). Be EXTREMELY specific about the form, texture, and state of ingredients, especially transformations. For LIQUIDS, emphasize smooth, uniform, pourable texture. For SOLIDS, specify texture and size. This is critical for accurate image generation.

   AVOID AMBIGUOUS TRANSITION LANGUAGE:
   - NEVER use: "starting to form", "beginning to", "just beginning", "partially"
   - These create ambiguous states that confuse image generation
   - Use CONCRETE, DEFINITE states: either fully liquid OR fully solid, not both
   - Each step output should show ONE clear state, not a mid-transition

   KEY TRANSFORMATIONS TO DESCRIBE:
   - EGGS: "cracked raw eggs with visible yolks and whites in bowl" → "smooth pale yellow liquid egg mixture in bowl" → "soft fluffy yellow scrambled egg curds with moist creamy texture in skillet"
   - BUTTER: "solid butter cube" → "melted golden liquid butter pooled in skillet"
   - FLOUR: "white flour powder in bowl" → "shaggy dough mixture in bowl" → "smooth elastic dough ball"
   - VEGETABLES: "whole tomato" → "diced tomato cubes" → "soft cooked tomato pieces"
   - LIQUIDS: Always emphasize "liquid", "smooth", "uniform", "poured" to avoid solid interpretation
   - COOKED EGGS: Always include texture words "soft", "moist", "creamy" to avoid hard boiled appearance

   Examples (GOOD vs BAD):
   - ✓ "smooth pale yellow liquid egg mixture in bowl" (clear: liquid state)
   - ✗ "pale yellow egg mixture starting to thicken" (ambiguous transition)
   - ✓ "runny pale yellow egg liquid with small soft yellow egg curds in skillet" (clear: mostly liquid with some curds)
   - ✗ "eggs beginning to set" (ambiguous: what does this look like?)
   - ✓ "soft fluffy yellow scrambled egg curds with moist creamy texture in skillet" (clear: cooked but soft and moist)
   - ✗ "fluffy yellow scrambled egg curds in skillet" (missing texture - looks hard boiled)
   - ✗ "eggs partially cooked" (ambiguous transition)
   - ✓ "melted golden liquid butter pooled in hot skillet" (clear: liquid state)
   - ✗ "butter starting to melt" (ambiguous: solid or liquid?)

   CRITICAL: Describe the FORM (liquid, solid, powder, chunks, curds, etc.) and COLOR when relevant. If ingredients are in a container from a previous step, ALWAYS mention that container!
   Always specify: exact form/state, color when relevant, texture, AND the container/location.
5. Step Dependencies: CRITICAL - List which previous step IDs this step depends on. Empty array [] if it's a starting step. Use this to track parallel cooking workflows. Examples:
   - Step 1 (crack eggs): dependencies: []
   - Step 2 (whisk eggs): dependencies: [1]
   - Step 3 (melt butter in parallel): dependencies: []
   - Step 4 (combine eggs and butter): dependencies: [2, 3]
6. Quantities: Always include units (cups, tbsp, tsp, oz, g, etc.)
7. Servings: Must be an integer number
8. Times: Format as "X mins" or "X hours" (e.g., "15 mins", "1 hour", "2 hours 30 mins")
9. Final Step: REQUIRED - Always include a final concluding step that shows the completed dish ready to serve. This step should:
   - Come after all cooking/assembly steps are complete
   - Have an instruction like "Serve immediately" or "Transfer to serving plate and enjoy"
   - Have dependencies on the final cooking/assembly step(s)
   - NOT have an output field (this is the final product, nothing comes after)
   - Use minimal or no equipment (maybe just "Plate" or "Serving dish" if transferring)
   - Use no ingredients (this is presentation only)

OUTPUT ONLY THE JSON OBJECT."""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{recipe_query}")
        ])

    def validate_is_food(self, query: str) -> tuple[bool, str]:
        """
        Validate if a query is about food or edible items.

        Args:
            query: User query to validate

        Returns:
            Tuple of (is_valid, error_message). error_message is None if valid.
        """
        if not self.api_key:
            # If no API key, skip validation
            return True, None

        try:
            validation_prompt = f"""Is the following request about food, cooking, or edible items that can be prepared in a kitchen?

Request: "{query}"

Answer with ONLY 'YES' or 'NO'.

Consider 'YES' for:
- Any food dishes, meals, snacks, drinks, desserts
- Cooking techniques or preparations
- Edible items (even unusual ones like edible flowers, insects if culturally appropriate)
- Beverages and drinks

Consider 'NO' for:
- Non-food items (furniture, electronics, tools, etc.)
- Non-edible objects
- Services or activities unrelated to cooking
"""

            response = self.llm.invoke(validation_prompt)
            answer = response.content.strip().upper()

            if 'NO' in answer or 'NOT' in answer:
                return False, "I can only generate recipes for food and edible items. Please try a food-related request like 'scrambled eggs' or 'chocolate chip cookies'."

            return True, None

        except Exception as e:
            # If validation fails, log and allow request (fail open)
            logger.warning(f"Food validation check failed: {str(e)}")
            return True, None

    def generate_recipe(self, query: str) -> Dict[str, Any]:
        """
        Generate a structured recipe from a user query.

        Args:
            query: User query for a recipe

        Returns:
            Structured recipe data as a dictionary, or error dict if validation fails
        """
        if not self.api_key:
            logger.error("Cannot generate recipe: OpenAI API key is not set")
            return None

        # Validate that the query is about food (if enabled in config)
        if VALIDATE_FOOD_REQUESTS:
            is_valid, error_message = self.validate_is_food(query)
            if not is_valid:
                logger.info(f"Rejected non-food request: {query}")
                return {"error": "not_food", "message": error_message}

        try:
            # Generate the recipe directly as JSON in a single call
            recipe_chain = self.recipe_prompt | self.llm
            json_text = recipe_chain.invoke({
                "recipe_query": query,
                "chat_history": self.chat_history
            }).content

            # Parse the JSON
            try:
                # Clean up the response to ensure it's valid JSON
                # Remove any markdown code block markers if present
                json_text = re.sub(r'^```json\s*', '', json_text.strip())
                json_text = re.sub(r'^```\s*', '', json_text.strip())
                json_text = re.sub(r'\s*```$', '', json_text.strip())

                # Parse the JSON
                recipe_data = json.loads(json_text)

                # Ensure the data has the required structure
                self._validate_recipe_data(recipe_data)

                return {
                    "matching_recipes": [recipe_data]
                }
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse recipe JSON: {str(e)}")
                logger.error(f"Raw response: {json_text[:500]}...")
                return None
        except Exception as e:
            log_exception(e, "Error generating recipe")
            return None
    
    def _validate_recipe_data(self, data: Dict[str, Any]) -> None:
        """
        Validate and clean up recipe data.
        
        Args:
            data: Recipe data dictionary to validate
            
        Raises:
            ValueError: If the data is missing required fields
        """
        # Ensure required top-level fields exist
        required_fields = ["title", "ingredients", "steps", "description"]
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Recipe data missing required field: {field}")
                
        # Ensure servings is an integer
        if "servings" in data and not isinstance(data["servings"], int):
            try:
                data["servings"] = int(data["servings"])
            except (ValueError, TypeError):
                data["servings"] = 4  # Default value
                
        # Ensure steps have required fields
        for i, step in enumerate(data.get("steps", [])):
            if "id" not in step:
                step["id"] = i + 1
            if "instruction" not in step:
                raise ValueError(f"Step {i+1} missing required field: instruction")

            # Ensure step has ingredients and equipment lists
            if "ingredients" not in step:
                step["ingredients"] = []
            if "equipment" not in step:
                step["equipment"] = []