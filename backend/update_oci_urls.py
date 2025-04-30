#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from db_manager import db
import urllib.parse

# Make sure environment variables are loaded
load_dotenv()

# Get the new OCI PAR URL from environment
new_oci_par_url = os.getenv("OCI_PAR_URL", "").rstrip('/')
if not new_oci_par_url:
    print("Error: OCI_PAR_URL not found in environment variables")
    exit(1)

print(f"New OCI PAR URL: {new_oci_par_url[:30]}...")

# Check if Supabase is connected
if not db.is_connected():
    print("Error: Could not connect to Supabase")
    exit(1)

# Get all ingredients
try:
    ingredients = db.list_ingredients(limit=1000, offset=0)
    print(f"Found {len(ingredients)} ingredients")
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    for ingredient in ingredients:
        ingredient_id = ingredient.get('id')
        ingredient_name = ingredient.get('name')
        old_url = ingredient.get('url', '')
        
        if not ingredient_id or not ingredient_name:
            print(f"Skipping ingredient with missing ID or name: {ingredient}")
            skipped_count += 1
            continue
            
        # Parse the old URL to extract just the ingredient name for the new URL
        object_name = ""
        if old_url:
            if '/o/' in old_url:
                # Extract object name from old URL if it follows Oracle format
                parts = old_url.split('/o/')
                if len(parts) > 1:
                    object_name = parts[1]
            else:
                # Try to extract the filename from the URL
                parsed_url = urllib.parse.urlparse(old_url)
                path = parsed_url.path
                filename = os.path.basename(path)
                if filename:
                    object_name = filename
        
        # If we couldn't extract an object name, create one from the ingredient name
        if not object_name:
            clean_name = ingredient_name.lower().replace(" ", "_")
            object_name = f"ingredients/{clean_name}.png"
            
        # Create the new URL
        new_url = f"{new_oci_par_url}/{object_name}"
            
        print(f"Updating ingredient '{ingredient_name}':")
        print(f"  Old URL: {old_url[:50]}..." if old_url else "  Old URL: None")
        print(f"  New URL: {new_url[:50]}...")
        
        # Create update data
        update_data = {
            'type': 'ingredient',
            'name': ingredient_name,
            'prompt': ingredient.get('prompt', ''),
            'url': new_url
        }
        
        try:
            # Update in database
            result = db.client.table('generated_images').update(update_data).eq('id', ingredient_id).execute()
            
            if result.data and len(result.data) > 0:
                updated_count += 1
                print(f"  ✓ Updated successfully")
            else:
                error_count += 1
                print(f"  ✗ Update returned no data")
        except Exception as e:
            error_count += 1
            print(f"  ✗ Error updating: {str(e)}")
    
    print("\nUpdate complete:")
    print(f"  Updated: {updated_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Errors: {error_count}")
    
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()