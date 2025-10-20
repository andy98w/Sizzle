'use client';

import React from 'react';
import Navigation from '@/components/Navigation';
import KitchenBackground from '@/components/KitchenBackground';

// Simple client component for the layout - CSS handles the slideshow visibility
export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <KitchenBackground />
      <Navigation />
      <main className="relative z-10 pt-[73px]">
        {children}
      </main>
    </>
  );
}