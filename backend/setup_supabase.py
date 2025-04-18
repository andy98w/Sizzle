import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("Error: Supabase credentials not found in .env file")
    exit(1)

supabase = create_client(supabase_url, supabase_key)

print(f"Connecting to Supabase at {supabase_url}...")

sql_file_path = "./supabase_schema.sql"
try:
    with open(sql_file_path, "r") as file:
        sql_commands = file.read()
except FileNotFoundError:
    print(f"Error: SQL file not found at {sql_file_path}")
    exit(1)

try:
    supabase.table("recipes").select("id").limit(1).execute()
    print("Database connection verified.")
    
    print("\nPlease run the SQL script in the Supabase SQL Editor:")
    print("1. Go to https://app.supabase.com/")
    print("2. Select your project")
    print("3. Go to the SQL Editor")
    print("4. Paste the contents of supabase_schema.sql")
    print("5. Click 'Run'")
except Exception as e:
    print(f"Error connecting to database: {e}")
    exit(1)

print("\nFor security reasons, we can't execute arbitrary SQL directly from this script.")
print("Please run the SQL script in your Supabase SQL Editor to set up the database schema.")