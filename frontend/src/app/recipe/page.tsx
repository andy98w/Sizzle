'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SlideshowRecipe from '@/components/SlideshowRecipe';
import RecipeTitle from '@/components/RecipeTitle';
import { FaPlay, FaClock, FaUser } from 'react-icons/fa';
import Link from 'next/link';

// Sample recipe data - AI generated sushi rice recipe
const sampleRecipe = {
  id: 1,
  title: 'Sushi Rice',
  description: 'Perfectly seasoned and sticky rice for making sushi or serving alongside Japanese dishes.',
  prepTime: '10 mins',
  cookTime: '20 mins',
  servings: 4,
  ingredients: [
    { name: 'Rice', quantity: '2 cups' },
    { name: 'Water', quantity: '2 cups' },
    { name: 'Rice vinegar', quantity: '1/4 cup' },
    { name: 'Sugar', quantity: '2 tbsp' },
    { name: 'Salt', quantity: '1 tsp' }
  ],
  equipment: [
    { name: 'Pot' },
    { name: 'Bowl' },
    { name: 'Saucepan' },
    { name: 'Spoon' }
  ],
  steps: [
    {
      id: 1,
      instruction: 'Rinse the rice under cold water until the water runs clear.',
      ingredients: [
        { name: 'Rice', quantity: '2 cups' }
      ],
      equipment: [
        { name: 'Large bowl' }
      ]
    },
    {
      id: 2,
      instruction: 'Combine the rinsed rice and water in a pot and bring to a boil over medium heat.',
      ingredients: [
        { name: 'Rice', quantity: '2 cups' },
        { name: 'Water', quantity: '2 cups' }
      ],
      equipment: [
        { name: 'Pot' }
      ]
    },
    {
      id: 3,
      instruction: 'Once boiling, reduce the heat to low, cover the pot, and simmer for 15 mins until the water is absorbed.',
      ingredients: [],
      equipment: [
        { name: 'Pot' }
      ]
    },
    {
      id: 4,
      instruction: 'Remove the pot from heat and let the rice rest, covered, for 10 mins.',
      ingredients: [],
      equipment: [
        { name: 'Pot' }
      ]
    },
    {
      id: 5,
      instruction: 'While the rice rests, heat rice vinegar, sugar, and salt in a small saucepan over low heat until the sugar is dissolved.',
      ingredients: [
        { name: 'Rice vinegar', quantity: '1/4 cup' },
        { name: 'Sugar', quantity: '2 tbsp' },
        { name: 'Salt', quantity: '1 tsp' }
      ],
      equipment: [
        { name: 'Small saucepan' }
      ]
    },
    {
      id: 6,
      instruction: 'Transfer the cooked rice to a large bowl and gently fold in the vinegar mixture with a wooden spoon.',
      ingredients: [
        { name: 'Rice' }
      ],
      equipment: [
        { name: 'Large bowl' },
        { name: 'Wooden spoon' }
      ]
    },
    {
      id: 7,
      instruction: 'Allow the seasoned rice to cool to room temperature before using in sushi.',
      ingredients: [],
      equipment: []
    }
  ]
};

export default function RecipePage() {
  const [recipe, setRecipe] = useState(sampleRecipe);
  const [showSlideshow, setShowSlideshow] = useState(true); // Start with slideshow open

  // Proper handler to close the slideshow
  const handleClose = () => {
    setShowSlideshow(false);
  };

  // Start the slideshow
  const startSlideshow = () => {
    setShowSlideshow(true);
  };

  // Prevent body scrolling when slideshow is active
  React.useEffect(() => {
    if (showSlideshow) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showSlideshow]);

  return (
    <div className="fixed inset-0 top-[73px] overflow-hidden flex flex-col">
      {/* Slideshow Display */}
      {showSlideshow && (
        <SlideshowRecipe
          recipe={recipe}
          onClose={handleClose}
        />
      )}

      {/* Recipe Overview Page - only shown when slideshow is not active */}
      <div className={`container mx-auto px-4 max-w-5xl flex-1 overflow-y-auto pt-6 ${showSlideshow ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <motion.div 
          className="bg-white rounded-2xl shadow-md overflow-hidden mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
              {recipe.title}
            </h1>
            
            <p className="text-gray-600 mb-8">{recipe.description}</p>
            
            <div className="flex flex-wrap gap-8 mb-8">
              {recipe.prepTime && (
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-3">
                    <FaClock className="text-primary-600 text-2xl" />
                  </div>
                  <p className="text-sm text-gray-500">Prep Time</p>
                  <p className="font-semibold text-lg text-gray-700">{recipe.prepTime}</p>
                </div>
              )}
              
              {recipe.cookTime && (
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-3">
                    <FaClock className="text-primary-600 text-2xl" />
                  </div>
                  <p className="text-sm text-gray-500">Cook Time</p>
                  <p className="font-semibold text-lg text-gray-700">{recipe.cookTime}</p>
                </div>
              )}
              
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-3">
                  <FaUser className="text-primary-600 text-2xl" />
                </div>
                <p className="text-sm text-gray-500">Servings</p>
                <p className="font-semibold text-lg text-gray-700">{recipe.servings}</p>
              </div>
            </div>
            
            <div className="flex justify-center mt-8">
              <motion.button
                onClick={startSlideshow}
                className="bg-primary-500 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-primary-600"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <FaPlay />
                <span>Start Recipe Slideshow</span>
              </motion.button>
            </div>
            
            <div className="flex justify-center mt-4">
              <Link href="/" className="text-primary-600 hover:text-primary-800 underline">
                Return to Home
              </Link>
            </div>
          </div>
        </motion.div>
        
        {/* Recipe Ingredients & Equipment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <motion.div 
            className="bg-white rounded-xl shadow-md p-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Ingredients</h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary-500 mt-2 mr-2"></span>
                  <span>
                    <span className="font-medium">{ingredient.name}</span>
                    {ingredient.quantity && <span className="text-gray-600"> - {ingredient.quantity}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
          
          <motion.div 
            className="bg-white rounded-xl shadow-md p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Equipment</h2>
            <ul className="space-y-2">
              {recipe.equipment.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mt-2 mr-2"></span>
                  <span>{item.name}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
      {/* Using global KitchenBackground component instead of local backgrounds */}
    </div>
  );
}