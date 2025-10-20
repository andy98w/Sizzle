-- Simple table creation for database optimization
-- Copy and paste this into Supabase SQL Editor and run it

-- Step 1: Create ingredients master table
CREATE TABLE IF NOT EXISTS ingredients (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create equipment master table
CREATE TABLE IF NOT EXISTS equipment (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Add foreign key columns to existing tables
ALTER TABLE recipe_ingredients
ADD COLUMN IF NOT EXISTS ingredient_id BIGINT REFERENCES ingredients(id) ON DELETE CASCADE;

ALTER TABLE recipe_equipment
ADD COLUMN IF NOT EXISTS equipment_id BIGINT REFERENCES equipment(id) ON DELETE CASCADE;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_equipment_name ON equipment(name);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_recipe_equipment_equipment ON recipe_equipment(equipment_id);

-- Verification query
SELECT 'Tables created successfully!' as status;
