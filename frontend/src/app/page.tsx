'use client';

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';

export default function Home() {
  const [shouldRedirect, setShouldRedirect] = useState(false);
  
  useEffect(() => {
    // Wait 2 seconds before redirect to show our styling
    const timer = setTimeout(() => {
      setShouldRedirect(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if (shouldRedirect) {
      redirect('/animated-recipe');
    }
  }, [shouldRedirect]);
  
  return (
    <div className="flex flex-col items-center justify-center h-screen overflow-hidden m-0 p-0">
      <h1 className="text-4xl font-bold mb-4">Sizzle</h1>
      <p className="text-lg">Your Animated Recipe Assistant</p>
      {/* Using global KitchenBackground component instead of local backgrounds */}
    </div>
  );
}