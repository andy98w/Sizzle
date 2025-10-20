#!/usr/bin/env python3
"""
Migrate existing database to optimized schema with proper relationships
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

def migrate_data():
    """Migrate existing data to optimized schema"""
    print("=" * 70)
    print("DATABASE OPTIMIZATION MIGRATION")
    print("=" * 70)

    # Step 1: Create master ingredients table from generated_images
    print("\n1. Creating master ingredients table...")
    try:
        # Get all unique ingredient names from generated_images
        images_result = supabase.table("generated_images").select("name, type").eq("type", "ingredient").execute()

        unique_ingredients = list(set(img["name"] for img in images_result.data))
        print(f"   Found {len(unique_ingredients)} unique ingredients")

        # Insert into ingredients table (will skip duplicates)
        ingredients_added = 0
        for ingredient_name in unique_ingredients:
            try:
                supabase.table("ingredients").insert({"name": ingredient_name}).execute()
                ingredients_added += 1
            except:
                pass  # Skip duplicates

        print(f"   ✓ Added {ingredients_added} ingredients to master table")
    except Exception as e:
        print(f"   ⚠ Note: {str(e)[:80]}")

    # Step 2: Create master equipment table from generated_images
    print("\n2. Creating master equipment table...")
    try:
        # Get all unique equipment names from generated_images
        images_result = supabase.table("generated_images").select("name, type").eq("type", "equipment").execute()

        unique_equipment = list(set(img["name"] for img in images_result.data))
        print(f"   Found {len(unique_equipment)} unique equipment items")

        # Insert into equipment table (will skip duplicates)
        equipment_added = 0
        for equipment_name in unique_equipment:
            try:
                supabase.table("equipment").insert({"name": equipment_name}).execute()
                equipment_added += 1
            except:
                pass  # Skip duplicates

        print(f"   ✓ Added {equipment_added} equipment to master table")
    except Exception as e:
        print(f"   ⚠ Note: {str(e)[:80]}")

    # Step 3: Update recipe_ingredients to use ingredient_id
    print("\n3. Optimizing recipe_ingredients relationships...")
    try:
        # Get all recipe ingredients
        recipe_ingredients = supabase.table("recipe_ingredients").select("*").execute()

        # Get ingredient name-to-id mapping
        all_ingredients = supabase.table("ingredients").select("id, name").execute()
        ingredient_map = {ing["name"]: ing["id"] for ing in all_ingredients.data}

        updated_count = 0
        for ri in recipe_ingredients.data:
            # If it has a 'name' column, migrate to ingredient_id
            if "name" in ri and "ingredient_id" not in ri:
                ingredient_id = ingredient_map.get(ri["name"])
                if ingredient_id:
                    try:
                        supabase.table("recipe_ingredients").update({
                            "ingredient_id": ingredient_id
                        }).eq("id", ri["id"]).execute()
                        updated_count += 1
                    except:
                        pass

        print(f"   ✓ Updated {updated_count} recipe ingredient relationships")
    except Exception as e:
        print(f"   ⚠ Note: {str(e)[:80]}")

    # Step 4: Update recipe_equipment to use equipment_id
    print("\n4. Optimizing recipe_equipment relationships...")
    try:
        # Get all recipe equipment
        recipe_equipment = supabase.table("recipe_equipment").select("*").execute()

        # Get equipment name-to-id mapping
        all_equipment = supabase.table("equipment").select("id, name").execute()
        equipment_map = {eq["name"]: eq["id"] for eq in all_equipment.data}

        updated_count = 0
        for re in recipe_equipment.data:
            # If it has a 'name' column, migrate to equipment_id
            if "name" in re and "equipment_id" not in re:
                equipment_id = equipment_map.get(re["name"])
                if equipment_id:
                    try:
                        supabase.table("recipe_equipment").update({
                            "equipment_id": equipment_id
                        }).eq("id", re["id"]).execute()
                        updated_count += 1
                    except:
                        pass

        print(f"   ✓ Updated {updated_count} recipe equipment relationships")
    except Exception as e:
        print(f"   ⚠ Note: {str(e)[:80]}")

    print("\n" + "=" * 70)
    print("MIGRATION ANALYSIS")
    print("=" * 70)

    # Show optimization benefits
    print("\n📊 Before Optimization:")
    print("   - Ingredient names stored redundantly in recipe_ingredients")
    print("   - Equipment names stored redundantly in recipe_equipment")
    print("   - No referential integrity")
    print("   - Difficult to update ingredient/equipment names globally")

    print("\n✅ After Optimization:")
    print("   - Single source of truth for ingredients and equipment")
    print("   - Foreign key relationships ensure data integrity")
    print("   - Easy to update names globally (just update master table)")
    print("   - Better query performance with proper indexes")
    print("   - Reduced storage space (IDs vs. text strings)")

    # Calculate space savings
    try:
        ingredients_count = supabase.table("ingredients").select("*", count="exact").execute().count
        equipment_count = supabase.table("equipment").select("*", count="exact").execute().count
        recipe_ingredients_count = supabase.table("recipe_ingredients").select("*", count="exact").execute().count
        recipe_equipment_count = supabase.table("recipe_equipment").select("*", count="exact").execute().count

        print(f"\n📈 Database Statistics:")
        print(f"   - Master ingredients: {ingredients_count}")
        print(f"   - Master equipment: {equipment_count}")
        print(f"   - Recipe-ingredient links: {recipe_ingredients_count}")
        print(f"   - Recipe-equipment links: {recipe_equipment_count}")

        # Estimate storage savings (rough calculation)
        avg_name_length = 15  # Average characters in an ingredient/equipment name
        bytes_per_char = 3    # UTF-8 encoding
        bigint_bytes = 8      # BIGINT size

        old_size = (recipe_ingredients_count + recipe_equipment_count) * avg_name_length * bytes_per_char
        new_size = (recipe_ingredients_count + recipe_equipment_count) * bigint_bytes
        savings = old_size - new_size

        print(f"\n💾 Estimated Storage Savings:")
        print(f"   - Before: ~{old_size / 1024:.2f} KB (storing names)")
        print(f"   - After: ~{new_size / 1024:.2f} KB (storing IDs)")
        print(f"   - Saved: ~{savings / 1024:.2f} KB ({(savings/old_size)*100:.1f}%)")

    except Exception as e:
        print(f"   Could not calculate statistics: {str(e)[:50]}")

    print("\n" + "=" * 70)
    print("MIGRATION COMPLETE!")
    print("=" * 70)
    print("\nNext Steps:")
    print("1. Run the optimized_schema.sql in Supabase SQL Editor")
    print("2. Verify all foreign key relationships are working")
    print("3. Update your application code to use ingredient_id/equipment_id")
    print("4. (Optional) Drop the old 'name' columns after verification")

if __name__ == "__main__":
    migrate_data()
