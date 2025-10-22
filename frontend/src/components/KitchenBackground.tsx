'use client';

import React, { useEffect } from 'react';
import { KITCHEN_CONSTANTS, getKitchenCSSVariables } from '../utils/constants';

const KitchenBackground: React.FC = () => {
  useEffect(() => {
    const cleanupAll = () => {
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

      document.querySelectorAll('[id^="kitchen-"]').forEach(el => el.remove());
    };

    cleanupAll();

    const wallTexture = document.createElement('div');
    wallTexture.id = 'kitchen-wall-texture';
    const wallHeight = 100 - KITCHEN_CONSTANTS.COUNTER_HEIGHT_PERCENTAGE;

    wallTexture.style.position = 'fixed';
    wallTexture.style.top = '0';
    wallTexture.style.left = '0';
    wallTexture.style.width = '100%';
    wallTexture.style.height = `${wallHeight}vh`;
    wallTexture.style.backgroundColor = '#e5e7eb';
    wallTexture.style.backgroundImage = 'repeating-linear-gradient(to right, transparent, transparent 30px, rgba(0, 0, 0, 0.02) 30px, rgba(0, 0, 0, 0.02) 60px)';
    wallTexture.style.zIndex = '-1';

    const counterTexture = document.createElement('div');
    counterTexture.id = 'kitchen-counter-texture';
    counterTexture.style.position = 'fixed';
    counterTexture.style.bottom = '0';
    counterTexture.style.left = '0';
    counterTexture.style.width = '100%';
    counterTexture.style.height = `${KITCHEN_CONSTANTS.COUNTER_HEIGHT_PERCENTAGE}vh`;
    counterTexture.style.backgroundColor = KITCHEN_CONSTANTS.COUNTER_COLOR;
    counterTexture.style.backgroundImage = `repeating-linear-gradient(to right, transparent, transparent ${KITCHEN_CONSTANTS.WOOD_GRAIN_SIZE}, ${KITCHEN_CONSTANTS.WOOD_GRAIN_COLOR} ${KITCHEN_CONSTANTS.WOOD_GRAIN_SIZE}, ${KITCHEN_CONSTANTS.WOOD_GRAIN_COLOR} calc(${KITCHEN_CONSTANTS.WOOD_GRAIN_SIZE} * 2))`;
    counterTexture.style.zIndex = '-1';

    const globalStyle = document.createElement('style');
    globalStyle.id = 'kitchen-styles';
    globalStyle.textContent = `
      html, body, #__next, main {
        background: transparent !important;
      }
    `;

    document.head.appendChild(globalStyle);
    document.body.appendChild(wallTexture);
    document.body.appendChild(counterTexture);

    return cleanupAll;
  }, []);

  return null;
};

export default KitchenBackground;