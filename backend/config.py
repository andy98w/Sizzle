"""
Configuration module for the Sizzle backend.

This module loads configuration values from environment variables.
"""

import os
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# API Configuration
API_HOST = os.environ.get('API_HOST', '0.0.0.0')
API_PORT = int(os.environ.get('API_PORT', '8000'))
API_DEBUG = os.environ.get('API_DEBUG', 'true').lower() in ('true', 't', '1', 'yes', 'y')
API_CORS_ORIGINS = os.environ.get('API_CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',')

# Supabase Configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')

# OpenAI Configuration
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4o')
OPENAI_TIMEOUT = int(os.environ.get('OPENAI_TIMEOUT', '120'))

# Replicate Configuration (for Stable Diffusion)
REPLICATE_API_TOKEN = os.environ.get('REPLICATE_API_TOKEN', '')
# Use SDXL for best quality and style consistency
STABLE_DIFFUSION_MODEL = os.environ.get('STABLE_DIFFUSION_MODEL', 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b')

# OCI Storage Configuration
OCI_BUCKET_NAME = os.environ.get('OCI_BUCKET_NAME', 'sizzle-media')
OCI_NAMESPACE = os.environ.get('OCI_NAMESPACE', '')
OCI_REGION = os.environ.get('OCI_REGION', '')
OCI_PAR_URL = os.environ.get('OCI_PAR_URL', '')

# Application Paths
STATIC_DIR = os.environ.get('STATIC_DIR', os.path.join(os.path.dirname(__file__), 'static'))
TEMP_DIR = os.environ.get('TEMP_DIR', os.path.join(os.path.dirname(__file__), 'temp'))

# Image Generation Configuration
IMAGE_GENERATION_BACKEND = os.environ.get('IMAGE_GENERATION_BACKEND', 'stable_diffusion')
DALLE_MODEL = os.environ.get('DALLE_MODEL', 'dall-e-3')
DALLE_SIZE = os.environ.get('DALLE_SIZE', '1792x1024')
DALLE_QUALITY = os.environ.get('DALLE_QUALITY', 'standard')

# Stable Diffusion Configuration
SD_WIDTH = int(os.environ.get('SD_WIDTH', '1792'))
SD_HEIGHT = int(os.environ.get('SD_HEIGHT', '1024'))
SD_SEED = int(os.environ.get('SD_SEED', '42'))

# Image Size Configuration
STANDARD_IMAGE_SIZE = tuple(map(int, os.environ.get('STANDARD_IMAGE_SIZE', '512,512').split(',')))
STEP_IMAGE_SIZE = tuple(map(int, os.environ.get('STEP_IMAGE_SIZE', '716,512').split(',')))

# Timeout Configuration
HTTP_REQUEST_TIMEOUT = int(os.environ.get('HTTP_REQUEST_TIMEOUT', '30'))
IMAGE_GENERATION_TIMEOUT = int(os.environ.get('IMAGE_GENERATION_TIMEOUT', '300'))

# API Query Configuration
DEFAULT_SEARCH_LIMIT = int(os.environ.get('DEFAULT_SEARCH_LIMIT', '5'))

# Recipe Validation Configuration
VALIDATE_FOOD_REQUESTS = os.environ.get('VALIDATE_FOOD_REQUESTS', 'true').lower() in ('true', 't', '1', 'yes', 'y')

# Other Constants
MAX_RETRIES = int(os.environ.get('MAX_RETRIES', '3'))
DEFAULT_QUERY_TIMEOUT = int(os.environ.get('DEFAULT_QUERY_TIMEOUT', '30'))