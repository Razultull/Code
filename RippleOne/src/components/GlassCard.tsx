"use client";

import { motion } from "framer-motion";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      className={`
        rounded-2xl
        bg-white/5
        backdrop-blur-xl
        border border-white/10
        shadow-lg shadow-black/20
        p-6
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}
