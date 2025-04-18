# Supabase Integration Guide for Sizzle

This guide explains how to set up and use the Supabase integration with the Sizzle recipe assistant.

## Prerequisites

- A Supabase account (free tier is sufficient)
- A Supabase project URL and API key

## Setup Instructions

1. **Create a Supabase Project**:
   - Go to [Supabase](https://app.supabase.com/) and create a new project
   - Once created, find your project URL and API key in the project settings

2. **Set Environment Variables**:
   - Create a `.env` file in the `/backend` directory with the following content:
     ```
     SUPABASE_URL="your-project-url"
     SUPABASE_KEY="your-api-key"
     ```

3. **Initialize Database Schema**:
   - Go to your Supabase project dashboard
   - Click on "SQL Editor"
   - Create a new query
   - Copy the contents of `supabase_schema.sql` from this repository
   - Run the query to set up all necessary tables and indexes

4. **Testing the Connection**:
   - Run `python test_supabase.py` to verify the connection works

## Database Schema

The Supabase database has two main tables:

1. **recipes**: Stores all recipe information
   - Basic info (title, description, prep time, cook time, servings)
   - Ingredients as JSONB
   - Equipment as JSONB
   - Steps as JSONB
   - Original text

2. **generated_images**: Stores metadata about AI-generated images
   - Type (ingredient, equipment, action, step)
   - Name identifier
   - Generated prompt
   - Storage path and URL

## Running the Application

To start the application with database support:

```bash
./run_sizzle.sh
```

This script will:
- Check the Supabase connection
- Remind you to set up the database schema if needed
- Start the FastAPI server

## API Endpoints

The following endpoints interact with the database:

- **GET /recipes**: List recently added recipes
- **GET /recipes/{recipe_id}**: Get a specific recipe by ID
- **POST /recipes**: Save a new recipe to the database
- **POST /recipe/parse**: Parse and save a recipe from text

## Troubleshooting

If you encounter issues:

1. **Connection Problems**:
   - Verify your Supabase URL and API key are correct
   - Check if your IP is allowed in Supabase settings

2. **Missing Tables**:
   - Ensure you've run the SQL schema script in the Supabase SQL Editor

3. **Package Issues**:
   - Run `./rebuild_venv.sh` to recreate the Python environment with all dependencies