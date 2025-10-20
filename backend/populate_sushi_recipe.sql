-- Populate the Sushi Rice recipe with proper ingredients and equipment
-- This script adds items to recipe_ingredients and recipe_equipment tables

-- First, let's add ingredients to the recipe
-- Rice
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit)
VALUES (1, 'Rice', '2', 'cups')
ON CONFLICT DO NOTHING;

-- Water
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit)
VALUES (1, 'Water', '2.5', 'cups')
ON CONFLICT DO NOTHING;

-- Rice Vinegar
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit)
VALUES (1, 'Rice Vinegar', '1/4', 'cup')
ON CONFLICT DO NOTHING;

-- Sugar
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit)
VALUES (1, 'Sugar', '2', 'tbsp')
ON CONFLICT DO NOTHING;

-- Salt
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit)
VALUES (1, 'Salt', '1', 'tsp')
ON CONFLICT DO NOTHING;

-- Now add equipment
-- Rice Cooker
INSERT INTO recipe_equipment (recipe_id, name)
VALUES (1, 'Rice Cooker')
ON CONFLICT DO NOTHING;

-- Bowl
INSERT INTO recipe_equipment (recipe_id, name)
VALUES (1, 'Bowl')
ON CONFLICT DO NOTHING;

-- Wooden Spoon
INSERT INTO recipe_equipment (recipe_id, name)
VALUES (1, 'Wooden Spoon')
ON CONFLICT DO NOTHING;
