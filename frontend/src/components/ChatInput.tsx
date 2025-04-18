import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaPaperPlane, FaUndo } from 'react-icons/fa';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onReset: () => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onReset, isLoading }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <motion.div
      className="sticky bottom-0 w-full bg-white border-t border-gray-200 p-4"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <form onSubmit={handleSubmit} className="flex gap-2">
        <button
          type="button"
          onClick={onReset}
          className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          title="Reset conversation"
        >
          <FaUndo className="text-gray-600" />
        </button>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask about any recipe..."
          className="input flex-grow"
          disabled={isLoading}
        />
        <motion.button
          type="submit"
          className="p-3 rounded-full bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!message.trim() || isLoading}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
        >
          <FaPaperPlane />
        </motion.button>
      </form>
    </motion.div>
  );
};

export default ChatInput;