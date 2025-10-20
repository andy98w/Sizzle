"""Database connection management module for the Sizzle application."""

from typing import Dict, List, Optional, Any, Tuple

from config import SUPABASE_URL, SUPABASE_KEY
from utils import logger, log_exception

# Sample recipe data for when database is not available
SAMPLE_RECIPES = {
    "sushi": {
        "id": 1,
        "title": "Sushi Rice",
        "description": "Perfect sushi rice is the foundation of good sushi",
        "prep_time": "10 minutes",
        "cook_time": "20 minutes",
        "servings": 4,
        "ingredients": [
            {"id": 1, "name": "Japanese short-grain rice", "quantity": "2 cups"},
            {"id": 2, "name": "Water", "quantity": "2 cups"},
            {"id": 3, "name": "Rice vinegar", "quantity": "1/4 cup"},
            {"id": 4, "name": "Sugar", "quantity": "2 tablespoons"},
            {"id": 5, "name": "Salt", "quantity": "1 teaspoon"}
        ],
        "equipment": [
            {"id": 1, "name": "Rice cooker or pot with lid"},
            {"id": 2, "name": "Wooden spoon"}
        ],
        "steps": [
            {
                "id": 1,
                "instruction": "Rinse the rice until water runs clear",
                "action": "rinse",
                "ingredients": [{"id": 1, "name": "Japanese short-grain rice", "quantity": "2 cups"}],
                "equipment": []
            },
            {
                "id": 2,
                "instruction": "Cook the rice according to package instructions",
                "action": "cook",
                "ingredients": [
                    {"id": 1, "name": "Japanese short-grain rice", "quantity": "2 cups"},
                    {"id": 2, "name": "Water", "quantity": "2 cups"}
                ],
                "equipment": [{"id": 1, "name": "Rice cooker or pot with lid"}]
            },
            {
                "id": 3,
                "instruction": "Mix rice vinegar, sugar, and salt in a small bowl until dissolved",
                "action": "mix",
                "ingredients": [
                    {"id": 3, "name": "Rice vinegar", "quantity": "1/4 cup"},
                    {"id": 4, "name": "Sugar", "quantity": "2 tablespoons"},
                    {"id": 5, "name": "Salt", "quantity": "1 teaspoon"}
                ],
                "equipment": []
            },
            {
                "id": 4,
                "instruction": "Fold the vinegar mixture into the hot rice",
                "action": "fold",
                "ingredients": [],
                "equipment": [{"id": 2, "name": "Wooden spoon"}]
            }
        ]
    },
    "chocolate_cake": {
        "id": 2,
        "title": "Chocolate Cake",
        "description": "Rich and moist chocolate cake",
        "prep_time": "15 minutes",
        "cook_time": "35 minutes",
        "servings": 8,
        "ingredients": [
            {"id": 6, "name": "All-purpose flour", "quantity": "2 cups"},
            {"id": 7, "name": "Sugar", "quantity": "2 cups"},
            {"id": 8, "name": "Cocoa powder", "quantity": "3/4 cup"},
            {"id": 9, "name": "Baking powder", "quantity": "2 teaspoons"},
            {"id": 10, "name": "Baking soda", "quantity": "1 1/2 teaspoons"},
            {"id": 11, "name": "Salt", "quantity": "1 teaspoon"},
            {"id": 12, "name": "Eggs", "quantity": "2"},
            {"id": 13, "name": "Milk", "quantity": "1 cup"},
            {"id": 14, "name": "Vegetable oil", "quantity": "1/2 cup"},
            {"id": 15, "name": "Vanilla extract", "quantity": "2 teaspoons"},
            {"id": 16, "name": "Boiling water", "quantity": "1 cup"}
        ],
        "equipment": [
            {"id": 3, "name": "Mixing bowl"},
            {"id": 4, "name": "Cake pan"},
            {"id": 5, "name": "Electric mixer"}
        ],
        "steps": [
            {
                "id": 5,
                "instruction": "Preheat oven to 350°F (175°C). Grease and flour two 9-inch round cake pans.",
                "action": "preheat",
                "ingredients": [],
                "equipment": [{"id": 4, "name": "Cake pan"}]
            },
            {
                "id": 6,
                "instruction": "In a large bowl, combine flour, sugar, cocoa, baking powder, baking soda, and salt.",
                "action": "mix",
                "ingredients": [
                    {"id": 6, "name": "All-purpose flour", "quantity": "2 cups"},
                    {"id": 7, "name": "Sugar", "quantity": "2 cups"},
                    {"id": 8, "name": "Cocoa powder", "quantity": "3/4 cup"},
                    {"id": 9, "name": "Baking powder", "quantity": "2 teaspoons"},
                    {"id": 10, "name": "Baking soda", "quantity": "1 1/2 teaspoons"},
                    {"id": 11, "name": "Salt", "quantity": "1 teaspoon"}
                ],
                "equipment": [{"id": 3, "name": "Mixing bowl"}]
            },
            {
                "id": 7,
                "instruction": "Add eggs, milk, oil, and vanilla. Beat with mixer on medium speed for 2 minutes.",
                "action": "beat",
                "ingredients": [
                    {"id": 12, "name": "Eggs", "quantity": "2"},
                    {"id": 13, "name": "Milk", "quantity": "1 cup"},
                    {"id": 14, "name": "Vegetable oil", "quantity": "1/2 cup"},
                    {"id": 15, "name": "Vanilla extract", "quantity": "2 teaspoons"}
                ],
                "equipment": [{"id": 5, "name": "Electric mixer"}]
            },
            {
                "id": 8,
                "instruction": "Stir in boiling water. The batter will be thin.",
                "action": "stir",
                "ingredients": [{"id": 16, "name": "Boiling water", "quantity": "1 cup"}],
                "equipment": []
            },
            {
                "id": 9,
                "instruction": "Pour batter into prepared pans. Bake for 30-35 minutes or until a toothpick comes out clean.",
                "action": "bake",
                "ingredients": [],
                "equipment": [{"id": 4, "name": "Cake pan"}]
            }
        ]
    }
}

