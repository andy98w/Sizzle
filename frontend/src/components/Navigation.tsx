'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: 'Cook', href: '/animated-recipe' },
  { name: 'Saved recipes', href: '/recipes' },
  { name: 'Ingredients', href: '/ingredients' },
];

const Navigation: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="sizzle-nav">
      <div className="sizzle-nav-inner">
        <Link href="/animated-recipe" className="sizzle-wordmark" aria-label="Sizzle home">
          <span className="wordmark-pan" aria-hidden="true"><span /></span>
          <span>Sizzle</span>
        </Link>

        <ul>
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={pathname === item.href ? 'active' : ''}>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;
