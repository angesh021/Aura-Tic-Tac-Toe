
import React from 'react';
import { createPortal } from 'react-dom';
import { motion, Variants } from 'framer-motion';

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  noPadding?: boolean;
}

const Modal: React.FC<ModalProps> = ({ children, onClose, className, noPadding }) => {
  const backdropVariants: Variants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
    exit: { opacity: 0 },
  };

  const modalVariants: Variants = {
    hidden: {
      y: 20,
      opacity: 0,
      scale: 0.95,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay: 0.05
      }
    },
    exit: {
      y: 20,
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2
      }
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      >
        <motion.div
          className={`relative w-full ${noPadding ? 'p-0' : 'p-6'} bg-[#0f172a] rounded-3xl shadow-2xl border border-white/10 overflow-hidden ${className || 'max-w-md'}`}
          variants={modalVariants}
          onClick={(e) => e.stopPropagation()}
          style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
        >
          {children}
        </motion.div>
      </motion.div>,
      document.body
  );
};

export default Modal;
