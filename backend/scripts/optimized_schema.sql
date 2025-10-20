-- Optimized Database Schema with Proper Relationships
-- This improves efficiency by removing redundancy and establishing proper foreign keys

-- ============================================================
-- DROP EXISTING TABLES (if recreating)
-- ============================================================
-- Uncomment these if you want to recreate from scratch
-- DROP TABLE IF EXISTS step_equipment CASCADE;
-- DROP TABLE IF EXISTS step_ingredients CASCADE;
-- DROP TABLE IF EXISTS recipe_steps CASCADE;
-- DROP TABLE IF EXISTS recipe_equipment CASCADE;
-- DROP TABLE IF EXISTS recipe_ingredients CASCADE;
-- DROP TABLE IF EXISTS recipes CASCADE;
-- DROP TABLE IF EXISTS equipment CASCADE;
-- DROP TABLE IF EXISTS ingredients CASCADE;
-- DROP TABLE IF EXISTS generated_images CASCADE;

-- ============================================================
-- CORE REFERENCE TABLES
-- ============================================================

-- Master table for all ingredients (normalized)
CREATE TABLE IF NOT EXISTS ingredients (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Master table for all equipment (normalized)
CREATE TABLE IF NOT EXISTS equipment (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Images table - now references ingredients and equipment
CREATE TABLE IF NOT EXISTS generated_images (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ingredient', 'equipment')),
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, type)
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_generated_images_name ON generated_images(name);
CREATE INDEX IF NOT EXISTS idx_generated_images_type ON generated_images(type);

-- ============================================================
-- RECIPE TABLES
-- ============================================================

-- Main recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    prep_time TEXT,
    cook_time TEXT,
    servings INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe ingredients junction table - uses ingredient_id instead of storing name
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id BIGSERIAL PRIMARY KEY,
    recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity TEXT,
    unit TEXT,
    UNIQUE(recipe_id, ingredient_id)
);

-- Recipe equipment junction table - uses equipment_id instead of storing name
CREATE TABLE IF NOT EXISTS recipe_equipment (
    id BIGSERIAL PRIMARY KEY,
    recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    equipment_id BIGINT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    UNIQUE(recipe_id, equipment_id)
);

-- Recipe steps
CREATE TABLE IF NOT EXISTS recipe_steps (
    id BIGSERIAL PRIMARY KEY,
    recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    UNIQUE(recipe_id, step_number)
);

-- Step ingredients junction - references ingredient_id
CREATE TABLE IF NOT EXISTS step_ingredients (
    id BIGSERIAL PRIMARY KEY,
    step_id BIGINT NOT NULL REFERENCES recipe_steps(id) ON DELETE CASCADE,
    ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    UNIQUE(step_id, ingredient_id)
);

-- Step equipment junction - references equipment_id
CREATE TABLE IF NOT EXISTS step_equipment (
    id BIGSERIAL PRIMARY KEY,
    step_id BIGINT NOT NULL REFERENCES recipe_steps(id) ON DELETE CASCADE,
    equipment_id BIGINT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    UNIQUE(step_id, equipment_id)
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Recipe indexes
CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);

-- Junction table indexes
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_recipe_equipment_recipe ON recipe_equipment(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_equipment_equipment ON recipe_equipment(equipment_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe ON recipe_steps(recipe_id, step_number);
CREATE INDEX IF NOT EXISTS idx_step_ingredients_step ON step_ingredients(step_id);
CREATE INDEX IF NOT EXISTS idx_step_ingredients_ingredient ON step_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_step_equipment_step ON step_equipment(step_id);
CREATE INDEX IF NOT EXISTS idx_step_equipment_equipment ON step_equipment(equipment_id);

-- ============================================================
-- HELPER VIEWS FOR EASIER QUERYING
-- ============================================================

-- View to get complete recipe with ingredients
CREATE OR REPLACE VIEW recipe_details AS
SELECT
    r.id,
    r.title,
    r.description,
    r.prep_time,
    r.cook_time,
    r.servings,
    json_agg(
        json_build_object(
            'name', i.name,
            'quantity', ri.quantity,
            'unit', ri.unit
        ) ORDER BY ri.id
    ) FILTER (WHERE i.id IS NOT NULL) AS ingredients,
    (
        SELECT json_agg(
            json_build_object(
                'name', e.name
            ) ORDER BY re.id
        )
        FROM recipe_equipment re
        JOIN equipment e ON re.equipment_id = e.id
        WHERE re.recipe_id = r.id
    ) AS equipment,
    (
        SELECT json_agg(
            json_build_object(
                'step_number', rs.step_number,
                'instruction', rs.instruction
            ) ORDER BY rs.step_number
        )
        FROM recipe_steps rs
        WHERE rs.recipe_id = r.id
    ) AS steps
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
LEFT JOIN ingredients i ON ri.ingredient_id = i.id
GROUP BY r.id;

-- ============================================================
-- FUNCTIONS FOR CONVENIENCE
-- ============================================================

-- Function to get or create ingredient
CREATE OR REPLACE FUNCTION get_or_create_ingredient(ingredient_name TEXT)
RETURNS BIGINT AS $$
DECLARE
    ingredient_id BIGINT;
BEGIN
    -- Try to get existing ingredient
    SELECT id INTO ingredient_id FROM ingredients WHERE name = ingredient_name;

    -- If not found, create it
    IF ingredient_id IS NULL THEN
        INSERT INTO ingredients (name) VALUES (ingredient_name)
        RETURNING id INTO ingredient_id;
    END IF;

    RETURN ingredient_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create equipment
CREATE OR REPLACE FUNCTION get_or_create_equipment(equipment_name TEXT)
RETURNS BIGINT AS $$
DECLARE
    equipment_id BIGINT;
BEGIN
    -- Try to get existing equipment
    SELECT id INTO equipment_id FROM equipment WHERE name = equipment_name;

    -- If not found, create it
    IF equipment_id IS NULL THEN
        INSERT INTO equipment (name) VALUES (equipment_name)
        RETURNING id INTO equipment_id;
    END IF;

    RETURN equipment_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE ingredients IS 'Master list of all ingredients used across recipes';
COMMENT ON TABLE equipment IS 'Master list of all equipment used across recipes';
COMMENT ON TABLE generated_images IS 'Image URLs for ingredients and equipment from Oracle Object Storage';
COMMENT ON TABLE recipes IS 'Main recipe information';
COMMENT ON TABLE recipe_ingredients IS 'Junction table linking recipes to ingredients with quantities';
COMMENT ON TABLE recipe_equipment IS 'Junction table linking recipes to equipment';
COMMENT ON TABLE recipe_steps IS 'Step-by-step instructions for recipes';
COMMENT ON TABLE step_ingredients IS 'Ingredients used in specific steps';
COMMENT ON TABLE step_equipment IS 'Equipment used in specific steps';
