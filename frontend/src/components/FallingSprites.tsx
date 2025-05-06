import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { getIngredientImageUrl, getEquipmentImageUrl } from './AnimationLibrary';

interface FallingSpriteProps {
  items: {
    type: 'ingredient' | 'equipment';
    name: string;
  }[];
}

interface SpriteItem {
  id: string;
  x: number;
  delay: number;
  rotation: number;
  type: 'ingredient' | 'equipment';
  name: string;
  imageUrl: string | null;
}

const FallingSprites: React.FC<FallingSpriteProps> = ({ items }) => {
  const [sprites, setSprites] = useState<SpriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImages = async () => {
      setIsLoading(true);
      
      // Create 20-30 sprites (some items will appear multiple times)
      const numberOfSprites = Math.min(Math.max(items.length * 2, 20), 30);
      const newSprites: SpriteItem[] = [];
      
      // Load all item images
      const imagePromises = items.map(async (item) => {
        const imageUrl = item.type === 'ingredient' 
          ? await getIngredientImageUrl(item.name)
          : await getEquipmentImageUrl(item.name);
        return { ...item, imageUrl };
      });
      
      const itemsWithImages = await Promise.all(imagePromises);
      
      // Create sprite items
      for (let i = 0; i < numberOfSprites; i++) {
        // Pick a random item from the loaded items
        const randomItem = itemsWithImages[Math.floor(Math.random() * itemsWithImages.length)];
        
        newSprites.push({
          id: `sprite-${i}`,
          x: Math.random() * 100, // Random horizontal position (0-100%)
          delay: Math.random() * 5, // Random delay (0-5s)
          rotation: (Math.random() - 0.5) * 60, // Random rotation (-30 to 30 degrees)
          type: randomItem.type,
          name: randomItem.name,
          imageUrl: randomItem.imageUrl
        });
      }
      
      setSprites(newSprites);
      setIsLoading(false);
    };
    
    if (items.length > 0) {
      loadImages();
    }
  }, [items]);
  
  if (isLoading || sprites.length === 0) {
    return null;
  }
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[9995]">
      {sprites.map((sprite) => (
        <motion.div
          key={sprite.id}
          className="absolute"
          style={{ 
            left: `${sprite.x}%`,
            top: '-50px',
          }}
          initial={{ y: -100, rotate: 0, opacity: 0 }}
          animate={{ 
            y: '100vh',
            rotate: sprite.rotation,
            opacity: [0, 1, 1, 0]
          }}
          transition={{ 
            duration: 10,
            delay: sprite.delay,
            ease: 'linear',
            opacity: { 
              times: [0, 0.1, 0.9, 1],
              duration: 10,
              delay: sprite.delay
            }
          }}
        >
          {sprite.imageUrl && (
            <img 
              src={sprite.imageUrl} 
              alt={sprite.name}
              className="w-12 h-12 object-contain rounded-full shadow-md bg-white/80"
              style={{ 
                transform: `scale(${0.7 + Math.random() * 0.6})` // Random size
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default FallingSprites;