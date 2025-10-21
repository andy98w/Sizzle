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
      
      // Find the best match with smart word-based matching
      let bestMatch = null;
      let exactMatch = null;
      let wordMatch = null;
      let containsMatch = null;

      // Split search term into words for better matching
      const searchWords = ingredientNameLower.split(/\s+/).filter(w => w.length > 2);

      for (const ingredient of ingredients) {
        if (!ingredient.name) continue;

        const ingredientLower = ingredient.name.toLowerCase().trim();

        // 1. EXACT match (highest priority)
        if (ingredientLower === ingredientNameLower) {
          exactMatch = ingredient;
          break; // Stop immediately on exact match
        }

        // 2. Word-based match (e.g., "Japanese short-grain rice" matches "Rice")
        // Check if any significant word from the search appears in the ingredient name
        if (!wordMatch && searchWords.length > 0) {
          const ingredientWords = ingredientLower.split(/\s+/);
          const hasWordMatch = searchWords.some(searchWord =>
            ingredientWords.some(ingWord =>
              ingWord === searchWord ||
              ingWord.startsWith(searchWord) ||
              searchWord.startsWith(ingWord)
            )
          );
          if (hasWordMatch) {
            wordMatch = ingredient;
          }
        }

        // 3. Contains search term (bidirectional - either can contain the other)
        if (!containsMatch && (ingredientLower.includes(ingredientNameLower) || ingredientNameLower.includes(ingredientLower))) {
          containsMatch = ingredient;
        }
      }

      // Use the best match in order of priority
      bestMatch = exactMatch || wordMatch || containsMatch;
      
      // Use the best match if found
      if (bestMatch && bestMatch.url) {
        ingredientCache[ingredientName] = bestMatch.url;
        return bestMatch.url;
      }
    }
    
    // Return placeholder if no match found
    const placeholder = "https://objectstorage.ca-toronto-1.oraclecloud.com/p/LHruGKILbQNvy2_V89soZbDGmCXZ-RecXxEAAzoKdZx1y9Tcuz0J-gEmWtIcNZhJ/n/yzep9haqilyk/b/SizzleGeneratedImages/o/placeholder_ingredient.png";
    ingredientCache[ingredientName] = placeholder;
    return placeholder;

  } catch (error) {
    console.error(`Error fetching ingredient image for ${ingredientName}:`, error);

    // Return placeholder on error
    const placeholder = "https://objectstorage.ca-toronto-1.oraclecloud.com/p/LHruGKILbQNvy2_V89soZbDGmCXZ-RecXxEAAzoKdZx1y9Tcuz0J-gEmWtIcNZhJ/n/yzep9haqilyk/b/SizzleGeneratedImages/o/placeholder_ingredient.png";
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

    // Always show an image - either the actual image or placeholder
    const placeholder = "https://objectstorage.ca-toronto-1.oraclecloud.com/p/LHruGKILbQNvy2_V89soZbDGmCXZ-RecXxEAAzoKdZx1y9Tcuz0J-gEmWtIcNZhJ/n/yzep9haqilyk/b/SizzleGeneratedImages/o/placeholder_ingredient.png";
    const fullUrl = imageUrl ?
      (imageUrl.startsWith('http') ? imageUrl : `${API_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`) :
      placeholder;

    return (
      <img
        src={fullUrl}
        alt={ingredient}
        className="w-10 h-10 rounded-full object-cover mr-3"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          // Always fall back to placeholder, never hide
          if (target.src !== placeholder) {
            target.src = placeholder;
          }
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
    // Try to find the equipment using the EQUIPMENT search endpoint
    const response = await axios.get(`${API_URL}/equipment?search=${encodeURIComponent(equipmentName)}&limit=5`);

    // Extract data from the nested structure
    const responseData = response.data;
    const data = responseData.data || responseData;

    if (data && data.equipment && data.equipment.length > 0) {
      const equipment = data.equipment;
      const equipmentNameLower = equipmentName.toLowerCase().trim();

      // Find the best match with smart word-based matching
      let bestMatch = null;
      let exactMatch = null;
      let wordMatch = null;
      let containsMatch = null;

      // Split search term into words for better matching
      const searchWords = equipmentNameLower.split(/\s+/).filter(w => w.length > 2);

      for (const item of equipment) {
        if (!item.name) continue;

        const itemLower = item.name.toLowerCase().trim();

        // 1. EXACT match (highest priority)
        if (itemLower === equipmentNameLower) {
          exactMatch = item;
          break; // Stop immediately on exact match
        }

        // 2. Word-based match (e.g., "Rice cooker" matches "Rice Cooker")
        // Check if any significant word from the search appears in the equipment name
        if (!wordMatch && searchWords.length > 0) {
          const equipmentWords = itemLower.split(/\s+/);
          const hasWordMatch = searchWords.some(searchWord =>
            equipmentWords.some(eqWord =>
              eqWord === searchWord ||
              eqWord.startsWith(searchWord) ||
              searchWord.startsWith(eqWord)
            )
          );
          if (hasWordMatch) {
            wordMatch = item;
          }
        }

        // 3. Contains search term (bidirectional - either can contain the other)
        if (!containsMatch && (itemLower.includes(equipmentNameLower) || equipmentNameLower.includes(itemLower))) {
          containsMatch = item;
        }
      }

      // Use the best match in order of priority
      bestMatch = exactMatch || wordMatch || containsMatch;
      
      // Use the best match if found
      if (bestMatch && bestMatch.url) {
        equipmentCache[equipmentName] = bestMatch.url;
        return bestMatch.url;
      }
    }
    
    // Return placeholder if no match found
    const placeholder = "https://objectstorage.ca-toronto-1.oraclecloud.com/p/LHruGKILbQNvy2_V89soZbDGmCXZ-RecXxEAAzoKdZx1y9Tcuz0J-gEmWtIcNZhJ/n/yzep9haqilyk/b/SizzleGeneratedImages/o/placeholder_equipment.png";
    equipmentCache[equipmentName] = placeholder;
    return placeholder;

  } catch (error) {
    console.error(`Error fetching equipment image for ${equipmentName}:`, error);

    // Return placeholder on error
    const placeholder = "https://objectstorage.ca-toronto-1.oraclecloud.com/p/LHruGKILbQNvy2_V89soZbDGmCXZ-RecXxEAAzoKdZx1y9Tcuz0J-gEmWtIcNZhJ/n/yzep9haqilyk/b/SizzleGeneratedImages/o/placeholder_equipment.png";
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

    // Always show an image - either the actual image or placeholder
    const placeholder = "https://objectstorage.ca-toronto-1.oraclecloud.com/p/LHruGKILbQNvy2_V89soZbDGmCXZ-RecXxEAAzoKdZx1y9Tcuz0J-gEmWtIcNZhJ/n/yzep9haqilyk/b/SizzleGeneratedImages/o/placeholder_equipment.png";
    const fullUrl = imageUrl ?
      (imageUrl.startsWith('http') ? imageUrl : `${API_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`) :
      placeholder;

    return (
      <img
        src={fullUrl}
        alt={equipment}
        className="w-10 h-10 rounded-full object-cover mr-3"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          // Always fall back to placeholder, never hide
          if (target.src !== placeholder) {
            target.src = placeholder;
          }
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