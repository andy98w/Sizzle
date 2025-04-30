import os
import re
from typing import Dict, List, Optional, Any
import json
import sys
import platform

venv_site_packages = os.path.join(os.path.dirname(__file__), 'venv/lib/python3.13/site-packages')
if os.path.exists(venv_site_packages):
    sys.path.insert(0, venv_site_packages)

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv():
        print("Warning: python-dotenv not available, environment variables may not be loaded correctly")

python_version = platform.python_version_tuple()
major, minor = python_version[0], python_version[1]
site_packages_path = os.path.join(os.path.dirname(__file__), f'venv/lib/python{major}.{minor}/site-packages')

if os.path.exists(site_packages_path):
    sys.path.insert(0, site_packages_path)
else:
    alternate_paths = [
        os.path.join(os.path.dirname(__file__), 'venv/lib/python3.13/site-packages'),
        os.path.join(os.path.dirname(__file__), 'venv/lib/python3.9/site-packages'),
        os.path.join(os.path.dirname(__file__), 'venv/lib/site-packages'),
    ]
    for path in alternate_paths:
        if os.path.exists(path):
            sys.path.insert(0, path)
            break

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: Could not import 'supabase'. Make sure it's installed with 'pip install supabase'")
    create_client = lambda a, b: None
    class Client: pass

load_dotenv()

