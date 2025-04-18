'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FaClock, FaUser, FaUtensils, FaClipboard } from 'react-icons/fa';

interface RecipeTitleProps {
  title: string;
  description: string;
  prepTime?: string;
  cookTime?: string;
  servings?: number;
}

const RecipeTitle: React.FC<RecipeTitleProps> = ({
  title,
  description,
  prepTime,
  cookTime,
  servings,
}) => {
  return (
    <motion.div
      className="bg-white rounded-2xl shadow-md overflow-hidden mb-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-8">
        <div className="flex items-center mb-4">
          <motion.div 
            className="w-12 h-12 bg-primary-500 rounded-full text-white flex items-center justify-center mr-4"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 1 }}
          >
            <FaUtensils size={24} />
          </motion.div>
          <div>
            <motion.h1
              className="text-3xl font-bold text-gray-800"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {title}
            </motion.h1>
            <motion.p
              className="text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {description}
            </motion.p>
          </div>
        </div>

        {(prepTime || cookTime || servings) && (
          <motion.div
            className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-gray-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {prepTime && (
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center mr-3">
                  <FaClipboard className="text-primary-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Prep Time</p>
                  <p className="font-medium">{prepTime}</p>
                </div>
              </div>
            )}

            {cookTime && (
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center mr-3">
                  <FaClock className="text-primary-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cook Time</p>
                  <p className="font-medium">{cookTime}</p>
                </div>
              </div>
            )}

            {servings && (
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center mr-3">
                  <FaUser className="text-primary-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Servings</p>
                  <p className="font-medium">{servings}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default RecipeTitle;