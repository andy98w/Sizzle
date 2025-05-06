'use client';

import React, { useEffect } from 'react';
import { KITCHEN_CONSTANTS } from '@/utils/constants';

// NOTE: This component is a fallback and shouldn't do much since we're using KitchenBackground
const BackgroundFix: React.FC = () => {
  useEffect(() => {
    // Create a style element
    const styleEl = document.createElement('style');
    styleEl.setAttribute('id', 'modal-background-fix');
    
    // ONLY make modals transparent, nothing else
    styleEl.innerHTML = `
      /* Remove background colors from modals and fullscreens */
      .fixed.inset-0[role="dialog"],
      .absolute.inset-0[role="dialog"],
      [role="dialog"],
      [data-dialogue],
      [role="modal"] {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
        backdrop-filter: none !important;
      }
    `;
    
    // Add the style element to the head
    document.head.appendChild(styleEl);
    
    // Cleanup on unmount
    return () => {
      const existingStyle = document.getElementById('modal-background-fix');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);
  
  return null; // This component doesn't render anything
};

export default BackgroundFix;