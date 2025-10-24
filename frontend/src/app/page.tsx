'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Immediate redirect to animated-recipe page
    router.push('/animated-recipe');
  }, [router]);

  return null;
}