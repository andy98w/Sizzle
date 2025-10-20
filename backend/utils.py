"""Utility functions for the Sizzle backend application."""

import sys
import logging
import traceback
import json
from typing import Dict, Any, Optional
from urllib.parse import urlparse

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger("sizzle")


def format_oci_url(url: str) -> str:
    """Formats an Oracle Cloud Infrastructure URL to ensure it has proper access tokens."""
    if not url or 'objectstorage' not in url:
        return url

    PAR_TOKEN = "VbMtmi4NetAmyHfVagGHtZGpkoLBtAptLSOPk0ssRwJn-22COZd1t8HZMrAV0ZSo"

    try:
        parsed_url = urlparse(url)

        if '/p/' in parsed_url.path and 'auto-par-token' not in url:
            return url

        path = parsed_url.path
        namespace = ""
        bucket = ""
        object_name = ""

        n_index = path.find('/n/')
        if n_index >= 0:
            after_n = path[n_index + 3:]
            next_slash = after_n.find('/')
            namespace = after_n[:next_slash] if next_slash > 0 else after_n

        b_index = path.find('/b/')
        if b_index >= 0:
            after_b = path[b_index + 3:]
            next_slash = after_b.find('/')
            bucket = after_b[:next_slash] if next_slash > 0 else after_b

        o_index = path.find('/o/')
        if o_index >= 0:
            object_name = path[o_index + 3:]

        if namespace and bucket and object_name:
            return f"{parsed_url.scheme}://{parsed_url.netloc}/p/{PAR_TOKEN}/n/{namespace}/b/{bucket}/o/{object_name}"
    except Exception as e:
        logger.error(f"Error formatting OCI URL {url}: {str(e)}")

    return url

def log_exception(e: Exception, context: str = "") -> None:
    """Logs an exception with optional context information."""
    error_msg = f"{context}: {str(e)}" if context else str(e)
    logger.error(error_msg)
    logger.debug(traceback.format_exc())

def parse_json_safely(json_str: str, default: Any = None) -> Any:
    """Safely parses a JSON string with error handling."""
    if not json_str:
        return default

    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse JSON: {json_str[:100]}...")
        return default

def format_api_response(data: Any = None, status: str = "success", message: str = "", status_code: int = 200) -> Dict[str, Any]:
    """Creates a standardized API response format."""
    response = {"status": status, "status_code": status_code}
    if data is not None:
        response["data"] = data
    if message:
        response["message"] = message
    return response

def format_error_response(message: str, status_code: int = 400, details: Any = None) -> Dict[str, Any]:
    """Creates a standardized error response."""
    response = {"status": "error", "status_code": status_code, "message": message}
    if details is not None:
        response["details"] = details
    return response