import React from 'react';
import { motion } from 'framer-motion';

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
  // Map common ingredients to emoji icons
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
  
  return (
    <motion.div 
      className="flex items-center bg-white p-3 rounded-lg shadow-sm mb-2"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {image ? (
        <img 
          src={`http://localhost:8000${image}`} 
          alt={ingredient}
          className="w-10 h-10 rounded-full object-cover mr-3"
          onError={(e) => {
            // If image fails to load, replace with emoji
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              const fallback = document.createElement('div');
              fallback.className = 'w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3';
              fallback.innerHTML = `<span class="text-xl">${getIngredientEmoji(ingredient)}</span>`;
              parent.insertBefore(fallback, parent.firstChild);
            }
          }}
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
          <span className="text-xl">{getIngredientEmoji(ingredient)}</span>
        </div>
      )}
      <div>
        <p className="font-medium">{ingredient}</p>
        {quantity && <p className="text-sm text-gray-600">{quantity}</p>}
      </div>
    </motion.div>
  );
};

// Equipment visualization component
export const EquipmentVisual: React.FC<{
  equipment: string;
  image?: string;
}> = ({ equipment, image }) => {
  // Map common equipment to emoji icons
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
  
  return (
    <motion.div 
      className="flex items-center bg-white p-3 rounded-lg shadow-sm mb-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {image ? (
        <img 
          src={`http://localhost:8000${image}`} 
          alt={equipment}
          className="w-10 h-10 rounded-full object-cover mr-3"
          onError={(e) => {
            // If image fails to load, replace with emoji
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              const fallback = document.createElement('div');
              fallback.className = 'w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3';
              fallback.innerHTML = `<span class="text-xl">${getEquipmentEmoji(equipment)}</span>`;
              parent.insertBefore(fallback, parent.firstChild);
            }
          }}
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
          <span className="text-xl">{getEquipmentEmoji(equipment)}</span>
        </div>
      )}
      <p className="font-medium">{equipment}</p>
    </motion.div>
  );
};