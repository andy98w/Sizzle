#!/usr/bin/env python3
"""
Script to populate the Sushi Rice recipe with proper ingredients and equipment in local PostgreSQL.
"""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# PostgreSQL Configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'sizzle'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres')
}

def populate_recipe():
    """Populate recipe 1 (Sushi Rice) with ingredients and equipment."""

    print("🍚 Populating Sushi Rice recipe in PostgreSQL...")

    # Connect to database
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        # First, clear existing items
        print("\n📝 Clearing old recipe items...")
        cur.execute("DELETE FROM recipe_ingredients WHERE recipe_id = 1")
        cur.execute("DELETE FROM recipe_equipment WHERE recipe_id = 1")
        print(f"✅ Cleared {cur.rowcount} old items")

        # Add ingredients
        print("\n🥘 Adding ingredients...")
        ingredients = [
            (1, 'Rice', '2', 'cups'),
            (1, 'Water', '2.5', 'cups'),
            (1, 'Rice Vinegar', '1/4', 'cup'),
            (1, 'Sugar', '2', 'tbsp'),
            (1, 'Salt', '1', 'tsp'),
        ]

        for ing in ingredients:
            cur.execute(
                "INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit) VALUES (%s, %s, %s, %s)",
                ing
            )
            print(f"  ✅ Added {ing[1]}")

        # Add equipment
        print("\n🔧 Adding equipment...")
        equipment = [
            (1, 'Rice Cooker'),
            (1, 'Bowl'),
            (1, 'Wooden Spoon'),
        ]

        for eq in equipment:
            cur.execute(
                "INSERT INTO recipe_equipment (recipe_id, name) VALUES (%s, %s)",
                eq
            )
            print(f"  ✅ Added {eq[1]}")

        # Commit changes
        conn.commit()

        print("\n✨ Done! Recipe populated successfully!")
        print("\nNow fetch the recipe again to see the changes:")
        print("curl -s 'http://localhost:8000/recipes/1' | python3 -m json.tool")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    populate_recipe()
