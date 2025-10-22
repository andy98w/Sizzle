-- Add image_url column to recipe_steps table
ALTER TABLE recipe_steps
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_prompt TEXT,
ADD COLUMN IF NOT EXISTS image_generated_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recipe_steps_image_url ON recipe_steps(image_url) WHERE image_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN recipe_steps.image_url IS 'URL to generated step image in OCI Object Storage';
COMMENT ON COLUMN recipe_steps.image_prompt IS 'DALL-E prompt used to generate the image';
COMMENT ON COLUMN recipe_steps.image_generated_at IS 'Timestamp when the image was generated';
