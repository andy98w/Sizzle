import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '@/config';
import { Ingredient, Equipment, CookingAction } from '@/types';
import { getImageUrl, handleImageError } from '@/utils';
import { ImageWithFallback } from './shared';

// Cache for ingredient image URLs
const ingredientCache: Record<string, string | null> = {};

// Function to get an ingredient image URL
export const getIngredientImageUrl = async (ingredientName: string): Promise<string | null> => {
  // Check cache first to avoid redundant API calls
  if (ingredientName in ingredientCache) {
    return ingredientCache[ingredientName];
  }
  
  try {
    // Try to find the ingredient using the search endpoint
    const response = await axios.get(`${API_URL}/ingredients?search=${encodeURIComponent(ingredientName)}&limit=5`);
    
    // Extract data from the nested structure
    const responseData = response.data;
    const data = responseData.data || responseData;
    
    if (data && data.ingredients && data.ingredients.length > 0) {
      const ingredients = data.ingredients;
      const ingredientNameLower = ingredientName.toLowerCase();
      
      // First try to find exact matches
      let bestMatch = null;
      
      // Try to find a match:
      // 1. Exact match
      // 2. Ingredient name contains the search term
      // 3. Search term contains the ingredient name
      for (const ingredient of ingredients) {
        if (!ingredient.name) continue;
        
        const ingredientLower = ingredient.name.toLowerCase();
        
        // Exact match is the best
        if (ingredientLower === ingredientNameLower) {
          bestMatch = ingredient;
          break;
        }
        
        // Ingredient contains the search term
        if (ingredientLower.includes(ingredientNameLower)) {
          bestMatch = ingredient;
          break;
        }
        
        // Search term contains the ingredient
        if (ingredientNameLower.includes(ingredientLower)) {
          bestMatch = ingredient;
          // Don't break here - might find a better match
        }
      }
      
      // Use the best match if found
      if (bestMatch && bestMatch.url) {
        ingredientCache[ingredientName] = bestMatch.url;
        return bestMatch.url;
      }
    }
    
    // Return placeholder if no match found
    const placeholder = "https://objectstorage.ca-toronto-1.oraclecloud.com/p/u4hPf1DL-E9utS-Mh6HXZFsLBXFSzqUlgsrBJsWpjxxkz1Udy_-g3wveTokFV5G6/n/yzep9haqilyk/b/SizzleGeneratedImages/o/ingredients/placeholder.png";
    ingredientCache[ingredientName] = placeholder;
    return placeholder;
    
  } catch (error) {
    console.error(`Error fetching ingredient image for ${ingredientName}:`, error);
    
    // Return placeholder on error
    const placeholder = "https://objectstorage.ca-toronto-1.oraclecloud.com/p/u4hPf1DL-E9utS-Mh6HXZFsLBXFSzqUlgsrBJsWpjxxkz1Udy_-g3wveTokFV5G6/n/yzep9haqilyk/b/SizzleGeneratedImages/o/ingredients/placeholder.png";
    ingredientCache[ingredientName] = placeholder;
    return placeholder;
  }
};

// Types for animations
export type CookingAction = 'chop' | 'stir' | 'boil' | 'bake' | 'mix' | 'fry' | 'grill' | 'cook_rice';
export type Ingredient = string;
export type Equipment = string;

interface AnimationProps {
  action: CookingAction;
  ingredients?: Ingredient[];
  equipment?: Equipment[];
  size?: 'small' | 'medium' | 'large';
  loop?: boolean;
  duration?: number;
}

// Generic placeholder animation components
// These will later be replaced with actual animations

export const ChopAnimation: React.FC<{ingredient: string}> = ({ ingredient }) => {
  return (
    <motion.div 
      className="bg-gray-100 rounded-lg p-4 flex items-center justify-center"
      style={{ height: '200px' }}
      initial={{ scale: 0.9 }}
      animate={{ 
        scale: [0.9, 1, 0.9],
        rotate: [0, 1, 0]
      }}
      transition={{ 
        repeat: Infinity,
        duration: 2
      }}
    >
      <div className="text-center">
        <div className="mb-4 mx-auto w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
          🔪
        </div>
        <p>Chopping {ingredient}</p>
      </div>
    </motion.div>
  );
};

