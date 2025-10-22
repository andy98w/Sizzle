'use client';

import React from 'react';
import { getImageUrl, handleImageError } from '@/utils';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
}

/**
 * Image component with error handling and fallback
 */
const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fallbackSrc = '/images/placeholder.png',
  className = '',
  ...props
}) => {
  // Process the image URL
  const imageUrl = src ? getImageUrl(src) : undefined;
  
  return (
    <img
      src={imageUrl || fallbackSrc}
      alt={alt}
      className={`object-contain ${className}`}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        if (target.src !== fallbackSrc) {
          handleImageError(e);
        }
      }}
      {...props}
    />
  );
};

export default ImageWithFallback;