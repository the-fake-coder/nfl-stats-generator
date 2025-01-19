'use client';

import StatGenerator from './components/StatGenerator';
import { motion } from 'framer-motion';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/400.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';

export default function Home() {
  return (
    <main className="min-h-screen p-8 md:p-12 lg:p-24 font-poppins">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        <motion.h1 
          className="text-4xl md:text-5xl font-bold text-center text-white mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          NFL Stats Generator
        </motion.h1>
        <motion.p 
          className="text-lg text-center text-gray-300 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Compare playoff team statistics and get AI-powered insights
        </motion.p>
        <StatGenerator />
      </motion.div>
    </main>
  );
}