export const StirAnimation: React.FC<{ingredients: string[]}> = ({ ingredients }) => {
  return (
    <motion.div 
      className="bg-gray-100 rounded-lg p-4 flex items-center justify-center"
      style={{ height: '200px' }}
      initial={{ rotate: 0 }}
      animate={{ 
        rotate: 360
      }}
      transition={{ 
        repeat: Infinity,
        duration: 3,
        ease: "linear"
      }}
    >
      <div className="text-center">
        <div className="mb-4 mx-auto w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
          🥄
        </div>
        <p>Stirring {ingredients.join(', ')}</p>
      </div>
    </motion.div>
  );
};

export const BoilAnimation: React.FC<{ingredients: string[]}> = ({ ingredients }) => {
  return (
    <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center" style={{ height: '200px' }}>
      <div className="text-center">
        <div className="relative mb-4 mx-auto w-20 h-20 bg-blue-200 rounded-full flex items-center justify-center overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div 
              key={i}
              className="absolute w-3 h-3 bg-white rounded-full"
              initial={{ y: 20 }}
              animate={{ y: -20 }}
              transition={{ 
                repeat: Infinity,
                duration: 2,
                delay: i * 0.3,
                repeatType: "reverse"
              }}
              style={{
                left: `${30 + (i * 10)}%`
              }}
            />
          ))}
        </div>
        <p>Boiling {ingredients.join(', ')}</p>
      </div>
    </div>
  );
};

export const CookRiceAnimation: React.FC = () => {
  return (
    <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center" style={{ height: '200px' }}>
      <div className="text-center">
        <div className="relative mb-4 mx-auto w-24 h-24 bg-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
          <motion.div
            className="absolute w-20 h-20 bg-gray-100 rounded-lg"
            initial={{ y: 10 }}
            animate={{ y: [10, 5, 10] }}
            transition={{ 
              repeat: Infinity,
              duration: 3,
            }}
          />
          <motion.div
            className="absolute top-2 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-red-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ 
              repeat: Infinity,
              duration: 2,
            }}
          />
        </div>
        <p>Cooking rice in rice cooker</p>
      </div>
    </div>
  );
};

// Main component to use
export const RecipeAnimation: React.FC<AnimationProps> = ({ 
  action, 
  ingredients = [], 
  equipment = [], 
  size = 'medium',
  loop = true,
}) => {
  // Determine the animation component based on the action
  const renderAnimation = () => {
    switch (action) {
      case 'chop':
        return <ChopAnimation ingredient={ingredients[0] || 'ingredients'} />;
      case 'stir':
        return <StirAnimation ingredients={ingredients} />;
      case 'boil':
        return <BoilAnimation ingredients={ingredients} />;
      case 'cook_rice':
        return <CookRiceAnimation />;
      default:
        return (
          <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center" style={{ height: '200px' }}>
            <p>Animation for {action} coming soon</p>
          </div>
        );
    }
  };

  // Apply size classes
  const sizeClasses = {
    small: 'max-w-xs',
    medium: 'max-w-sm',
    large: 'max-w-md',
  };

  return (
    <div className={`w-full ${sizeClasses[size]} mx-auto my-4`}>
      {renderAnimation()}
    </div>
  );
};

