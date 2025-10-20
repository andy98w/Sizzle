# Database Optimization Guide

## Overview
This guide explains the database optimization that improves efficiency through proper relationships and normalization.

## Current Problems

### ❌ Before Optimization
```
recipe_ingredients
├── recipe_id
├── name: "Salt"          ← Stored as TEXT, repeated many times
├── quantity: "1"
└── unit: "tsp"

recipe_equipment
├── recipe_id
└── name: "Mixing Bowl"   ← Stored as TEXT, repeated many times
```

**Issues:**
- ✗ Ingredient/equipment names stored as TEXT in every row
- ✗ No referential integrity
- ✗ Can't update an ingredient name globally
- ✗ Wastes storage space
- ✗ Slower queries (comparing TEXT vs. INTEGER)

## Optimized Solution

### ✅ After Optimization
```
ingredients (Master Table)
├── id: 1
└── name: "Salt"          ← Stored ONCE

equipment (Master Table)
├── id: 1
└── name: "Mixing Bowl"   ← Stored ONCE

recipe_ingredients (Junction Table)
├── recipe_id: 5
├── ingredient_id: 1      ← References ingredients.id
├── quantity: "1"
└── unit: "tsp"

recipe_equipment (Junction Table)
├── recipe_id: 5
└── equipment_id: 1       ← References equipment.id
```

**Benefits:**
- ✓ Names stored once in master tables
- ✓ Foreign key relationships ensure data integrity
- ✓ Update name in one place, affects all recipes
- ✓ 60-80% less storage for junction tables
- ✓ Faster queries with INTEGER comparisons
- ✓ Automatic cascade deletes

## Database Schema Diagram

```
┌─────────────────┐
│   ingredients   │ ←─────┐
├─────────────────┤       │
│ id (PK)         │       │  Foreign Key
│ name (UNIQUE)   │       │  Relationship
│ created_at      │       │
└─────────────────┘       │
                          │
┌─────────────────┐       │
│    equipment    │ ←─┐   │
├─────────────────┤   │   │
│ id (PK)         │   │   │
│ name (UNIQUE)   │   │   │
│ created_at      │   │   │
└─────────────────┘   │   │
                      │   │
┌──────────────────────────────┐
│         recipes              │
├──────────────────────────────┤
│ id (PK)                      │ ←─────┐
│ title                        │       │
│ description                  │       │
│ prep_time                    │       │
│ cook_time                    │       │
│ servings                     │       │
└──────────────────────────────┘       │
        ↑                               │
        │                               │
        │  ┌──────────────────────┐    │
        └──│ recipe_ingredients   │    │
           ├──────────────────────┤    │
           │ id (PK)              │    │
           │ recipe_id (FK) ──────┘    │
           │ ingredient_id (FK) ───────┘
           │ quantity             │
           │ unit                 │
           └──────────────────────┘
        │
        │  ┌──────────────────────┐
        └──│  recipe_equipment    │
           ├──────────────────────┤
           │ id (PK)              │
           │ recipe_id (FK) ──────┘
           │ equipment_id (FK) ───────┘
           └──────────────────────┘
        │
        │  ┌──────────────────────┐
        └──│   recipe_steps       │
           ├──────────────────────┤
           │ id (PK)              │
           │ recipe_id (FK) ──────┘
           │ step_number          │
           │ instruction          │
           └──────────────────────┘
                   ↑
                   │
        ┌──────────┴─────────────┐
        │                        │
  ┌─────────────────┐   ┌────────────────┐
  │step_ingredients │   │ step_equipment │
  ├─────────────────┤   ├────────────────┤
  │ step_id (FK)    │   │ step_id (FK)   │
  │ingredient_id(FK)│   │equipment_id(FK)│
  └─────────────────┘   └────────────────┘
```

## Performance Improvements

### Storage Savings Example
**100 recipes, each using 10 ingredients:**

**Before:**
- 1,000 rows storing ingredient names as TEXT
- Average name: 15 characters × 3 bytes = 45 bytes
- Total: 45,000 bytes (43.9 KB)

**After:**
- 1,000 rows storing ingredient_id as BIGINT
- BIGINT size: 8 bytes
- Total: 8,000 bytes (7.8 KB)
- **Savings: 82%**

