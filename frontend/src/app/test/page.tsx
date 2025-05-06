'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { API_URL } from '@/config';

export default function TestPage() {
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkApiStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api-status`);
      const data = await response.json();
      
      setSupabaseStatus(data.supabase?.status || 'error');
      setError(null);
    } catch (err) {
      setError('Failed to connect to API');
      setSupabaseStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Check status automatically on page load
  useEffect(() => {
    checkApiStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto max-w-3xl px-4">
        <motion.div
          className="bg-white rounded-lg shadow-md p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold mb-4">API Status Test</h1>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">API Status</h2>
            
            <div className="grid grid-cols-1 gap-4 mb-4">
              {/* Supabase Status */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Supabase Database</h3>
                {isLoading && supabaseStatus === null ? (
                  <div className="bg-gray-100 px-4 py-2 rounded">Checking connection...</div>
                ) : supabaseStatus === 'ok' ? (
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded">Database Connected</div>
                ) : supabaseStatus === 'error' ? (
                  <div className="bg-red-100 text-red-800 px-4 py-2 rounded">Database Connection Error</div>
                ) : supabaseStatus === 'not_configured' ? (
                  <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded">Database Not Configured</div>
                ) : (
                  <div className="bg-gray-100 px-4 py-2 rounded">Unknown Status</div>
                )}
              </div>
            </div>
            
            <button
              onClick={checkApiStatus}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Refresh Status
            </button>
          </div>
          
          {error && (
            <div className="bg-red-100 text-red-800 p-4 rounded mb-6">
              {error}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}