class SupabaseManager:
    """Class to handle interactions with Supabase database"""
    
    def __init__(self):
        try:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_KEY")
            
            if not supabase_url or not supabase_key:
                print("Warning: Supabase credentials not found in environment variables.")
                self.client = None
            else:
                if create_client.__name__ == "<lambda>":
                    print("Warning: Using fallback Supabase client due to missing package.")
                    self.client = None
                else:
                    self.client = create_client(supabase_url, supabase_key)

                    # List available tables to debug
                    try:
                        test_query = self.client.table('generated_images').select('count').limit(1).execute()
                        if hasattr(test_query, 'data'):
                            pass # Database connection check complete
                    except Exception as table_err:
                        pass # Continue despite table check error
                        
        except Exception as e:
            print(f"Error initializing Supabase client: {e}")
            import traceback
            traceback.print_exc()
            self.client = None
    
    def is_connected(self) -> bool:
        """Check if Supabase client is connected"""
        return self.client is not None
    
    def test_connection(self) -> bool:
        """Test the connection to Supabase"""
        if not self.client:
            return False
            
        try:
            # Try to get data from a table
            self.client.table('recipes').select('id').limit(1).execute()
            return True
        except Exception as e:
            
            return False
    
    # Recipe Management Methods
    
    def save_recipe(self, recipe_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Save a recipe to the database"""
        if not self.client:
            return None
            
        try:
            # Make sure we have the essential fields
            if 'title' not in recipe_data:
                raise ValueError("Recipe must have a title")
                
            # Check if we already have this recipe
            title = recipe_data['title']
            existing = self.client.table('recipes').select('id').eq('title', title).execute()
            
            if existing.data and len(existing.data) > 0:
                # Update the existing recipe
                recipe_id = existing.data[0]['id']
                result = self.client.table('recipes').update(recipe_data).eq('id', recipe_id).execute()
                
            else:
                # Insert a new recipe
                result = self.client.table('recipes').insert(recipe_data).execute()

            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
                
        except Exception as e:
            
            return None
    
    def get_recipe(self, recipe_id: int) -> Optional[Dict[str, Any]]:
        """Get a recipe by its ID"""
        if not self.client:
            return None
            
        try:
            result = self.client.table('recipes').select('*').eq('id', recipe_id).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
                
        except Exception as e:
            
            return None
    
    def get_recipe_by_title(self, title: str) -> Optional[Dict[str, Any]]:
        """Get a recipe by its title"""
        if not self.client:
            return None
            
        try:
            result = self.client.table('recipes').select('*').eq('title', title).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
                
        except Exception as e:
            
            return None
    
    def search_recipes(self, query: str) -> List[Dict[str, Any]]:
        """Search for recipes matching the query and return the 10 most relevant results"""
        if not self.client:
            return []
            
        try:
            # Split the query into words for more flexible matching
            query_terms = query.lower().split()
            all_recipes = []
            
            # First try exact title match with PostgreSQL full-text search
            try:
                title_result = self.client.table('recipes').select('*').textSearch('title', query).execute()
                if title_result.data:
                    all_recipes.extend(title_result.data)
            except Exception:
                pass
                
            # Then try description search
            try:
                desc_result = self.client.table('recipes').select('*').textSearch('description', query).execute()
                if desc_result.data:
                    # Add results not already included
                    for recipe in desc_result.data:
                        if not any(r.get('id') == recipe.get('id') for r in all_recipes):
                            all_recipes.append(recipe)
            except Exception:
                pass
                
            # Also try matching any title words for better flexibility
            try:
                for term in query_terms:
                    if len(term) >= 3:  # Only search for terms with at least 3 characters
                        title_term_result = self.client.table('recipes').select('*').ilike('title', f'%{term}%').execute()
                        if title_term_result.data:
                            for recipe in title_term_result.data:
                                if not any(r.get('id') == recipe.get('id') for r in all_recipes):
                                    all_recipes.append(recipe)
            except Exception:
                pass
                
            # If still no results or fewer than expected, try ingredient-based search
            if len(all_recipes) < 10:
                try:
                    # Get all recipes
                    all_result = self.client.table('recipes').select('*').execute()
                    
                    if all_result.data:
                        # Manual filtering for ingredient matching
                        for recipe in all_result.data:
                            # Skip if already in results
                            if any(r.get('id') == recipe.get('id') for r in all_recipes):
                                continue
                                
                            # Check if any ingredients match the query
                            ingredients = recipe.get('ingredients', [])
                            if ingredients and isinstance(ingredients, list):
                                for ingredient in ingredients:
                                    if isinstance(ingredient, dict) and 'name' in ingredient:
                                        ingredient_name = ingredient['name'].lower()
                                        # Check if any query term appears in the ingredient name
                                        if any(term in ingredient_name for term in query_terms):
                                            all_recipes.append(recipe)
                                            break
                except Exception:
                    pass
                    
            # Sort results by relevance (exact title match first, then description match, then ingredients)
            def relevance_score(recipe):
                recipe_title = recipe.get('title', '').lower()
                score = 0
                
                # Exact title match gets highest score
                if query.lower() == recipe_title:
                    score += 100
                # Partial title match
                elif query.lower() in recipe_title:
                    score += 50
                # Word match in title
                else:
                    for term in query_terms:
                        if term in recipe_title:
                            score += 10
                
                # Check description
                description = recipe.get('description', '').lower()
                if query.lower() in description:
                    score += 5
                else:
                    for term in query_terms:
                        if term in description:
                            score += 2
                
                # Check ingredients
                ingredients = recipe.get('ingredients', [])
                if ingredients and isinstance(ingredients, list):
                    for ingredient in ingredients:
                        if isinstance(ingredient, dict) and 'name' in ingredient:
                            ingredient_name = ingredient['name'].lower()
                            if query.lower() in ingredient_name:
                                score += 3
                            else:
                                for term in query_terms:
                                    if term in ingredient_name:
                                        score += 1
                
                return score
            
            # Sort by relevance score (highest first)
            all_recipes.sort(key=relevance_score, reverse=True)
            
            # Limit to 10 most relevant results
            return all_recipes[:10]
                
        except Exception as e:
            print(f"Error in search_recipes: {e}")
            return []
    
    def list_recent_recipes(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get a list of recent recipes"""
        if not self.client:
            return []
            
        try:
            result = self.client.table('recipes').select('*').order('created_at', desc=True).limit(limit).execute()
            
            if result.data:
                return result.data
            return []
                
        except Exception as e:
            
            return []
    
    # Image Storage Methods
    
    def save_image_metadata(self, 
                           image_type: str, 
                           name: str,
                           prompt: str,
                           url: str) -> Optional[Dict[str, Any]]:
        """Save metadata about a generated image"""
        if not self.client:
            return None
            
        try:
            # Print detailed information about what we're saving
            print("\n--- SAVING IMAGE METADATA TO SUPABASE ---")

            # Clean the URL by removing any spaces that might cause issues with Oracle Cloud
            cleaned_url = url.replace(" ", "") if url else ""
            
            image_data = {
                'type': image_type,  # e.g., 'ingredient', 'step', 'equipment', 'action'
                'name': name,
                'prompt': prompt,
                'url': cleaned_url
            }

            result = self.client.table('generated_images').insert(image_data).execute()
            
            if result.data and len(result.data) > 0:
                
                return result.data[0]
            else:
                
                return None
                
        except Exception as e:
            
            # Print the exception traceback for more detail
            import traceback
            traceback.print_exc()
            return None
    
    def get_image_by_name(self, image_type: str, name: str) -> Optional[Dict[str, Any]]:
        """Get image metadata by type and name"""
        if not self.client:
            return None
            
        try:
            result = self.client.table('generated_images').select('*').eq('type', image_type).eq('name', name).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            else:
                return None
                
        except Exception as e:
            
            return None
            
    def save_ingredient(self, name: str, image_url: str, prompt: str) -> Optional[Dict[str, Any]]:
        """Save an approved ingredient with its image to the database"""
        if not self.client:
            return None
            
        try:
            # Check if this ingredient already exists
            existing = self.get_image_by_name('ingredient', name)
            if existing:

                # Create update data with all required fields
                update_data = {
                    'prompt': prompt,  # Make sure prompt is included
                    'type': 'ingredient',  # Ensure type is correctly set
                    'name': name,  # Ensure name is correctly set
                }
                
                # Handle different URL formats
                if image_url.startswith('http'):
                    # For OCI cloud storage or other external URLs
                    # Clean the URL by removing spaces that can break Oracle Cloud URLs
                    cleaned_url = image_url.replace(" ", "")
                    if cleaned_url != image_url:
                        pass # Space removal complete
                    update_data['url'] = cleaned_url
                else:
                    # For local storage paths
                    update_data['url'] = f"http://localhost:8000{image_url}"

                # Try a different approach with RPC

                try:
                    # First try direct update
                    result = self.client.table('generated_images').update(update_data).eq('id', existing['id']).execute()

                    if hasattr(result, 'data'):
                        pass # Result has data attribute

                    if result.data and len(result.data) > 0:

                        return result.data[0]
                    
                    # If standard update didn't work, try direct REST API call

                    import requests
                    import json
                    
                    supabase_url = os.getenv("SUPABASE_URL")
                    supabase_key = os.getenv("SUPABASE_KEY")
                    
                    if not supabase_url or not supabase_key:
                        
                        return existing
                    
                    # Prepare request data
                    api_url = f"{supabase_url}/rest/v1/generated_images"
                    
                    # Properly escape single quotes in the prompt
                    safe_prompt = prompt.replace("'", "''")
                    
                    headers = {
                        "apikey": supabase_key,
                        "Authorization": f"Bearer {supabase_key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    }
                    
                    # Prepare the data for update
                    update_payload = {
                        "url": image_url,
                        "prompt": prompt,
                        "type": "ingredient",  # Ensure the type is set correctly
                        "name": name  # Ensure the name is set correctly
                    }
                    
                    # Use PATCH to update the record
                    patch_url = f"{api_url}?id=eq.{existing['id']}"
                    patch_data = json.dumps(update_payload)

                    try:
                        response = requests.patch(
                            patch_url,
                            headers=headers,
                            data=patch_data
                        )

                        if response.status_code in (200, 201, 204):

                            # Try a direct POST request with upsert instead of PUT

                            # For upsert we use the base URL without filter
                            post_url = api_url
                            
                            # Add the Prefer header for upsert behavior
                            upsert_headers = headers.copy()
                            upsert_headers["Prefer"] = "resolution=merge-duplicates,return=representation"
                            
                            # For upsert we must include the primary key in the payload
                            upsert_data = json.loads(patch_data)
                            upsert_data["id"] = existing["id"]
                            
                            post_response = requests.post(
                                post_url,
                                headers=upsert_headers,
                                data=json.dumps(upsert_data)
                            )

                            # Add a short delay to let the database update
                            import time
                            
                            time.sleep(1)
                            
                            # Check if POST upsert returned data
                            try:
                                if post_response.status_code in (200, 201, 204) and post_response.text:
                                    post_data = post_response.json()
                                    if post_data and len(post_data) > 0:
                                        return post_data[0]
                            except Exception as post_err:
                                pass # Silently handle JSON parsing errors

                            # If POST didn't work, fetch using direct REST API
                            
                            get_url = f"{api_url}?id=eq.{existing['id']}&select=*"
                            get_headers = {
                                "apikey": supabase_key,
                                "Authorization": f"Bearer {supabase_key}"
                            }
                            
                            get_response = requests.get(get_url, headers=get_headers)

                            if get_response.status_code == 200 and get_response.text:
                                try:
                                    fetched_data = get_response.json()
                                    if fetched_data and len(fetched_data) > 0:

                                        # If url is empty but we have the image_url,
                                        # create a client-side updated record
                                        if not fetched_data[0].get('url'):
                                            
                                            updated_record = dict(fetched_data[0])
                                            updated_record['url'] = image_url
                                            return updated_record
                                        
                                        return fetched_data[0]
                                except Exception as json_err:
                                    pass # Silently handle JSON errors

                            # Fall back to returning a client-side updated record
                            
                            updated_record = dict(existing)
                            updated_record['url'] = image_url
                            updated_record['prompt'] = prompt
                            return updated_record
                    except Exception as rest_err:
                        pass # Silently handle REST API errors
                        
                    # Fallback: Now fetch the record even if update failed
                    result = self.client.table('generated_images').select('*').eq('id', existing['id']).execute()
                    
                    if result.data and len(result.data) > 0:
                        updated_record = result.data[0]
                        
                        return updated_record
                        
                except Exception as update_err:
                    
                    import traceback
                    traceback.print_exc()
                return existing
                
            # For new ingredients

            # Handle different URL formats for image metadata
            url = image_url
            
            # If it's a local path, prepend the server URL if needed
            if not image_url.startswith('http'):
                
                url = f"http://localhost:8000{image_url}"
            else:
                
                # Clean the URL by removing spaces that can break Oracle Cloud URLs
                cleaned_url = image_url.replace(" ", "")
                if cleaned_url != image_url:
                    
                    url = cleaned_url

            # Save the image metadata
            return self.save_image_metadata(
                image_type='ingredient',
                name=name,
                prompt=prompt,
                url=url
            )
        except Exception as e:
            
            return None
            
    def list_ingredients(self, limit: int = 1000, offset: int = 0) -> List[Dict[str, Any]]:
        """Get a list of ingredients with pagination"""
        if not self.client:
            return []
            
        try:
            # Use pagination with limit and offset, order by ID for consistency
            result = self.client.table('generated_images').select('*')\
                .eq('type', 'ingredient')\
                .order('id')\
                .range(offset, offset + limit - 1)\
                .execute()
            
            if result.data:
                return result.data
            return []
                
        except Exception as e:
            print(f"Error listing ingredients: {e}")
            return []
            
    def count_ingredients(self) -> int:
        """Count the total number of ingredients in the database"""
        if not self.client:
            return 0
            
        try:
            # Use count() function to get total count efficiently
            result = self.client.table('generated_images')\
                .select('count')\
                .eq('type', 'ingredient')\
                .execute()
            
            # Extract count from result
            if result.data and len(result.data) > 0:
                if 'count' in result.data[0]:
                    count = result.data[0]['count']
                    
                    return count
                
            # Fallback: count manually
            
            count_result = self.client.table('generated_images')\
                .select('id')\
                .eq('type', 'ingredient')\
                .execute()
            
            count = len(count_result.data) if count_result.data else 0
            
            return count
                
        except Exception as e:
            return 0
            
    def cleanup_placeholder_ingredients(self) -> int:
        """Remove placeholder 'Ingredient #X' entries from the database"""
        if not self.client:
            return 0
            
        try:
            # Find all ingredients with 'ingredient' in the name, case insensitive
            count_query = self.client.table('generated_images')\
                .select('id', 'name')\
                .eq('type', 'ingredient')\
                .ilike('name', '%ingredient%')\
                .execute()
                
            if not count_query.data:
                return 0
                
            # Extract IDs
            placeholder_ids = [item['id'] for item in count_query.data]
            
            # Delete the placeholders
            if placeholder_ids:
                # Delete in batches to avoid API limits
                batch_size = 100
                deleted_count = 0
                
                for i in range(0, len(placeholder_ids), batch_size):
                    batch = placeholder_ids[i:i+batch_size]
                    if batch:
                        delete_result = self.client.table('generated_images')\
                            .delete()\
                            .in_('id', batch)\
                            .execute()
                        deleted_count += len(batch)
                
                return deleted_count
            
            return 0
                
        except Exception as e:
            
            return 0

# Singleton instance
db = SupabaseManager()

if __name__ == "__main__":
    # Test the Supabase connection
    if db.is_connected():
        test_result = db.test_connection()
        
    else:
        print("Supabase client not initialized. Check your environment variables.")