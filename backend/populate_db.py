#!/usr/bin/env python3
"""
Populate Supabase database with sample recipes
"""

import os
from dotenv import load_dotenv
from supabase import create_client
import json

load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

# Sample recipes to populate
SAMPLE_RECIPES = [
    {
        "title": "Classic Sushi Rice",
        "description": "Perfectly seasoned Japanese sushi rice, the foundation of great sushi",
        "prep_time": "10 mins",
        "cook_time": "20 mins",
        "servings": 4,
        "ingredients": [
            {"name": "Japanese short-grain rice", "quantity": "2", "unit": "cups"},
            {"name": "Water", "quantity": "2.5", "unit": "cups"},
            {"name": "Rice vinegar", "quantity": "1/4", "unit": "cup"},
            {"name": "Sugar", "quantity": "2", "unit": "tablespoons"},
            {"name": "Salt", "quantity": "1", "unit": "teaspoon"}
        ],
        "equipment": [
            {"name": "Rice cooker or pot"},
            {"name": "Large bowl"},
            {"name": "Wooden spoon"}
        ],
        "steps": [
            {
                "step_number": 1,
                "instruction": "Rinse the rice in cold water until the water runs clear, about 3-4 times",
                "time_minutes": 5,
                "ingredients": ["Japanese short-grain rice", "Water"],
                "equipment": ["Large bowl"]
            },
            {
                "step_number": 2,
                "instruction": "Cook the rice with water in a rice cooker or pot until fully cooked",
                "time_minutes": 20,
                "ingredients": ["Japanese short-grain rice", "Water"],
                "equipment": ["Rice cooker or pot"]
            },
            {
                "step_number": 3,
                "instruction": "Mix rice vinegar, sugar, and salt in a small bowl until dissolved",
                "time_minutes": 2,
                "ingredients": ["Rice vinegar", "Sugar", "Salt"],
                "equipment": ["Large bowl"]
            },
            {
                "step_number": 4,
                "instruction": "Transfer hot rice to a large bowl and gently fold in the vinegar mixture",
                "time_minutes": 3,
                "ingredients": [],
                "equipment": ["Large bowl", "Wooden spoon"]
            }
        ]
    },
    {
        "title": "Chocolate Chip Cookies",
        "description": "Classic homemade chocolate chip cookies with a crispy edge and chewy center",
        "prep_time": "15 mins",
        "cook_time": "12 mins",
        "servings": 24,
        "ingredients": [
            {"name": "All-purpose flour", "quantity": "2.25", "unit": "cups"},
            {"name": "Butter", "quantity": "1", "unit": "cup"},
            {"name": "Brown sugar", "quantity": "3/4", "unit": "cup"},
            {"name": "White sugar", "quantity": "3/4", "unit": "cup"},
            {"name": "Eggs", "quantity": "2", "unit": ""},
            {"name": "Vanilla extract", "quantity": "2", "unit": "teaspoons"},
            {"name": "Baking soda", "quantity": "1", "unit": "teaspoon"},
            {"name": "Salt", "quantity": "1", "unit": "teaspoon"},
            {"name": "Chocolate chips", "quantity": "2", "unit": "cups"}
        ],
        "equipment": [
            {"name": "Mixing bowl"},
            {"name": "Electric mixer"},
            {"name": "Baking sheet"},
            {"name": "Oven"}
        ],
        "steps": [
            {
                "step_number": 1,
                "instruction": "Preheat oven to 375°F (190°C)",
                "time_minutes": 5,
                "ingredients": [],
                "equipment": ["Oven"]
            },
            {
                "step_number": 2,
                "instruction": "Cream together butter, brown sugar, and white sugar until fluffy",
                "time_minutes": 3,
                "ingredients": ["Butter", "Brown sugar", "White sugar"],
                "equipment": ["Mixing bowl", "Electric mixer"]
            },
            {
                "step_number": 3,
                "instruction": "Beat in eggs and vanilla extract",
                "time_minutes": 2,
                "ingredients": ["Eggs", "Vanilla extract"],
                "equipment": ["Electric mixer"]
            },
            {
                "step_number": 4,
                "instruction": "Mix in flour, baking soda, and salt",
                "time_minutes": 2,
                "ingredients": ["All-purpose flour", "Baking soda", "Salt"],
                "equipment": ["Mixing bowl"]
            },
            {
                "step_number": 5,
                "instruction": "Fold in chocolate chips",
                "time_minutes": 1,
                "ingredients": ["Chocolate chips"],
                "equipment": ["Mixing bowl"]
            },
            {
                "step_number": 6,
                "instruction": "Drop rounded tablespoons of dough onto baking sheet and bake for 10-12 minutes",
                "time_minutes": 12,
                "ingredients": [],
                "equipment": ["Baking sheet", "Oven"]
            }
        ]
    },
    {
        "title": "Caesar Salad",
        "description": "Fresh romaine lettuce with homemade Caesar dressing and crispy croutons",
        "prep_time": "15 mins",
        "cook_time": "5 mins",
        "servings": 4,
        "ingredients": [
            {"name": "Romaine lettuce", "quantity": "1", "unit": "head"},
            {"name": "Parmesan cheese", "quantity": "1/2", "unit": "cup"},
            {"name": "Croutons", "quantity": "1", "unit": "cup"},
            {"name": "Mayonnaise", "quantity": "1/2", "unit": "cup"},
            {"name": "Lemon juice", "quantity": "2", "unit": "tablespoons"},
            {"name": "Garlic", "quantity": "2", "unit": "cloves"},
            {"name": "Anchovy paste", "quantity": "1", "unit": "teaspoon"},
            {"name": "Dijon mustard", "quantity": "1", "unit": "teaspoon"},
            {"name": "Worcestershire sauce", "quantity": "1", "unit": "teaspoon"},
            {"name": "Black pepper", "quantity": "1/4", "unit": "teaspoon"}
        ],
        "equipment": [
            {"name": "Large bowl"},
            {"name": "Small bowl"},
            {"name": "Whisk"},
            {"name": "Knife"}
        ],
        "steps": [
            {
                "step_number": 1,
                "instruction": "Wash and chop romaine lettuce into bite-sized pieces",
                "time_minutes": 5,
                "ingredients": ["Romaine lettuce"],
                "equipment": ["Knife", "Large bowl"]
            },
            {
                "step_number": 2,
                "instruction": "Mince garlic cloves finely",
                "time_minutes": 2,
                "ingredients": ["Garlic"],
                "equipment": ["Knife"]
            },
            {
                "step_number": 3,
                "instruction": "Whisk together mayonnaise, lemon juice, garlic, anchovy paste, mustard, Worcestershire sauce, and pepper",
                "time_minutes": 3,
                "ingredients": ["Mayonnaise", "Lemon juice", "Garlic", "Anchovy paste", "Dijon mustard", "Worcestershire sauce", "Black pepper"],
                "equipment": ["Small bowl", "Whisk"]
            },
            {
                "step_number": 4,
                "instruction": "Toss lettuce with dressing until evenly coated",
                "time_minutes": 2,
                "ingredients": ["Romaine lettuce"],
                "equipment": ["Large bowl"]
            },
            {
                "step_number": 5,
                "instruction": "Top with Parmesan cheese and croutons before serving",
                "time_minutes": 1,
                "ingredients": ["Parmesan cheese", "Croutons"],
                "equipment": []
            }
        ]
    }
]

