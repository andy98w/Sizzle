'use client';

import React from 'react';
import Navigation from '@/components/Navigation';
import KitchenBackground from '@/components/KitchenBackground';

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <KitchenBackground />
      <Navigation />
      <main className="relative z-10 pt-[68px]">
        {children}
      </main>
    </>
  );
}
