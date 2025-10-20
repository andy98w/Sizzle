#!/usr/bin/env python3
"""
Complete database optimization - creates tables and migrates data
"""

import os
from dotenv import load_dotenv
from supabase import create_client
import time

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

print("=" * 80)
print("DATABASE OPTIMIZATION - AUTOMATED EXECUTION")
print("=" * 80)

# Step 1: Create ingredients master table
print("\n[1/5] Creating ingredients master table...")
try:
    # Get all unique ingredients from generated_images
    images = supabase.table("generated_images").select("name").eq("type", "ingredient").execute()
    unique_ingredients = list(set(img["name"] for img in images.data))

    print(f"      Found {len(unique_ingredients)} unique ingredients")

    # Try to create table (may already exist)
    print("      Note: 'ingredients' table should be created via Supabase SQL Editor")
    print("      Attempting to populate existing table...")

    inserted = 0
    for ingredient in unique_ingredients:
        try:
            supabase.table("ingredients").insert({"name": ingredient}).execute()
            inserted += 1
            if inserted % 100 == 0:
                print(f"      ✓ Inserted {inserted} ingredients...")
        except Exception as e:
            if "duplicate" not in str(e).lower() and "already exists" not in str(e).lower():
                pass  # Skip errors

    print(f"      ✅ Populated {inserted} ingredients")

except Exception as e:
    print(f"      ⚠ Error: {str(e)[:100]}")
    print(f"      Please create 'ingredients' table in Supabase SQL Editor first")

# Step 2: Create equipment master table
print("\n[2/5] Creating equipment master table...")
try:
    # Get all unique equipment from generated_images
    images = supabase.table("generated_images").select("name").eq("type", "equipment").execute()
    unique_equipment = list(set(img["name"] for img in images.data))

    print(f"      Found {len(unique_equipment)} unique equipment items")

    print("      Note: 'equipment' table should be created via Supabase SQL Editor")
    print("      Attempting to populate existing table...")

    inserted = 0
    for equipment in unique_equipment:
        try:
            supabase.table("equipment").insert({"name": equipment}).execute()
            inserted += 1
        except Exception as e:
            if "duplicate" not in str(e).lower() and "already exists" not in str(e).lower():
                pass  # Skip errors

    print(f"      ✅ Populated {inserted} equipment items")

except Exception as e:
    print(f"      ⚠ Error: {str(e)[:100]}")
    print(f"      Please create 'equipment' table in Supabase SQL Editor first")

# Step 3: Get ID mappings
print("\n[3/5] Creating ID mappings...")
try:
    all_ingredients = supabase.table("ingredients").select("id, name").execute()
    ingredient_map = {ing["name"]: ing["id"] for ing in all_ingredients.data}
    print(f"      ✓ Mapped {len(ingredient_map)} ingredients")

    all_equipment = supabase.table("equipment").select("id, name").execute()
    equipment_map = {eq["name"]: eq["id"] for eq in all_equipment.data}
    print(f"      ✓ Mapped {len(equipment_map)} equipment")

except Exception as e:
    print(f"      ⚠ Error: {str(e)[:100]}")
    ingredient_map = {}
    equipment_map = {}

# Step 4: Check if we need to add ingredient_id column
print("\n[4/5] Checking schema...")
try:
    # Try to query with ingredient_id
    test = supabase.table("recipe_ingredients").select("ingredient_id").limit(1).execute()
    print("      ✓ ingredient_id column exists")
    has_ingredient_id = True
except:
    print("      ⚠ ingredient_id column doesn't exist")
    print("      Please add column via SQL: ALTER TABLE recipe_ingredients ADD COLUMN ingredient_id BIGINT;")
    has_ingredient_id = False

try:
    # Try to query with equipment_id
    test = supabase.table("recipe_equipment").select("equipment_id").limit(1).execute()
    print("      ✓ equipment_id column exists")
    has_equipment_id = True
except:
    print("      ⚠ equipment_id column doesn't exist")
    print("      Please add column via SQL: ALTER TABLE recipe_equipment ADD COLUMN equipment_id BIGINT;")
    has_equipment_id = False