def populate_database():
    """Populate the database with sample recipes"""
    print("Starting database population...")

    for recipe_data in SAMPLE_RECIPES:
        print(f"\nInserting recipe: {recipe_data['title']}")

        try:
            # Insert recipe
            recipe_insert = {
                "title": recipe_data["title"],
                "description": recipe_data["description"],
                "prep_time": recipe_data["prep_time"],
                "cook_time": recipe_data["cook_time"],
                "servings": recipe_data["servings"]
            }

            recipe_result = supabase.table("recipes").insert(recipe_insert).execute()
            recipe_id = recipe_result.data[0]["id"]
            print(f"  ✓ Recipe inserted with ID: {recipe_id}")

            # Insert ingredients
            for ingredient in recipe_data["ingredients"]:
                ingredient_insert = {
                    "recipe_id": recipe_id,
                    "name": ingredient["name"],
                    "quantity": ingredient["quantity"],
                    "unit": ingredient.get("unit", "")
                }
                supabase.table("recipe_ingredients").insert(ingredient_insert).execute()
            print(f"  ✓ Inserted {len(recipe_data['ingredients'])} ingredients")

            # Insert equipment
            for equipment in recipe_data["equipment"]:
                equipment_insert = {
                    "recipe_id": recipe_id,
                    "name": equipment["name"]
                }
                supabase.table("recipe_equipment").insert(equipment_insert).execute()
            print(f"  ✓ Inserted {len(recipe_data['equipment'])} equipment items")

            # Insert steps
            for step_data in recipe_data["steps"]:
                step_insert = {
                    "recipe_id": recipe_id,
                    "step_number": step_data["step_number"],
                    "instruction": step_data["instruction"]
                }
                step_result = supabase.table("recipe_steps").insert(step_insert).execute()

            print(f"  ✓ Inserted {len(recipe_data['steps'])} steps")
            print(f"✅ Successfully inserted: {recipe_data['title']}")

        except Exception as e:
            print(f"❌ Error inserting {recipe_data['title']}: {str(e)}")

    print("\n" + "="*50)
    print("Database population complete!")
    print("="*50)

if __name__ == "__main__":
    populate_database()
