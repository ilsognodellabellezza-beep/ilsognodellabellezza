import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

/** Animazione di apertura: logo dorato che appare e si dissolve sul sito. */
export const IntroSplash: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(!reduceMotion);

  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => setVisible(false), 1500);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = '';
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#191415]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          onClick={() => setVisible(false)}
        >
          <motion.img
            src="/brand/logo-cm-light.png"
            alt=""
            className="h-28 sm:h-36 w-auto"
            initial={{ opacity: 0, scale: 0.85, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="mt-6 h-px bg-gradient-to-r from-transparent via-[#D8B268] to-transparent"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.7, ease: 'easeOut' }}
          />
          <motion.p
            className="mt-4 font-serif text-lg sm:text-2xl tracking-[0.2em] text-[#D8B268] uppercase text-center px-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
          >
            Il Sogno della Bellezza
          </motion.p>
          <motion.p
            className="mt-2 text-[11px] tracking-[0.3em] text-[#DEC7CA] uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.6 }}
          >
            Chiara e Melania · Catania
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