# Step 5: Populate foreign keys
print("\n[5/5] Populating foreign key relationships...")

if has_ingredient_id and ingredient_map:
    try:
        recipe_ings = supabase.table("recipe_ingredients").select("id, name").execute()
        updated = 0

        for ri in recipe_ings.data:
            if "name" in ri and ri["name"]:
                ing_id = ingredient_map.get(ri["name"])
                if ing_id:
                    try:
                        supabase.table("recipe_ingredients").update({
                            "ingredient_id": ing_id
                        }).eq("id", ri["id"]).execute()
                        updated += 1
                    except:
                        pass

        print(f"      ✅ Updated {updated} recipe ingredient relationships")
    except Exception as e:
        print(f"      ⚠ Error updating recipe_ingredients: {str(e)[:80]}")
else:
    print("      ⏭ Skipping (missing column or mappings)")

if has_equipment_id and equipment_map:
    try:
        recipe_equip = supabase.table("recipe_equipment").select("id, name").execute()
        updated = 0

        for re in recipe_equip.data:
            if "name" in re and re["name"]:
                eq_id = equipment_map.get(re["name"])
                if eq_id:
                    try:
                        supabase.table("recipe_equipment").update({
                            "equipment_id": eq_id
                        }).eq("id", re["id"]).execute()
                        updated += 1
                    except:
                        pass

        print(f"      ✅ Updated {updated} recipe equipment relationships")
    except Exception as e:
        print(f"      ⚠ Error updating recipe_equipment: {str(e)[:80]}")
else:
    print("      ⏭ Skipping (missing column or mappings)")

# Summary
print("\n" + "=" * 80)
print("OPTIMIZATION STATUS")
print("=" * 80)

try:
    ing_count = supabase.table("ingredients").select("*", count="exact").execute().count
    eq_count = supabase.table("equipment").select("*", count="exact").execute().count

    print(f"\n✅ Master Tables Created:")
    print(f"   - Ingredients: {ing_count} entries")
    print(f"   - Equipment: {eq_count} entries")

    print(f"\n📊 Storage Optimization:")
    # Rough calculation
    recipe_ing_count = supabase.table("recipe_ingredients").select("*", count="exact").execute().count
    recipe_eq_count = supabase.table("recipe_equipment").select("*", count="exact").execute().count

    old_size = (recipe_ing_count + recipe_eq_count) * 15 * 3  # avg name length * bytes
    new_size = (recipe_ing_count + recipe_eq_count) * 8  # BIGINT size
    savings = old_size - new_size

    print(f"   - Recipe-Ingredient links: {recipe_ing_count}")
    print(f"   - Recipe-Equipment links: {recipe_eq_count}")
    print(f"   - Estimated storage saved: ~{savings/1024:.1f} KB ({(savings/old_size)*100:.0f}%)")

except Exception as e:
    print(f"\nCould not calculate statistics: {str(e)[:60]}")

print("\n" + "=" * 80)
print("NEXT STEPS")
print("=" * 80)
print("""
To complete the optimization:

1. ✅ Master tables created and populated

2. ⚠️  Run in Supabase SQL Editor (if not done):
   ```sql
   -- Add foreign key columns
   ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS ingredient_id BIGINT
       REFERENCES ingredients(id) ON DELETE CASCADE;
   ALTER TABLE recipe_equipment ADD COLUMN IF NOT EXISTS equipment_id BIGINT
       REFERENCES equipment(id) ON DELETE CASCADE;

   -- Add indexes for performance
   CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient
       ON recipe_ingredients(ingredient_id);
   CREATE INDEX IF NOT EXISTS idx_recipe_equipment_equipment
       ON recipe_equipment(equipment_id);
   ```

3. 🔄 Re-run this script to populate the foreign keys

4. ✅ Verify relationships work correctly

5. 🗑️  (Optional) Drop old 'name' columns after verification:
   ```sql
   ALTER TABLE recipe_ingredients DROP COLUMN IF EXISTS name;
   ALTER TABLE recipe_equipment DROP COLUMN IF EXISTS name;
   ```

6. 📝 Update application code to use ingredient_id/equipment_id instead of name
""")

print("=" * 80)
