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
from config import OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TIMEOUT
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
      "ingredients": [
        {{"name": "Ingredient used", "quantity": "Amount"}}
      ],
      "equipment": [
        {{"name": "Equipment used"}}
      ]
    }}
  ]
}}

CRITICAL GUIDELINES:
1. Ingredient Names: Use simple, common names (e.g., "Rice" not "Japanese short-grain rice", "Salt" not "Sea salt")
2. Equipment Names: Use generic names (e.g., "Bowl" not "Large wooden bowl", "Pot" not "3-quart saucepan")
3. Steps: Each step should be clear and actionable. Only include ingredients/equipment actually used in that specific step.
4. Quantities: Always include units (cups, tbsp, tsp, oz, g, etc.)
5. Servings: Must be an integer number
6. Times: Format as "X mins" or "X hours" (e.g., "15 mins", "1 hour", "2 hours 30 mins")

OUTPUT ONLY THE JSON OBJECT."""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{recipe_query}")
        ])
    
    def generate_recipe(self, query: str) -> Dict[str, Any]:
        """
        Generate a structured recipe from a user query.

        Args:
            query: User query for a recipe

        Returns:
            Structured recipe data as a dictionary
        """
        if not self.api_key:
            logger.error("Cannot generate recipe: OpenAI API key is not set")
            return None

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