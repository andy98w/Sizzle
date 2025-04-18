-- Schema for Sizzle Recipe Assistant
-- Run this in your Supabase SQL Editor

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  prep_time TEXT,
  cook_time TEXT,
  servings INTEGER,
  ingredients JSONB,  -- Stores array of ingredients with names, quantities, images
  equipment JSONB,    -- Stores array of equipment with names, images
  steps JSONB,        -- Stores array of steps with instructions, actions, images
  original_text TEXT, -- Original recipe text
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for searching by title
CREATE INDEX IF NOT EXISTS recipes_title_idx ON recipes USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS recipes_description_idx ON recipes USING GIN (to_tsvector('english', description));

-- Generated images metadata
CREATE TABLE IF NOT EXISTS generated_images (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,     -- 'ingredient', 'equipment', 'action', 'step'
  name TEXT NOT NULL,     -- The identifier of what was generated (ingredient name, action name, etc.)
  prompt TEXT,            -- The prompt used to generate the image
  storage_path TEXT,      -- Path to the image file
  url TEXT,               -- URL to access the image
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for searching by type and name
CREATE INDEX IF NOT EXISTS generated_images_type_name_idx ON generated_images (type, name);

-- Enable Row Level Security (RLS)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- Create policies for public access for now
-- In a real app, you would restrict this to authenticated users
CREATE POLICY "Public read access" ON recipes FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON recipes FOR UPDATE USING (true);

CREATE POLICY "Public read access" ON generated_images FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON generated_images FOR INSERT WITH CHECK (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update the updated_at timestamp
CREATE TRIGGER update_recipes_modtime
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();