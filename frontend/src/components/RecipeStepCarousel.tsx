'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RecipeAnimation, IngredientVisual, EquipmentVisual, CookingAction } from './AnimationLibrary';
import { FaArrowLeft, FaArrowRight, FaUtensils, FaListUl } from 'react-icons/fa';
import { API_URL } from '@/config';

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
  action: CookingAction;
  ingredients: Ingredient[];
  equipment: Equipment[];
  action_image?: string;
  step_image?: string;
}

interface Recipe {
  title: string;
  ingredients: Ingredient[];
  equipment: Equipment[];
  steps: RecipeStep[];
}

interface RecipeStepCarouselProps {
  recipe: Recipe;
}

const RecipeStepCarousel: React.FC<RecipeStepCarouselProps> = ({ recipe }) => {
  const [currentStep, setCurrentStep] = useState(0);
  // Total steps including the ingredients/equipment intro slide
  const totalSteps = recipe.steps.length + 1;

  const goToNext = () => {
    setCurrentStep((prev) => (prev < totalSteps - 1 ? prev + 1 : prev));
  };

  const goToPrev = () => {
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  // Variants for slide animations
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

  // Track the direction of navigation
  const [direction, setDirection] = useState(0);

  const handleNext = () => {
    setDirection(1);
    goToNext();
  };

  const handlePrev = () => {
    setDirection(-1);
    goToPrev();
  };

  // Create dot indicators
  const renderDotIndicators = () => {
    return (
      <div className="flex justify-center mt-6 space-x-2">
        {[...Array(totalSteps)].map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentStep ? 1 : -1);
              goToStep(index);
            }}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              currentStep === index
                ? 'bg-primary-500 scale-125'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to step ${index === 0 ? 'ingredients' : index}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Navigation arrows and progress indicator */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className={`p-3 rounded-full ${
            currentStep === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
          } transition-colors`}
          aria-label="Previous step"
        >
          <FaArrowLeft />
        </button>
        
        <div className="text-center">
          <span className="text-sm text-gray-500 font-medium">
            {currentStep === 0 
              ? 'Ingredients & Equipment'
              : `Step ${currentStep} of ${totalSteps - 1}`}
          </span>
          <div className="w-40 bg-gray-200 h-1 mt-2 rounded-full overflow-hidden">
            <div 
              className="bg-primary-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <button
          onClick={handleNext}
          disabled={currentStep === totalSteps - 1}
          className={`p-3 rounded-full ${
            currentStep === totalSteps - 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
          } transition-colors`}
          aria-label="Next step"
        >
          <FaArrowRight />
        </button>
      </div>

      {/* Carousel content */}
      <div className="relative overflow-hidden rounded-xl bg-white shadow-md h-[550px]">
        <AnimatePresence initial={false} custom={direction}>
          {currentStep === 0 ? (
            <motion.div
              key="ingredients-equipment"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'tween', duration: 0.5 }}
              className="absolute inset-0 p-6 overflow-y-auto"
            >
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                    <FaListUl className="text-primary-500" />
                  </div>
                  <h2 className="text-xl font-bold">Ingredients</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-8">
                  {recipe.ingredients.map((ing, i) => (
                    <IngredientVisual
                      key={i}
                      ingredient={ing.name}
                      quantity={ing.quantity}
                      image={ing.image}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                    <FaUtensils className="text-primary-500" />
                  </div>
                  <h2 className="text-xl font-bold">Equipment</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {recipe.equipment.map((equip, i) => (
                    <EquipmentVisual
                      key={i}
                      equipment={equip.name}
                      image={equip.image}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`step-${currentStep}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'tween', duration: 0.5 }}
              className="absolute inset-0 p-6 overflow-y-auto"
            >
              <div className="flex flex-col md:flex-row h-full">
                {/* Step animation/visualization */}
                <div className="md:w-1/2 flex items-center justify-center p-4">
                  {recipe.steps[currentStep - 1].step_image ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={`${API_URL}${recipe.steps[currentStep - 1].step_image}`}
                        alt={`Step ${currentStep}: ${recipe.steps[currentStep - 1].instruction}`}
                        className="w-full max-w-xs mx-auto rounded-lg shadow-md mb-4"
                        onError={(e) => {
                          // If image fails to load, hide it
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          // And show a fallback message in its container
                          const container = target.parentElement;
                          if (container) {
                            const fallback = document.createElement('div');
                            fallback.className = 'p-4 bg-red-50 rounded-lg text-red-800 mb-4';
                            fallback.textContent = 'Image generation failed';
                            container.insertBefore(fallback, target);
                          }
                        }}
                      />
                      <span className="text-sm text-gray-500">AI generated step visualization</span>
                    </div>
                  ) : recipe.steps[currentStep - 1].action_image ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={`${API_URL}${recipe.steps[currentStep - 1].action_image}`}
                        alt={`${recipe.steps[currentStep - 1].action} action`}
                        className="w-full max-w-xs mx-auto rounded-lg shadow-md mb-4"
                        onError={(e) => {
                          // If image fails to load, hide it
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <RecipeAnimation
                        action={recipe.steps[currentStep - 1].action}
                        ingredients={recipe.steps[currentStep - 1].ingredients.map(i => i.name)}
                        equipment={recipe.steps[currentStep - 1].equipment.map(e => e.name)}
                        size="medium"
                      />
                    </div>
                  ) : (
                    <RecipeAnimation
                      action={recipe.steps[currentStep - 1].action}
                      ingredients={recipe.steps[currentStep - 1].ingredients.map(i => i.name)}
                      equipment={recipe.steps[currentStep - 1].equipment.map(e => e.name)}
                      size="large"
                    />
                  )}
                </div>

                {/* Step instructions */}
                <div className="md:w-1/2 p-6 flex flex-col">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center mr-3">
                      {currentStep}
                    </div>
                    <h3 className="text-lg font-semibold">Step {currentStep}</h3>
                  </div>

                  <p className="mb-6 text-gray-700">{recipe.steps[currentStep - 1].instruction}</p>

                  {/* Ingredients needed for this step */}
                  {recipe.steps[currentStep - 1].ingredients.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">Ingredients for this step:</h4>
                      <div className="space-y-2">
                        {recipe.steps[currentStep - 1].ingredients.map((ing, i) => (
                          <IngredientVisual
                            key={i}
                            ingredient={ing.name}
                            quantity={ing.quantity}
                            image={ing.image}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Equipment needed for this step */}
                  {recipe.steps[currentStep - 1].equipment.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Equipment for this step:</h4>
                      <div className="space-y-2">
                        {recipe.steps[currentStep - 1].equipment.map((equip, i) => (
                          <EquipmentVisual
                            key={i}
                            equipment={equip.name}
                            image={equip.image}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next/Previous navigation buttons (mobile only) */}
                  <div className="mt-auto pt-4 flex justify-between md:hidden">
                    <button
                      onClick={handlePrev}
                      disabled={currentStep === 0}
                      className={`px-4 py-2 rounded ${
                        currentStep === 0
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-primary-100 text-primary-600'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={currentStep === totalSteps - 1}
                      className={`px-4 py-2 rounded ${
                        currentStep === totalSteps - 1
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-primary-500 text-white'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dot indicators for steps */}
      {renderDotIndicators()}
    </div>
  );
};

export default RecipeStepCarousel;