supabase_client = None
supabase_available = False

def initialize_supabase():
    """Initialize Supabase client."""
    global supabase_client, supabase_available

    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning("Supabase credentials not found. Using sample data.")
        return False

    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info(f"Connected to Supabase at {SUPABASE_URL}")
        test = supabase_client.table("recipes").select("id").limit(1).execute()
        logger.info("Supabase connection successful!")
        supabase_available = True
        return True
    except Exception as e:
        logger.error(f"Error connecting to Supabase: {str(e)}")
        return False

try:
    initialize_supabase()
except ImportError:
    logger.warning("Supabase package not installed. Using sample data.")
    supabase_available = False

def execute_query(query: str, params: Optional[Tuple] = None) -> List[Tuple]:
    """Executes a database query and returns results as tuples."""
    if not supabase_available or not supabase_client:
        return []

    try:
        if 'SELECT' in query.upper():
            try:
                table_name = query.upper().split('FROM')[1].strip().split()[0].strip('"').lower()
                limit = 100
                offset = 0

                if 'LIMIT' in query.upper():
                    try:
                        limit_part = query.upper().split('LIMIT')[1].strip()
                        limit = int(limit_part.split('OFFSET')[0].strip()) if 'OFFSET' in limit_part else int(limit_part)
                    except:
                        pass

                if 'OFFSET' in query.upper():
                    try:
                        offset = int(query.upper().split('OFFSET')[1].strip())
                    except:
                        pass

                supabase_query = supabase_client.table(table_name).select('*')
                if limit:
                    supabase_query = supabase_query.limit(limit)
                if offset:
                    supabase_query = supabase_query.range(offset, offset + limit - 1)

                result = supabase_query.execute()

                if 'COUNT(*)' in query.upper():
                    return [(len(result.data),)]

                return [(row,) for row in result.data] if result.data else []
            except Exception as e:
                logger.error(f"Error parsing or executing SELECT: {str(e)}")
                return []
        else:
            return []

    except Exception as e:
        logger.error(f"Error executing query: {str(e)}")
        return []

def execute_query_dict(query: str, params: Optional[Tuple] = None) -> List[Dict]:
    """Executes a database query and returns results as dictionaries."""
    if not supabase_available:
        return []

    try:
        if "FROM" in query.upper():
            table_name = query.upper().split("FROM")[1].strip().split()[0].strip('"').lower()

            if "COUNT(*)" in query.upper():
                result = supabase_client.table(table_name).select('id').execute()
                return [{"count": len(result.data) if result.data else 0}]

            limit = 100
            offset = 0

            if "LIMIT" in query.upper():
                try:
                    limit_part = query.upper().split("LIMIT")[1].strip()
                    limit = int(limit_part.split("OFFSET")[0].strip()) if "OFFSET" in limit_part else int(limit_part)
                except:
                    pass

            if "OFFSET" in query.upper():
                try:
                    offset = int(query.upper().split("OFFSET")[1].strip())
                except:
                    pass

            where_conditions = []
            if "WHERE" in query.upper():
                where_clause = query.split("WHERE")[1].strip()
                if "LIMIT" in where_clause.upper():
                    where_clause = where_clause.split("LIMIT")[0].strip()
                if "ORDER" in where_clause.upper():
                    where_clause = where_clause.split("ORDER")[0].strip()

                if "=" in where_clause and params:
                    conditions = where_clause.split("AND")
                    param_index = 0

                    for condition in conditions:
                        condition = condition.strip()
                        if "=" in condition:
                            parts = condition.split("=")
                            if len(parts) == 2:
                                col_name = parts[0].strip().lower()
                                val_placeholder = parts[1].strip()

                                if "%s" in val_placeholder and param_index < len(params):
                                    val = params[param_index]
                                    param_index += 1
                                else:
                                    val = val_placeholder
                                    if val.startswith("'") and val.endswith("'"):
                                        val = val[1:-1]

                                where_conditions.append((col_name, val))

            supabase_query = supabase_client.table(table_name).select('*')

            for col_name, val in where_conditions:
                supabase_query = supabase_query.eq(col_name, val)

            if limit:
                supabase_query = supabase_query.limit(limit)
            if offset:
                supabase_query = supabase_query.range(offset, offset + limit - 1)

            result = supabase_query.execute()
            return result.data if result.data else []

        return []

    except Exception as e:
        logger.error(f"Error executing dictionary query: {str(e)}")
        if "ingredients" in query.lower():
            return [
                {"id": 1, "name": "Salt", "url": "/static/images/ingredients/salt.png", "prompt": "2D flat icon of cooking salt, emoji style"},
                {"id": 2, "name": "Pepper", "url": "/static/images/ingredients/pepper.png", "prompt": "2D flat icon of black pepper, emoji style"},
                {"id": 3, "name": "Garlic", "url": "/static/images/ingredients/garlic.png", "prompt": "2D flat icon of cooking garlic, emoji style"}
            ]
        elif "recipes" in query.lower():
            return list(SAMPLE_RECIPES.values())
        else:
            return []

def execute_query_dict_single_row(query: str, params: Optional[Tuple] = None) -> Optional[Dict]:
    """Executes a database query and returns the first row as a dictionary or None."""
    results = execute_query_dict(query, params)
    return results[0] if results else None

def get_database_status() -> Dict[str, Any]:
    """Checks the status of the database connection."""
    if supabase_available and supabase_client:
        return {
            "status": "connected",
            "type": "supabase",
            "url": SUPABASE_URL[:20] + "..." if SUPABASE_URL else None,
            "error": None
        }
    else:
        return {
            "status": "using_sample_data",
            "type": "memory",
            "error": None
        }