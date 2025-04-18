import os
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

FALLBACK_SUPABASE_URL = "https://sxupltvgnfbiwgfnyvge.supabase.co"
FALLBACK_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4dXBsdHZnbmZiaXdnZm55dmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwMDk3NDcsImV4cCI6MjA2MDU4NTc0N30.DFaD_HWKLlUxHB7aCles8r6wo8lIFNkQ7SRbTH2krUc"

class SupabaseManager:
    """Class to handle interactions with Supabase database"""
    
    def __init__(self):
        try:
            supabase_url = os.getenv("SUPABASE_URL", FALLBACK_SUPABASE_URL)
            supabase_key = os.getenv("SUPABASE_KEY", FALLBACK_SUPABASE_KEY)
            
            if not supabase_url or not supabase_key:
                print("Warning: Supabase credentials not found in environment variables.")
                self.client = None
            else:
                if create_client.__name__ == "<lambda>":
                    print("Warning: Using fallback Supabase client due to missing package.")
                    self.client = None
                else:
                    self.client = create_client(supabase_url, supabase_key)
                    print("Supabase client initialized successfully.")
        except Exception as e:
            print(f"Error initializing Supabase client: {e}")
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
            image_data = {
                'type': image_type,  # e.g., 'ingredient', 'step', 'equipment', 'action'
                'name': name,
                'prompt': prompt,
                'storage_path': storage_path,
                'url': url
            }
            
            result = self.client.table('generated_images').insert(image_data).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
                
        except Exception as e:
            print(f"Error saving image metadata: {e}")
            return None
    
    def get_image_by_name(self, image_type: str, name: str) -> Optional[Dict[str, Any]]:
        """Get image metadata by type and name"""
        if not self.client:
            return None
            
        try:
            result = self.client.table('generated_images').select('*').eq('type', image_type).eq('name', name).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
                
        except Exception as e:
            print(f"Error getting image metadata: {e}")
            return None


# Singleton instance
db = SupabaseManager()

if __name__ == "__main__":
    # Test the Supabase connection
    if db.is_connected():
        test_result = db.test_connection()
        print(f"Connection test: {'Success' if test_result else 'Failed'}")
    else:
        print("Supabase client not initialized. Check your environment variables.")