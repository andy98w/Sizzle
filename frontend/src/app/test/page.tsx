'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function TestPage() {
  const [stabilityStatus, setStabilityStatus] = useState<string | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null);
  const [testImageUrl, setTestImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkApiStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8000/api-status');
      const data = await response.json();
      
      setStabilityStatus(data.stability_ai?.status || 'error');
      setSupabaseStatus(data.supabase?.status || 'error');
      setError(null);
    } catch (err) {
      setError('Failed to connect to API');
      setStabilityStatus('error');
      setSupabaseStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const generateTestImage = async () => {
    try {
      setIsLoading(true);
      setTestImageUrl(null);
      const response = await fetch('http://localhost:8000/test-image');
      const data = await response.json();
      
      if (data.success) {
        setTestImageUrl(data.image_url);
        setError(null);
      } else {
        setError(data.message || 'Failed to generate image');
      }
    } catch (err) {
      setError('Failed to generate test image');
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
          <h1 className="text-2xl font-bold mb-4">Stability AI API Test</h1>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">API Status</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Stability AI Status */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Stability AI</h3>
                {isLoading && stabilityStatus === null ? (
                  <div className="bg-gray-100 px-4 py-2 rounded">Checking API status...</div>
                ) : stabilityStatus === 'ok' ? (
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded">API Connected</div>
                ) : stabilityStatus === 'error' ? (
                  <div className="bg-red-100 text-red-800 px-4 py-2 rounded">API Connection Error</div>
                ) : stabilityStatus === 'not_configured' ? (
                  <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded">API Key Not Configured</div>
                ) : (
                  <div className="bg-gray-100 px-4 py-2 rounded">Unknown Status</div>
                )}
              </div>
              
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
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Generate Test Image</h2>
            <button
              onClick={generateTestImage}
              disabled={isLoading || stabilityStatus !== 'ok'}
              className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50"
            >
              {isLoading ? 'Generating...' : 'Generate Sushi Icon'}
            </button>
          </div>
          
          {testImageUrl && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Generated Image:</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <img 
                  src={`http://localhost:8000${testImageUrl}`} 
                  alt="Test generated image" 
                  className="max-w-full h-auto mx-auto rounded-lg"
                  onError={() => setError('Failed to load generated image')}
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}