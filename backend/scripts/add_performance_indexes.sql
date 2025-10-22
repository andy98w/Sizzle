-- Performance optimization indexes for Sizzle database
-- Run this migration to add indexes for frequently queried columns

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_recipes_title_trgm ON recipes USING gin(title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_generated_images_type_name ON generated_images(type, name);
CREATE INDEX IF NOT EXISTS idx_generated_images_name_trgm ON generated_images USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_equipment_recipe_id ON recipe_equipment(recipe_id);

CREATE INDEX IF NOT EXISTS idx_step_ingredients_step_id ON step_ingredients(step_id);
CREATE INDEX IF NOT EXISTS idx_step_ingredients_ingredient_id ON step_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_step_equipment_step_id ON step_equipment(step_id);
CREATE INDEX IF NOT EXISTS idx_step_equipment_equipment_id ON step_equipment(equipment_id);

CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_step ON recipe_steps(recipe_id, step_number);

CREATE INDEX IF NOT EXISTS idx_recipe_steps_image_url ON recipe_steps(image_url) WHERE image_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_name_recipe ON recipe_ingredients(name, recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_equipment_name_recipe ON recipe_equipment(name, recipe_id);

ANALYZE recipes;
ANALYZE recipe_ingredients;
ANALYZE recipe_equipment;
ANALYZE recipe_steps;
ANALYZE step_ingredients;
ANALYZE step_equipment;
ANALYZE generated_images;
