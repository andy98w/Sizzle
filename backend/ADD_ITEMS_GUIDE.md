# Adding Ingredients & Equipment Guide

This guide explains how to easily add ingredients and equipment with images to your Sizzle database.

## Quick Start

The `add_item.py` script automates:
1. Uploading images to OCI Object Storage
2. Creating database entries in Supabase
3. Linking them together with URLs

## Usage

```bash
cd /Users/andywu/Sizzle/backend
source venv/bin/activate
python add_item.py <type> "<name>" <image_path> [category]
```

### Arguments

- **type**: Either `ingredient` or `equipment`
- **name**: Display name of the item (use quotes if it has spaces)
- **image_path**: Path to the image file in your `*_clean` folder
- **category**: (Optional) Category for ingredients (e.g., `grain`, `vegetable`, `protein`)

## Examples

### Adding Ingredients

```bash
# Add rice
python add_item.py ingredient "Japanese Short-Grain Rice" ingredients_clean/rice.jpg grain

# Add water
python add_item.py ingredient "Water" ingredients_clean/water.jpg liquid

# Add sugar
python add_item.py ingredient "Sugar" ingredients_clean/sugar.jpg sweetener

# Add salt
python add_item.py ingredient "Salt" ingredients_clean/salt.jpg seasoning

# Add rice vinegar
python add_item.py ingredient "Rice Vinegar" ingredients_clean/rice_vinegar.jpg condiment
```

### Adding Equipment

```bash
# Add rice cooker
python add_item.py equipment "Rice Cooker" equipment_clean/rice_cooker.jpg

# Add wooden spoon
python add_item.py equipment "Wooden Spoon" equipment_clean/wooden_spoon.jpg

# Add large bowl
python add_item.py equipment "Large Bowl" equipment_clean/large_bowl.jpg

# Add fan
python add_item.py equipment "Fan" equipment_clean/fan.jpg
```

## Tips

1. **Image Files**: Make sure your images are in the `ingredients_clean` or `equipment_clean` folders
2. **Naming**: Use the exact name as it appears in your recipes for automatic matching
3. **Categories**: Common categories for ingredients:
   - `grain`, `vegetable`, `fruit`, `protein`, `dairy`
   - `liquid`, `seasoning`, `sweetener`, `condiment`, `spice`
4. **Batch Adding**: You can create a shell script to add multiple items at once

## Batch Example

Create a file `add_sample_items.sh`:

```bash
#!/bin/bash
cd /Users/andywu/Sizzle/backend
source venv/bin/activate

# Add all ingredients for sushi rice recipe
python add_item.py ingredient "Japanese Short-Grain Rice" ingredients_clean/rice.jpg grain
python add_item.py ingredient "Water" ingredients_clean/water.jpg liquid
python add_item.py ingredient "Rice Vinegar" ingredients_clean/rice_vinegar.jpg condiment
python add_item.py ingredient "Sugar" ingredients_clean/sugar.jpg sweetener
python add_item.py ingredient "Salt" ingredients_clean/salt.jpg seasoning

# Add all equipment
python add_item.py equipment "Rice Cooker" equipment_clean/rice_cooker.jpg
python add_item.py equipment "Wooden Spoon" equipment_clean/wooden_spoon.jpg
python add_item.py equipment "Large Bowl" equipment_clean/large_bowl.jpg
python add_item.py equipment "Fan" equipment_clean/fan.jpg

echo "✅ All items added successfully!"
```

Then run:
```bash
chmod +x add_sample_items.sh
./add_sample_items.sh
```

## Troubleshooting

### "Image file not found"
- Make sure the image path is correct relative to the backend folder
- Check that the file exists: `ls ingredients_clean/`

### "Error uploading to OCI"
- Check your `.env` file has correct OCI credentials
- Verify `~/.oci/config` exists and is configured

### "Error adding to database"
- Check your Supabase credentials in `.env`
- Ensure the tables `ingredients` and `equipment` exist

## What Gets Created

When you run the script, it:
1. Uploads `<name>.jpg` to OCI bucket as `japanese_short_grain_rice.jpg`
2. Creates a PAR URL like: `https://objectstorage.../japanese_short_grain_rice.jpg`
3. Inserts a row in Supabase with the name and URL
4. Returns the new entry's ID

## Viewing Your Items

After adding items, you can view them:
- **API**: `http://localhost:8000/ingredients`
- **Frontend**: Navigate to the Ingredients page in your app
- **Supabase**: Check the tables directly in your Supabase dashboard