### Query Performance
**Before:**
```sql
-- String comparison (slow)
SELECT * FROM recipe_ingredients WHERE name = 'Salt';
```

**After:**
```sql
-- Integer comparison (fast)
SELECT * FROM recipe_ingredients WHERE ingredient_id = 1;
```
- Integer comparisons are **10-100x faster** than string comparisons
- Smaller indexes = better cache utilization

## Migration Steps

### 1. Run Optimized Schema
```bash
# In Supabase SQL Editor, paste and run:
optimized_schema.sql
```

This creates:
- `ingredients` table
- `equipment` table
- Helper functions: `get_or_create_ingredient()`, `get_or_create_equipment()`
- Indexes for performance
- Helpful views

### 2. Migrate Existing Data
```bash
cd backend
./venv/bin/python migrate_to_optimized_schema.py
```

This will:
- Populate `ingredients` and `equipment` master tables
- Update foreign key relationships
- Show storage savings statistics

### 3. Verify Migration
```sql
-- Check ingredient relationships
SELECT
    r.title,
    i.name as ingredient,
    ri.quantity,
    ri.unit
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
JOIN ingredients i ON ri.ingredient_id = i.id;

-- Check equipment relationships
SELECT
    r.title,
    e.name as equipment
FROM recipes r
JOIN recipe_equipment re ON r.id = re.recipe_id
JOIN equipment e ON re.equipment_id = e.id;
```

## Code Updates Required

### Old Code (Before)
```python
# Inserting ingredient
ingredient_data = {
    "recipe_id": recipe_id,
    "name": "Salt",  # ❌ Storing name directly
    "quantity": "1",
    "unit": "tsp"
}
supabase.table("recipe_ingredients").insert(ingredient_data).execute()
```

### New Code (After)
```python
# Get or create ingredient
ingredient_result = supabase.rpc("get_or_create_ingredient", {"ingredient_name": "Salt"}).execute()
ingredient_id = ingredient_result.data

# Insert with ID reference
ingredient_data = {
    "recipe_id": recipe_id,
    "ingredient_id": ingredient_id,  # ✅ Using foreign key
    "quantity": "1",
    "unit": "tsp"
}
supabase.table("recipe_ingredients").insert(ingredient_data).execute()
```

## Additional Benefits

### 1. Data Integrity
- Foreign keys prevent orphaned records
- CASCADE deletes handle cleanup automatically
- UNIQUE constraints prevent duplicates

### 2. Easier Maintenance
```sql
-- Update ingredient name everywhere at once
UPDATE ingredients SET name = 'Sea Salt' WHERE name = 'Salt';
-- All recipes automatically use new name!
```

### 3. Better Analytics
```sql
-- Most used ingredients across all recipes
SELECT
    i.name,
    COUNT(*) as usage_count
FROM recipe_ingredients ri
JOIN ingredients i ON ri.ingredient_id = i.id
GROUP BY i.name
ORDER BY usage_count DESC
LIMIT 10;
```

### 4. Flexible Queries
The `recipe_details` view combines everything:
```sql
SELECT * FROM recipe_details WHERE title LIKE '%Sushi%';
-- Returns complete recipe with ingredients, equipment, and steps as JSON
```

## Testing Checklist

- [ ] Run `optimized_schema.sql` in Supabase
- [ ] Execute migration script
- [ ] Verify master tables populated
- [ ] Check foreign key relationships
- [ ] Test querying recipes with joins
- [ ] Update application code to use IDs
- [ ] Test creating new recipes
- [ ] Verify cascade deletes work
- [ ] Check query performance improvements
- [ ] Update API endpoints to use optimized schema

## Rollback Plan

If issues occur:
1. Keep old `name` columns temporarily
2. Run both old and new code in parallel
3. Verify data consistency
4. Once confirmed, drop old columns:

```sql
ALTER TABLE recipe_ingredients DROP COLUMN name;
ALTER TABLE recipe_equipment DROP COLUMN name;
```

## Questions?

This optimization follows database normalization best practices (Third Normal Form). It's a one-time migration that provides long-term benefits for performance, maintainability, and data integrity.
