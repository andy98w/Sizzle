'use client';

import React, { useEffect } from 'react';
import { KITCHEN_CONSTANTS, getKitchenCSSVariables } from '../utils/constants';

const KitchenBackground: React.FC = () => {
  useEffect(() => {
    // Thorough cleanup function
    const cleanupAll = () => {
      // Remove by ID
      [
        'kitchen-wall-texture', 
        'kitchen-counter-texture', 
        'kitchen-styles',
        'kitchen-counter-label',
        'kitchen-debug-label',
        'kitchen-debug-marker'
      ].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.remove();
      });
      
      // Also remove by attribute - catches any kitchen-related elements we might have missed
      document.querySelectorAll('[id^="kitchen-"]').forEach(el => el.remove());
    };
    
    // Clean up existing elements first
    cleanupAll();
    
    console.log("Creating KitchenBackground using global constants...");
    
    // Create the wall background - this should extend from top to counter top
    const wallTexture = document.createElement('div');
    wallTexture.id = 'kitchen-wall-texture';
    
    // Calculate wall height as 100% - counter height
    const wallHeight = 100 - KITCHEN_CONSTANTS.COUNTER_HEIGHT_PERCENTAGE;
    
    // Set wall styles - wall extends from top to where counter begins
    wallTexture.style.position = 'fixed';
    wallTexture.style.top = '0';
    wallTexture.style.left = '0';
    wallTexture.style.width = '100%';
    wallTexture.style.height = `${wallHeight}vh`;
    wallTexture.style.backgroundColor = '#e5e7eb';
    wallTexture.style.backgroundImage = 'repeating-linear-gradient(to right, transparent, transparent 30px, rgba(0, 0, 0, 0.02) 30px, rgba(0, 0, 0, 0.02) 60px)';
    wallTexture.style.zIndex = '-1';
    
    // Create the counter background
    const counterTexture = document.createElement('div');
    counterTexture.id = 'kitchen-counter-texture';
    
    // Set counter styles - CRITICAL: The kitchen-counter-texture element's TOP edge is the landing surface
    counterTexture.style.position = 'fixed';
    counterTexture.style.bottom = '0'; // Position from bottom for consistency
    counterTexture.style.left = '0';
    counterTexture.style.width = '100%';
    counterTexture.style.height = `${KITCHEN_CONSTANTS.COUNTER_HEIGHT_PERCENTAGE}vh`;
    counterTexture.style.backgroundColor = KITCHEN_CONSTANTS.COUNTER_COLOR;
    counterTexture.style.backgroundImage = `repeating-linear-gradient(to right, transparent, transparent ${KITCHEN_CONSTANTS.WOOD_GRAIN_SIZE}, ${KITCHEN_CONSTANTS.WOOD_GRAIN_COLOR} ${KITCHEN_CONSTANTS.WOOD_GRAIN_SIZE}, ${KITCHEN_CONSTANTS.WOOD_GRAIN_COLOR} calc(${KITCHEN_CONSTANTS.WOOD_GRAIN_SIZE} * 2))`;
    counterTexture.style.zIndex = '-1';
    
    // No debug border or labels
    
    // Add styles to ensure root elements have transparent backgrounds
    const globalStyle = document.createElement('style');
    globalStyle.id = 'kitchen-styles';
    globalStyle.textContent = `
      html, body, #__next, main {
        background: transparent !important;
      }
    `;
    
    // Append elements to document
    document.head.appendChild(globalStyle);
    document.body.appendChild(wallTexture);
    document.body.appendChild(counterTexture);
    
    // Log to confirm created elements
    console.log("Kitchen backgrounds created using global constants");
    
    // No debug visualization or logging
    
    // Return cleanup function
    return cleanupAll;
  }, []);
  
  // No visible UI
  return null;
};

export default KitchenBackground;