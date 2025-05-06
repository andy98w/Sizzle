'use client';

import React from 'react';

interface ErrorMessageProps {
  message: string;
  title?: string;
  className?: string;
  onRetry?: () => void;
}

/**
 * Reusable error message component
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  title = 'Error',
  className = '',
  onRetry,
}) => {
  return (
    <div className={`bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 ${className}`}>
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="mb-4">{message}</p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md transition-colors"
          aria-label="Retry"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;