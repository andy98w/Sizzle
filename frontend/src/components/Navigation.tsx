'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaUtensils, FaHome, FaBook, FaSearch } from 'react-icons/fa';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

const Navigation: React.FC = () => {
  const pathname = usePathname();
  
  const navItems: NavItem[] = [
    {
      name: 'Recipe Search',
      href: '/animated-recipe',
      icon: <FaSearch />
    },
    {
      name: 'My Recipes',
      href: '/recipes',
      icon: <FaBook />
    },
    {
      name: 'Sample Recipe',
      href: '/recipe',
      icon: <FaUtensils />
    },
    {
      name: 'API Test',
      href: '/test',
      icon: <FaUtensils />
    }
  ];
  
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/animated-recipe" className="flex items-center space-x-3">
            <div className="bg-primary-500 text-white p-2 rounded-full">
              <FaUtensils size={20} />
            </div>
            <span className="font-bold text-xl text-gray-800">Sizzle</span>
          </Link>
          
          <ul className="flex space-x-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              
              return (
                <li key={item.href}>
                  <Link href={item.href} passHref>
                    <motion.div
                      className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="mr-1.5">{item.icon}</span>
                      <span className="hidden sm:inline">{item.name}</span>
                    </motion.div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;