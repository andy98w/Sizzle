'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import RecipeStepCarousel from '@/components/RecipeStepCarousel';
import { IngredientVisual, EquipmentVisual } from '@/components/AnimationLibrary';
import RecipeTitle from '@/components/RecipeTitle';

// Sample recipe data for demonstration
const sampleRecipe = {
  id: 1,
  title: 'Sushi Rice',
  description: 'Perfect sushi rice for making your favorite sushi rolls.',
  prepTime: '10 mins',
  cookTime: '20 mins',
  servings: 4,
  ingredients: [
    { name: 'Japanese short-grain rice', quantity: '2 cups' },
    { name: 'Water', quantity: '2 cups' },
    { name: 'Rice vinegar', quantity: '1/4 cup' },
    { name: 'Sugar', quantity: '2 tablespoons' },
    { name: 'Salt', quantity: '1 teaspoon' }
  ],
  equipment: [
    { name: 'Rice cooker' },
    { name: 'Wooden spoon' },
    { name: 'Large bowl' },
    { name: 'Fan (optional)' }
  ],
  steps: [
    {
      id: 1,
      instruction: 'Rinse the rice in cold water until the water runs clear, about 2-3 times.',
      action: 'stir',
      ingredients: [
        { name: 'Japanese short-grain rice', quantity: '2 cups' },
        { name: 'Water' }
      ],
      equipment: [
        { name: 'Large bowl' }
      ]
    },
    {
      id: 2,
      instruction: 'Add the rinsed rice and 2 cups of water to the rice cooker and cook according to the manufacturer\'s instructions.',
      action: 'cook_rice',
      ingredients: [
        { name: 'Japanese short-grain rice' },
        { name: 'Water', quantity: '2 cups' }
      ],
      equipment: [
        { name: 'Rice cooker' }
      ]
    },
    {
      id: 3,
      instruction: 'In a small bowl, mix the rice vinegar, sugar, and salt until the sugar and salt are dissolved.',
      action: 'stir',
      ingredients: [
        { name: 'Rice vinegar', quantity: '1/4 cup' },
        { name: 'Sugar', quantity: '2 tablespoons' },
        { name: 'Salt', quantity: '1 teaspoon' }
      ],
      equipment: [
        { name: 'Small bowl' },
        { name: 'Whisk' }
      ]
    },
    {
      id: 4,
      instruction: 'Once the rice is cooked, transfer it to a large wooden bowl and pour the vinegar mixture over it.',
      action: 'stir',
      ingredients: [
        { name: 'Cooked rice' },
        { name: 'Vinegar mixture' }
      ],
      equipment: [
        { name: 'Large wooden bowl' },
        { name: 'Wooden spoon' }
      ]
    },
    {
      id: 5,
      instruction: 'Gently fold the rice with a wooden spoon to mix the vinegar mixture evenly. Be careful not to mash the rice.',
      action: 'stir',
      ingredients: [
        { name: 'Seasoned rice' }
      ],
      equipment: [
        { name: 'Wooden spoon' }
      ]
    },
    {
      id: 6,
      instruction: 'Fan the rice as you mix it to cool it down quickly and give it a nice shine.',
      action: 'stir',
      ingredients: [
        { name: 'Seasoned rice' }
      ],
      equipment: [
        { name: 'Fan (optional)' },
        { name: 'Wooden spoon' }
      ]
    }
  ]
};

export default function RecipePage() {
  const [recipe, setRecipe] = useState(sampleRecipe);
  
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Recipe Header */}
        <RecipeTitle
          title={recipe.title}
          description={recipe.description}
          prepTime={recipe.prepTime}
          cookTime={recipe.cookTime}
          servings={recipe.servings}
        />
        
        {/* Recipe Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <RecipeStepCarousel recipe={recipe} />
        </motion.div>
      </div>
    </div>
  );
}