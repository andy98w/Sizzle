/**
 * Shared utilities for the Sizzle application
 */
import { API_URL } from '@/config';

// Re-export constants for easier importing
export * from './constants';

/**
 * Handles API image URLs correctly
 * @param path The image path or URL
 * @returns Fully qualified URL
 */
export const getImageUrl = (path?: string): string => {
  if (!path) return '';
  
  // If already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // If it's a path from the API, prepend the API URL
  if (path.startsWith('/')) {
    return `${API_URL}${path}`;
  }
  
  // Otherwise, assume it's a relative path
  return `${API_URL}/${path}`;
};

/**
 * Error handler for fetch requests
 * @param error Error object
 * @param fallback Fallback error message
 * @returns Consistent error message
 */
export const handleFetchError = (error: any, fallback = 'An error occurred'): string => {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  console.error('Unhandled error:', error);
  return fallback;
};

/**
 * Handles image loading errors
 * @param event Error event
 */
export const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
  const target = event.target as HTMLImageElement;
  
  // Try to extract path from the URL
  try {
    const url = new URL(target.src);
    
    if (url.pathname.includes('/oci/')) {
      // For OCI URLs, attempt to fix the URL format
      const path = url.pathname;
      let namespace = '';
      let bucket = '';
      
      // Extract namespace
      const nIndex = path.indexOf('/n/');
      if (nIndex >= 0) {
        const afterN = path.substring(nIndex + 3);
        const nextSlash = afterN.indexOf('/');
        namespace = nextSlash > 0 ? afterN.substring(0, nextSlash) : afterN;
      }
      
      // Extract bucket
      const bIndex = path.indexOf('/b/');
      if (bIndex >= 0) {
        const afterB = path.substring(bIndex + 3);
        const nextSlash = afterB.indexOf('/');
        bucket = nextSlash > 0 ? afterB.substring(0, nextSlash) : afterB;
      }
      
      // Extract object name
      const parts = path.split('/');
      const objectName = parts[parts.length - 1];
      
      // Construct a proper Oracle URL
      const fixedUrl = `${url.protocol}//${url.host}/p/fixed-par-token/n/${namespace}/b/${bucket}/o/${objectName}`;
      
      // Try to load with fixed URL
      target.src = fixedUrl;
      return;
    }
  } catch (err) {
    // Fall back to placeholder
    target.src = '/images/placeholder.png';
    target.style.opacity = '0.5';
  }
};

/**
 * Calculates a position based on viewport percentage, maintaining consistency
 * across different screen sizes and zoom levels
 * 
 * @param percentage The percentage of viewport height
 * @returns The calculated pixel position
 */
export function getPositionFromViewportPercentage(percentage: number): number {
  if (typeof window === 'undefined') return 0;
  return window.innerHeight * (percentage / 100);
}