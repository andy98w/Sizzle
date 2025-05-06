/**
 * Shared type definitions for the Sizzle application
 */

// Basic data types
export interface Ingredient {
  name: string;
  quantity?: string;
  image?: string;
  imageUrl?: string; // For API responses
  url?: string; // For API responses
  prompt?: string; // For generated images
}

export interface Equipment {
  name: string;
  image?: string;
  imageUrl?: string; // For API responses
  url?: string; // For API responses
}

export type CookingAction = 
  | 'stir' | 'chop' | 'mix' | 'bake' | 'boil' | 'fry' | 'grill' | 'roast' 
  | 'simmer' | 'add' | 'pour' | 'peel' | 'mince' | 'slice' | 'dice' | 'fold' 
  | 'whisk' | 'drain' | 'coat' | 'sprinkle' | 'measure' | 'combine' | 'roll'
  | 'heat' | 'serve' | 'sauté' | 'steam' | string;

export interface RecipeStep {
  id: number;
  instruction: string;
  action: CookingAction;
  ingredients: Ingredient[];
  equipment: Equipment[];
  action_image?: string;  // URL for the AI-generated action image
  step_image?: string;    // URL for the AI-generated step image
}

export interface Recipe {
  id?: number;
  title: string;
  description: string;
  
  // Allow both naming conventions for better API compatibility
  prepTime?: string;
  prep_time?: string;
  
  cookTime?: string;
  cook_time?: string;
  
  servings: number;
  ingredients: Ingredient[];
  equipment: Equipment[];
  steps: RecipeStep[];
  
  // Additional API response fields
  created_at?: string;
  updated_at?: string;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
  offset?: number;
}