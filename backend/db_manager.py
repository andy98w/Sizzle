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
                    print(f"Supabase client initialized successfully with URL: {supabase_url}")
                    
                    # List available tables to debug
                    try:
                        print("Checking Supabase connection...")
                        test_query = self.client.table('generated_images').select('count').limit(1).execute()
                        print(f"Test query result: {test_query}")
                        if hasattr(test_query, 'data'):
                            print(f"Test data: {test_query.data}")
                    except Exception as table_err:
                        print(f"Error checking Supabase tables: {table_err}")
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
            print(f"Supabase connection error: {e}")
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
                print(f"Updated recipe: {title}")
            else:
                # Insert a new recipe
                result = self.client.table('recipes').insert(recipe_data).execute()
                print(f"Created new recipe: {title}")
                
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
                
        except Exception as e:
            print(f"Error saving recipe: {e}")
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
            print(f"Error getting recipe: {e}")
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
            print(f"Error getting recipe by title: {e}")
            return None
    
    def search_recipes(self, query: str) -> List[Dict[str, Any]]:
        """Search for recipes matching the query"""
        if not self.client:
            return []
            
        try:
            # Use PostgreSQL full-text search
            # This assumes you've set up a text search index on the title and description
            result = self.client.table('recipes').select('*').textSearch('title', query).execute()
            
            if result.data:
                return result.data
            return []
                
        except Exception as e:
            print(f"Error searching recipes: {e}")
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
            print(f"Error listing recipes: {e}")
            return []
    
    # Image Storage Methods
    
    def save_image_metadata(self, 
                           image_type: str, 
                           name: str,
                           prompt: str,
                           storage_path: str,
                           url: str) -> Optional[Dict[str, Any]]:
        """Save metadata about a generated image"""
        if not self.client:
            return None
            
        try:
            # Print detailed information about what we're saving
            print("\n--- SAVING IMAGE METADATA TO SUPABASE ---")
            print(f"Type: {image_type}")
            print(f"Name: {name}")
            print(f"Prompt: {prompt}")
            print(f"Storage Path: {storage_path}")
            print(f"URL: {url}")
            
            image_data = {
                'type': image_type,  # e.g., 'ingredient', 'step', 'equipment', 'action'
                'name': name,
                'prompt': prompt,
                'storage_path': storage_path,
                'url': url
            }
            
            print(f"Inserting into 'generated_images' table: {image_data}")
            result = self.client.table('generated_images').insert(image_data).execute()
            
            if result.data and len(result.data) > 0:
                print(f"Successfully saved image metadata. Result: {result.data[0]}")
                return result.data[0]
            else:
                print("No data returned from insert operation")
                return None
                
        except Exception as e:
            print(f"Error saving image metadata: {e}")
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
            print(f"Error getting image metadata: {e}")
            return None
            
    def save_ingredient(self, name: str, image_url: str, prompt: str) -> Optional[Dict[str, Any]]:
        """Save an approved ingredient with its image to the database"""
        if not self.client:
            return None
            
        try:
            # Check if this ingredient already exists
            existing = self.get_image_by_name('ingredient', name)
            if existing:
                print(f"Ingredient {name} already exists, updating")
                print(f"EXISTING RECORD DETAILS: {existing}")
                print(f"Existing ID: {existing.get('id')}")
                print(f"Existing storage_path: {existing.get('storage_path')}")
                print(f"Existing url: {existing.get('url')}")
                
                # Create update data with all required fields
                update_data = {
                    'prompt': prompt,
                    'type': 'ingredient',  # Ensure type is correctly set
                    'name': name,  # Ensure name is correctly set
                }
                
                # Handle different URL formats
                print(f"Updating ingredient with image_url: {image_url}")
                if image_url.startswith('http'):
                    # For OCI cloud storage or other external URLs
                    print(f"This is an HTTP URL (OCI)")
                    update_data['storage_path'] = image_url
                    update_data['url'] = image_url
                else:
                    # For local storage paths
                    print(f"This is a local path")
                    update_data['storage_path'] = image_url
                    update_data['url'] = f"http://localhost:8000{image_url}"
                
                print(f"Final update data: {update_data}")
                
                # Try a different approach with RPC
                print(f"Executing Supabase update for ingredient ID: {existing['id']}")
                
                try:
                    # First try direct update
                    print("Trying standard update...")
                    result = self.client.table('generated_images').update(update_data).eq('id', existing['id']).execute()
                    
                    print(f"Supabase update result: {result}")
                    if hasattr(result, 'data'):
                        print(f"Supabase result data: {result.data}")
                    
                    if result.data and len(result.data) > 0:
                        print(f"Updated ingredient {name} with new image URL: {image_url}")
                        print(f"UPDATED RECORD: {result.data[0]}")
                        return result.data[0]
                    
                    # If standard update didn't work, try direct REST API call
                    print("Standard update didn't return data. Trying direct REST API call...")
                    
                    import requests
                    import json
                    
                    supabase_url = os.getenv("SUPABASE_URL")
                    supabase_key = os.getenv("SUPABASE_KEY")
                    
                    if not supabase_url or not supabase_key:
                        print("Missing Supabase credentials for REST API call")
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
                        "storage_path": image_url,
                        "url": image_url,
                        "prompt": prompt,
                        "type": "ingredient",  # Ensure the type is set correctly
                        "name": name  # Ensure the name is set correctly
                    }
                    
                    # Use PATCH to update the record
                    patch_url = f"{api_url}?id=eq.{existing['id']}"
                    patch_data = json.dumps(update_payload)
                    
                    print(f"Making PATCH request to: {patch_url}")
                    print(f"With data: {patch_data}")
                    
                    try:
                        response = requests.patch(
                            patch_url,
                            headers=headers,
                            data=patch_data
                        )
                        
                        print(f"REST API response status: {response.status_code}")
                        print(f"REST API response body: {response.text}")
                        
                        if response.status_code in (200, 201, 204):
                            print("REST API update successful")
                            
                            # Try a direct POST request with upsert instead of PUT
                            print("Attempting POST with upsert to ensure update...")
                            
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
                            print(f"POST upsert response status: {post_response.status_code}")
                            print(f"POST upsert response body: {post_response.text}")
                            
                            # Add a short delay to let the database update
                            import time
                            print("Waiting for database to update...")
                            time.sleep(1)
                            
                            # Check if POST upsert returned data
                            try:
                                if post_response.status_code in (200, 201, 204) and post_response.text:
                                    post_data = post_response.json()
                                    if post_data and len(post_data) > 0:
                                        print(f"Upsert returned updated record: {post_data[0]}")
                                        return post_data[0]
                            except Exception as post_err:
                                print(f"Error parsing POST response: {post_err}")
                            
                            # If POST didn't work, fetch using direct REST API
                            print("Fetching record using direct REST API...")
                            get_url = f"{api_url}?id=eq.{existing['id']}&select=*"
                            get_headers = {
                                "apikey": supabase_key,
                                "Authorization": f"Bearer {supabase_key}"
                            }
                            
                            get_response = requests.get(get_url, headers=get_headers)
                            print(f"GET response status: {get_response.status_code}")
                            
                            if get_response.status_code == 200 and get_response.text:
                                try:
                                    fetched_data = get_response.json()
                                    if fetched_data and len(fetched_data) > 0:
                                        print(f"Retrieved record via REST API: {fetched_data[0]}")
                                        
                                        # If storage_path and url are empty but we have the image_url,
                                        # create a client-side updated record
                                        if (not fetched_data[0].get('storage_path') or 
                                            not fetched_data[0].get('url')):
                                            print("Server record has empty fields, using client-side data")
                                            updated_record = dict(fetched_data[0])
                                            updated_record['storage_path'] = image_url
                                            updated_record['url'] = image_url
                                            return updated_record
                                        
                                        return fetched_data[0]
                                except Exception as json_err:
                                    print(f"Error parsing JSON response: {json_err}")
                            
                            # Fall back to returning a client-side updated record
                            print("Using client-side updated record as fallback")
                            updated_record = dict(existing)
                            updated_record['storage_path'] = image_url
                            updated_record['url'] = image_url
                            updated_record['prompt'] = prompt
                            return updated_record
                    except Exception as rest_err:
                        print(f"REST API error: {rest_err}")
                    
                    # Fallback: Now fetch the record even if update failed
                    result = self.client.table('generated_images').select('*').eq('id', existing['id']).execute()
                    
                    if result.data and len(result.data) > 0:
                        updated_record = result.data[0]
                        print(f"Retrieved existing record: {updated_record}")
                        return updated_record
                        
                except Exception as update_err:
                    print(f"Error during update attempts: {update_err}")
                    import traceback
                    traceback.print_exc()
                return existing
                
            # For new ingredients
            # Handle different URL formats for image metadata
            storage_path = image_url
            url = image_url
            
            print(f"Creating new ingredient record with image_url: {image_url}")
            
            # If it's a local path, prepend the server URL
            if not image_url.startswith('http'):
                print(f"This is a local path")
                url = f"http://localhost:8000{image_url}"
            else:
                print(f"This is an HTTP URL (OCI)")
            
            print(f"Saving new ingredient with storage_path: {storage_path}, url: {url}")
            
            # Save the image metadata
            return self.save_image_metadata(
                image_type='ingredient',
                name=name,
                prompt=prompt,
                storage_path=storage_path,
                url=url
            )
        except Exception as e:
            print(f"Error saving ingredient: {e}")
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
                    print(f"Total ingredient count from PostgreSQL: {count}")
                    return count
                
            # Fallback: count manually
            print("Using fallback manual count method")
            count_result = self.client.table('generated_images')\
                .select('id')\
                .eq('type', 'ingredient')\
                .execute()
            
            count = len(count_result.data) if count_result.data else 0
            print(f"Total manual ingredient count: {count}")
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
            print(f"Error cleaning up placeholder ingredients: {e}")
            return 0
            


# Singleton instance
db = SupabaseManager()

if __name__ == "__main__":
    # Test the Supabase connection
    if db.is_connected():
        test_result = db.test_connection()
        print(f"Connection test: {'Success' if test_result else 'Failed'}")
    else:
        print("Supabase client not initialized. Check your environment variables.")