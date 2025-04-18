import React from 'react';
import { motion } from 'framer-motion';
import { RecipeAnimation, IngredientVisual, EquipmentVisual, CookingAction } from './AnimationLibrary';

interface Ingredient {
  name: string;
  quantity?: string;
}

interface Equipment {
  name: string;
}

interface RecipeStep {
  id: number;
  instruction: string;
  action: CookingAction;
  ingredients: Ingredient[];
  equipment: Equipment[];
  action_image?: string;  // URL for the AI-generated action image
  step_image?: string;    // URL for the AI-generated step image
}

interface RecipeStepsProps {
  steps: RecipeStep[];
}

const RecipeSteps: React.FC<RecipeStepsProps> = ({ steps }) => {
  return (
    <div className="my-8">
      <motion.h2 
        className="text-2xl font-bold mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        Instructions
      </motion.h2>
      
      <div className="space-y-12">
        {steps.map((step, index) => (
          <motion.div 
            key={step.id} 
            className="bg-white rounded-xl shadow-md overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="flex flex-col md:flex-row">
              {/* Animation area */}
              <div className="md:w-1/2 p-4 bg-gray-50">
                {step.step_image ? (
                  <div className="flex flex-col items-center">
                    <img 
                      src={`http://localhost:8000${step.step_image}`} 
                      alt={`Step ${step.id}: ${step.instruction}`}
                      className="w-full max-w-xs mx-auto rounded-lg shadow-md mb-4"
                    />
                    <span className="text-sm text-gray-500">AI generated step visualization</span>
                  </div>
                ) : step.action_image ? (
                  <div className="flex flex-col items-center">
                    <img 
                      src={`http://localhost:8000${step.action_image}`} 
                      alt={`${step.action} action`}
                      className="w-full max-w-xs mx-auto rounded-lg shadow-md mb-4"
                    />
                    <RecipeAnimation 
                      action={step.action} 
                      ingredients={step.ingredients.map(i => i.name)}
                      equipment={step.equipment.map(e => e.name)}
                      size="medium"
                    />
                  </div>
                ) : (
                  <RecipeAnimation 
                    action={step.action} 
                    ingredients={step.ingredients.map(i => i.name)}
                    equipment={step.equipment.map(e => e.name)}
                    size="large"
                  />
                )}
              </div>
              
              {/* Step details */}
              <div className="md:w-1/2 p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center mr-3">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-semibold">Step {index + 1}</h3>
                </div>
                
                <p className="mb-6 text-gray-700">{step.instruction}</p>
                
                {/* Ingredients needed for this step */}
                {step.ingredients.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-800 mb-2">Ingredients:</h4>
                    <div className="space-y-2">
                      {step.ingredients.map((ing, i) => (
                        <IngredientVisual 
                          key={i} 
                          ingredient={ing.name} 
                          quantity={ing.quantity}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Equipment needed for this step */}
                {step.equipment.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Equipment:</h4>
                    <div className="space-y-2">
                      {step.equipment.map((equip, i) => (
                        <EquipmentVisual 
                          key={i} 
                          equipment={equip.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RecipeSteps;