// Ingredient visualization component
export const IngredientVisual: React.FC<{
  ingredient: string; 
  quantity?: string;
  image?: string;
}> = ({ ingredient, quantity, image }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(image || null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Fetch ingredient image on mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchImage = async () => {
      // Skip if we already have an image
      if (image) {
        setImageUrl(image);
        setIsLoading(false);
        return;
      }
      
      try {
        const url = await getIngredientImageUrl(ingredient);
        if (isMounted) {
          setImageUrl(url);
        }
      } catch (error) {
        console.error(`Error fetching image for ${ingredient}:`, error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchImage();
    
    return () => {
      isMounted = false;
    };
  }, [ingredient, image]);
  
  // Map common ingredients to emoji icons (as fallback)
  const getIngredientEmoji = (ing: string): string => {
    const mapping: Record<string, string> = {
      'rice': '🍚',
      'water': '💧',
      'salt': '🧂',
      'sugar': '🍬',
      'olive oil': '🫒',
      'garlic': '🧄',
      'onion': '🧅',
      'tomato': '🍅',
      'egg': '🥚',
      'chicken': '🍗',
      'beef': '🥩',
      'fish': '🐟',
      'carrot': '🥕',
      'lemon': '🍋',
      'pasta': '🍝',
      'bread': '🍞',
      'cheese': '🧀',
      'milk': '🥛',
      'butter': '🧈',
      'pepper': '🌶️',
      'potato': '🥔',
      'avocado': '🥑',
      'corn': '🌽',
      'sushi': '🍣',
      'nori': '🍙',
    };
    
    // Try to find a direct match
    if (mapping[ing.toLowerCase()]) {
      return mapping[ing.toLowerCase()];
    }
    
    // Try to find a partial match
    for (const [key, emoji] of Object.entries(mapping)) {
      if (ing.toLowerCase().includes(key)) {
        return emoji;
      }
    }
    
    // Default emoji if no match
    return '🍴';
  };
  
  // Render image or fallback
  const renderImage = () => {
    if (isLoading) {
      return (
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3 animate-pulse">
        </div>
      );
    }
    
    if (imageUrl) {
      // Full URL handling - OCI URL or local URL
      const fullUrl = imageUrl.startsWith('http') ? 
                      imageUrl : 
                      `${API_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      
      return (
        <img 
          src={fullUrl}
          alt={ingredient}
          className="w-10 h-10 rounded-full object-cover mr-3"
          onError={(e) => {
            // If image fails to load, use placeholder
            const target = e.target as HTMLImageElement;
            // Try to use a placeholder from the OCI bucket
            const placeholder = "https://objectstorage.ca-toronto-1.oraclecloud.com/p/u4hPf1DL-E9utS-Mh6HXZFsLBXFSzqUlgsrBJsWpjxxkz1Udy_-g3wveTokFV5G6/n/yzep9haqilyk/b/SizzleGeneratedImages/o/ingredients/placeholder.png";
            target.src = placeholder;
            target.onerror = () => {
              // If placeholder also fails, hide the image
              target.style.display = 'none';
            };
          }}
        />
      );
    }
    
    // Fallback to placeholder image
    return (
      <img
        src="https://objectstorage.ca-toronto-1.oraclecloud.com/p/u4hPf1DL-E9utS-Mh6HXZFsLBXFSzqUlgsrBJsWpjxxkz1Udy_-g3wveTokFV5G6/n/yzep9haqilyk/b/SizzleGeneratedImages/o/ingredients/placeholder.png"
        alt={ingredient}
        className="w-10 h-10 rounded-full object-cover mr-3"
        onError={(e) => {
          // Hide if placeholder also fails
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
    );
  };
  
  return (
    <motion.div 
      className="flex items-center bg-white p-3 rounded-lg shadow-sm mb-2"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {renderImage()}
      <div>
        <p className="font-medium">{ingredient}</p>
        {quantity && <p className="text-sm text-gray-600">{quantity}</p>}
      </div>
    </motion.div>
  );
};

// Cache for equipment image URLs
const equipmentCache: Record<string, string | null> = {};

// Function to get an equipment image URL
export const getEquipmentImageUrl = async (equipmentName: string): Promise<string | null> => {
  // Check cache first to avoid redundant API calls
  if (equipmentName in equipmentCache) {
    return equipmentCache[equipmentName];
  }
  
  try {
    // Try to find the equipment using the search endpoint
    const response = await axios.get(`${API_URL}/ingredients?search=${encodeURIComponent(equipmentName)}&limit=5`);
    
    // Extract data from the nested structure
    const responseData = response.data;
    const data = responseData.data || responseData;
    
    if (data && data.ingredients && data.ingredients.length > 0) {
      const equipment = data.ingredients;
      const equipmentNameLower = equipmentName.toLowerCase();
      
      // First try to find exact matches
      let bestMatch = null;
      
      // Try to find a match:
      // 1. Exact match
      // 2. Equipment name contains the search term
      // 3. Search term contains the equipment name
      for (const item of equipment) {
        if (!item.name) continue;
        
        const itemLower = item.name.toLowerCase();
        
        // Exact match is the best
        if (itemLower === equipmentNameLower) {
          bestMatch = item;
          break;
        }
        
        // Equipment contains the search term
        if (itemLower.includes(equipmentNameLower)) {
          bestMatch = item;
          break;
        }
        
        // Search term contains the equipment
        if (equipmentNameLower.includes(itemLower)) {
          bestMatch = item;
          // Don't break here - might find a better match
        }
      }
      
      // Use the best match if found
      if (bestMatch && bestMatch.url) {
        equipmentCache[equipmentName] = bestMatch.url;
        return bestMatch.url;
      }
    }
    
    // Return placeholder if no match found
    const placeholder = "https://objectstorage.ca-toronto-1.oraclecloud.com/p/u4hPf1DL-E9utS-Mh6HXZFsLBXFSzqUlgsrBJsWpjxxkz1Udy_-g3wveTokFV5G6/n/yzep9haqilyk/b/SizzleGeneratedImages/o/equipment/placeholder.png";
    equipmentCache[equipmentName] = placeholder;
    return placeholder;
    
  } catch (error) {
    console.error(`Error fetching equipment image for ${equipmentName}:`, error);
    
    // Return placeholder on error
    const placeholder = "https://objectstorage.ca-toronto-1.oraclecloud.com/p/u4hPf1DL-E9utS-Mh6HXZFsLBXFSzqUlgsrBJsWpjxxkz1Udy_-g3wveTokFV5G6/n/yzep9haqilyk/b/SizzleGeneratedImages/o/equipment/placeholder.png";
    equipmentCache[equipmentName] = placeholder;
    return placeholder;
  }
};

// Equipment visualization component
export const EquipmentVisual: React.FC<{
  equipment: string;
  image?: string;
}> = ({ equipment, image }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(image || null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Fetch equipment image on mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchImage = async () => {
      // Skip if we already have an image
      if (image) {
        setImageUrl(image);
        setIsLoading(false);
        return;
      }
      
      try {
        const url = await getEquipmentImageUrl(equipment);
        if (isMounted) {
          setImageUrl(url);
        }
      } catch (error) {
        console.error(`Error fetching image for ${equipment}:`, error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchImage();
    
    return () => {
      isMounted = false;
    };
  }, [equipment, image]);
  
  // Map common equipment to emoji icons (as fallback)
  const getEquipmentEmoji = (eq: string): string => {
    const mapping: Record<string, string> = {
      'knife': '🔪',
      'cutting board': '🪓',
      'pan': '🍳',
      'pot': '🥘',
      'bowl': '🥣',
      'oven': '🔥',
      'blender': '🧂',
      'rice cooker': '♨️',
      'spoon': '🥄',
      'fork': '🍴',
      'whisk': '🧹',
      'grill': '♨️',
      'microwave': '📱',
    };
    
    // Try to find a direct match
    if (mapping[eq.toLowerCase()]) {
      return mapping[eq.toLowerCase()];
    }
    
    // Try to find a partial match
    for (const [key, emoji] of Object.entries(mapping)) {
      if (eq.toLowerCase().includes(key)) {
        return emoji;
      }
    }
    
    // Default emoji if no match
    return '🍳';
  };
  
  // Render image or fallback
  const renderImage = () => {
    if (isLoading) {
      return (
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3 animate-pulse">
        </div>
      );
    }
    
    if (imageUrl) {
      // Full URL handling - OCI URL or local URL
      const fullUrl = imageUrl.startsWith('http') ? 
                      imageUrl : 
                      `${API_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      
      return (
        <img 
          src={fullUrl}
          alt={equipment}
          className="w-10 h-10 rounded-full object-cover mr-3"
          onError={(e) => {
            // If image fails to load, use placeholder
            const target = e.target as HTMLImageElement;
            // Try to use a placeholder from the OCI bucket
            const placeholder = "https://objectstorage.ca-toronto-1.oraclecloud.com/p/u4hPf1DL-E9utS-Mh6HXZFsLBXFSzqUlgsrBJsWpjxxkz1Udy_-g3wveTokFV5G6/n/yzep9haqilyk/b/SizzleGeneratedImages/o/equipment/placeholder.png";
            target.src = placeholder;
            target.onerror = () => {
              // If placeholder also fails, hide the image
              target.style.display = 'none';
            };
          }}
        />
      );
    }
    
    // Fallback to placeholder image
    return (
      <img
        src="https://objectstorage.ca-toronto-1.oraclecloud.com/p/u4hPf1DL-E9utS-Mh6HXZFsLBXFSzqUlgsrBJsWpjxxkz1Udy_-g3wveTokFV5G6/n/yzep9haqilyk/b/SizzleGeneratedImages/o/equipment/placeholder.png"
        alt={equipment}
        className="w-10 h-10 rounded-full object-cover mr-3"
        onError={(e) => {
          // Hide if placeholder also fails
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
    );
  };
  
  return (
    <motion.div 
      className="flex items-center bg-white p-3 rounded-lg shadow-sm mb-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {renderImage()}
      <p className="font-medium">{equipment}</p>
    </motion.div>
  );
};