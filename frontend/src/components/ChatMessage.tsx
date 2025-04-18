import React from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaRobot } from 'react-icons/fa';

interface ChatMessageProps {
  message: {
    role: 'human' | 'ai';
    content: string;
  };
  index: number;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, index }) => {
  const isHuman = message.role === 'human';
  
  return (
    <motion.div
      className={`flex ${isHuman ? 'justify-end' : 'justify-start'} mb-4`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <div className={`flex max-w-[80%] ${isHuman ? 'flex-row-reverse' : 'flex-row'}`}>
        <div 
          className={`flex items-center justify-center h-10 w-10 rounded-full ${
            isHuman ? 'bg-primary-500 ml-3' : 'bg-gray-700 mr-3'
          }`}
        >
          {isHuman ? <FaUser className="text-white" /> : <FaRobot className="text-white" />}
        </div>
        <div
          className={`p-4 rounded-2xl whitespace-pre-wrap ${
            isHuman 
              ? 'bg-primary-500 text-white rounded-tr-none' 
              : 'bg-white border border-gray-200 shadow-sm rounded-tl-none'
          }`}
        >
          {message.content}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;