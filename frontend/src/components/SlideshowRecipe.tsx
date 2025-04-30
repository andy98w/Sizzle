import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaArrowRight, FaClock, FaUser } from 'react-icons/fa';
import { RecipeAnimation, IngredientVisual, EquipmentVisual } from './AnimationLibrary';

interface Ingredient {
  name: string;
  quantity?: string;
  image?: string;
}

interface Equipment {
  name: string;
  image?: string;
}

interface RecipeStep {
  id: number;
  instruction: string;
  action: string;
  ingredients: Ingredient[];
  equipment: Equipment[];
}

interface Recipe {
  title: string;
  description: string;
  prepTime?: string;
  prep_time?: string;
  cookTime?: string;
  cook_time?: string;
  servings: number;
  ingredients: Ingredient[];
  equipment: Equipment[];
  steps: RecipeStep[];
}

interface SlideshowRecipeProps {
  recipe: Recipe;
  onClose: () => void;
}

const SlideshowRecipe: React.FC<SlideshowRecipeProps> = ({ recipe, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  
  // Total number of slides: title slide + ingredients/equipment slide + all steps
  const totalSlides = 2 + recipe.steps.length;
  
  // Format times for consistency
  const prepTime = recipe.prepTime || recipe.prep_time || '';
  const cookTime = recipe.cookTime || recipe.cook_time || '';
  
  const goToNext = () => {
    if (currentSlide < totalSlides - 1) {
      setDirection(1);
      setCurrentSlide(currentSlide + 1);
    }
  };
  
  const goToPrevious = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(currentSlide - 1);
    }
  };
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);
  
  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };
  
  // Render dot indicators
  const renderDots = () => {
    return (
      <div className="flex justify-center mt-4 mb-2 gap-1">
        {Array.from({ length: totalSlides }).map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              currentSlide === index ? 'bg-primary-500 scale-150' : 'bg-gray-300'
            }`}
            onClick={() => {
              setDirection(index > currentSlide ? 1 : -1);
              setCurrentSlide(index);
            }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="relative bg-white w-full h-full overflow-hidden">
        {/* Close button */}
        <button
          className="absolute top-6 right-6 z-10 bg-white/80 hover:bg-white p-3 rounded-full text-gray-700 shadow-lg"
          onClick={onClose}
          aria-label="Close slideshow"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        {/* Slide content */}
        <div className="h-full relative overflow-hidden flex justify-center">
          <div className="w-full max-w-7xl">
            <AnimatePresence initial={false} custom={direction}>
            {/* First slide - Title and basic info */}
            {currentSlide === 0 && (
              <motion.div
                key="title-slide"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'tween', duration: 0.5 }}
                className="absolute inset-0 flex flex-col w-full"
              >
                <div className="flex-1 flex flex-col items-center justify-center p-12 md:p-16 text-center">
                  <h1 className="text-5xl md:text-6xl font-bold mb-8 text-gray-800 max-w-4xl">
                    {recipe.title}
                  </h1>
                  
                  {recipe.description && (
                    <p className="text-xl text-gray-600 mb-12 max-w-2xl">
                      {recipe.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap justify-center gap-12 mt-8">
                    {prepTime && (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-3">
                          <FaClock className="text-primary-600 text-3xl" />
                        </div>
                        <p className="text-sm text-gray-500">Prep Time</p>
                        <p className="font-semibold text-xl text-gray-700">{prepTime}</p>
                      </div>
                    )}
                    
                    {cookTime && (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-3">
                          <FaClock className="text-primary-600 text-3xl" />
                        </div>
                        <p className="text-sm text-gray-500">Cook Time</p>
                        <p className="font-semibold text-xl text-gray-700">{cookTime}</p>
                      </div>
                    )}
                    
                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-3">
                        <FaUser className="text-primary-600 text-3xl" />
                      </div>
                      <p className="text-sm text-gray-500">Servings</p>
                      <p className="font-semibold text-xl text-gray-700">{recipe.servings}</p>
                    </div>
                  </div>
                  
                  <motion.div 
                    className="mt-16 text-gray-600 flex items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="mr-2">Swipe or use arrow keys to navigate</span>
                    <FaArrowRight />
                  </motion.div>
                </div>
              </motion.div>
            )}
            
            {/* Second slide - Full ingredients and equipment list */}
            {currentSlide === 1 && (
              <motion.div
                key="ingredients-equipment-slide"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'tween', duration: 0.5 }}
                className="absolute inset-0 flex flex-col w-full"
              >
                <div className="flex-1 flex flex-col md:flex-row p-8 md:p-12">
                  {/* Ingredients */}
                  <div className="md:w-1/2 p-4 md:p-8 custom-scrollbar overflow-y-auto">
                    <h2 className="text-3xl font-bold mb-8 text-primary-700 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Ingredients
                    </h2>
                    
                    <div className="space-y-4">
                      {recipe.ingredients.map((ingredient, index) => (
                        <div key={index} className="bg-primary-50 p-4 rounded-lg border border-primary-100 flex items-center">
                          <IngredientVisual ingredient={ingredient.name} quantity={ingredient.quantity} />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Equipment */}
                  <div className="md:w-1/2 p-4 md:p-8 custom-scrollbar overflow-y-auto md:border-l border-gray-200">
                    <h2 className="text-3xl font-bold mb-8 text-blue-700 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Equipment
                    </h2>
                    
                    <div className="space-y-4">
                      {recipe.equipment.map((item, index) => (
                        <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center">
                          <EquipmentVisual equipment={item.name} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Step slides */}
            {currentSlide > 1 && (
              <motion.div
                key={`step-${currentSlide}`}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'tween', duration: 0.5 }}
                className="absolute inset-0 flex flex-col md:flex-row w-full"
              >
                {/* Step number and animation */}
                <div className="md:w-1/2 bg-gray-50 p-10 md:p-12 flex flex-col items-center justify-center">
                  <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-8">
                    <span className="text-4xl font-bold text-primary-600">
                      {currentSlide - 1}
                    </span>
                  </div>
                  
                  <div className="w-full max-w-xl flex justify-center">
                    <RecipeAnimation 
                      action={recipe.steps[currentSlide - 2].action}
                      ingredients={recipe.steps[currentSlide - 2].ingredients.map(i => i.name)}
                      equipment={recipe.steps[currentSlide - 2].equipment.map(e => e.name)}
                      size="large"
                    />
                  </div>
                </div>
                
                {/* Step instructions and ingredients/equipment */}
                <div className="md:w-1/2 p-10 md:p-16 flex flex-col overflow-y-auto max-h-full custom-scrollbar">
                  <h2 className="text-3xl font-bold mb-6 text-gray-800">
                    Step {currentSlide - 1}
                  </h2>
                  
                  <p className="text-xl mb-6 text-gray-700 leading-relaxed">
                    {recipe.steps[currentSlide - 2].instruction}
                  </p>
                  
                  <div className="flex flex-col space-y-6 mb-8">
                    {recipe.steps[currentSlide - 2].ingredients.length > 0 && (
                      <div className="bg-primary-50 p-6 md:p-8 rounded-lg border border-primary-100">
                        <h3 className="font-bold text-xl mb-4 text-primary-700 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          Ingredients for this step:
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {recipe.steps[currentSlide - 2].ingredients.map((ingredient, index) => (
                            <IngredientVisual
                              key={index}
                              ingredient={ingredient.name}
                              quantity={ingredient.quantity}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {recipe.steps[currentSlide - 2].equipment.length > 0 && (
                      <div className="bg-blue-50 p-6 md:p-8 rounded-lg border border-blue-100">
                        <h3 className="font-bold text-xl mb-4 text-blue-700 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                          </svg>
                          Equipment for this step:
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {recipe.steps[currentSlide - 2].equipment.map((item, index) => (
                            <EquipmentVisual
                              key={index}
                              equipment={item.name}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
        
        {/* Navigation controls */}
        <div className="absolute bottom-0 inset-x-0 p-8 md:p-10 flex flex-col items-center bg-gradient-to-t from-white via-white/80 to-transparent">
          <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
            {renderDots()}
            
            <div className="flex justify-between w-full max-w-2xl pt-4">
            <motion.button
              onClick={goToPrevious}
              disabled={currentSlide === 0}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`p-4 rounded-full shadow-md ${
                currentSlide === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-primary-600 hover:bg-primary-50'
              }`}
              aria-label="Previous slide"
            >
              <FaArrowLeft size={24} />
            </motion.button>
            
            <div className="flex items-center">
              <span className="font-medium text-gray-700">
                {currentSlide + 1} / {totalSlides}
              </span>
            </div>
            
            <motion.button
              onClick={goToNext}
              disabled={currentSlide === totalSlides - 1}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`p-4 rounded-full shadow-md ${
                currentSlide === totalSlides - 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-primary-600 hover:bg-primary-50'
              }`}
              aria-label="Next slide"
            >
              <FaArrowRight size={24} />
            </motion.button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlideshowRecipe;