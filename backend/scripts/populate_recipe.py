#!/usr/bin/env python3
"""
Script to populate the Sushi Rice recipe with proper ingredients and equipment.
"""

import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Initialize client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def populate_recipe():
    """Populate recipe 1 (Sushi Rice) with ingredients and equipment."""

    print("🍚 Populating Sushi Rice recipe...")

    # First, clear existing items (optional - comment out if you want to keep them)
    print("\n📝 Clearing old recipe items...")
    try:
        supabase.table('recipe_ingredients').delete().eq('recipe_id', 1).execute()
        supabase.table('recipe_equipment').delete().eq('recipe_id', 1).execute()
        print("✅ Cleared old items")
    except Exception as e:
        print(f"⚠️  Warning clearing old items: {e}")

    # Add ingredients
    print("\n🥘 Adding ingredients...")
    ingredients = [
        {'recipe_id': 1, 'name': 'Rice', 'quantity': '2', 'unit': 'cups'},
        {'recipe_id': 1, 'name': 'Water', 'quantity': '2.5', 'unit': 'cups'},
        {'recipe_id': 1, 'name': 'Rice Vinegar', 'quantity': '1/4', 'unit': 'cup'},
        {'recipe_id': 1, 'name': 'Sugar', 'quantity': '2', 'unit': 'tbsp'},
        {'recipe_id': 1, 'name': 'Salt', 'quantity': '1', 'unit': 'tsp'},
    ]

    for ing in ingredients:
        try:
            result = supabase.table('recipe_ingredients').insert(ing).execute()
            print(f"  ✅ Added {ing['name']}")
        except Exception as e:
            print(f"  ❌ Failed to add {ing['name']}: {e}")

    # Add equipment
    print("\n🔧 Adding equipment...")
    equipment = [
        {'recipe_id': 1, 'name': 'Rice Cooker'},
        {'recipe_id': 1, 'name': 'Bowl'},
        {'recipe_id': 1, 'name': 'Wooden Spoon'},
    ]

    for eq in equipment:
        try:
            result = supabase.table('recipe_equipment').insert(eq).execute()
            print(f"  ✅ Added {eq['name']}")
        except Exception as e:
            print(f"  ❌ Failed to add {eq['name']}: {e}")

    print("\n✨ Done! Recipe populated successfully!")
    print("\nNow fetch the recipe again to see the changes:")
    print("curl -s 'http://localhost:8000/recipes/1' | python3 -m json.tool")

if __name__ == '__main__':
    populate_recipe()
