"use client";

import { motion } from "framer-motion";
import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function AmbientBackground() {
  const isMounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);

  if (!isMounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Orb 1: Emerald */}
      <motion.div
        className="absolute w-[40vw] h-[40vw] rounded-full bg-emerald-500/30 blur-3xl opacity-30 mix-blend-screen dark:mix-blend-lighten will-change-transform"
        animate={{
          x: ["0%", "20%", "-10%", "0%"],
          y: ["0%", "-20%", "10%", "0%"],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: 18,
          ease: "easeInOut",
        }}
        style={{ top: "10%", left: "10%" }}
      />
      {/* Orb 2: Sapphire */}
      <motion.div
        className="absolute w-[35vw] h-[35vw] rounded-full bg-blue-500/30 blur-3xl opacity-30 mix-blend-screen dark:mix-blend-lighten will-change-transform"
        animate={{
          x: ["0%", "-15%", "15%", "0%"],
          y: ["0%", "10%", "-20%", "0%"],
          scale: [1, 1.2, 0.85, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: 22,
          ease: "easeInOut",
        }}
        style={{ bottom: "20%", right: "15%" }}
      />
      {/* Orb 3: Violet */}
      <motion.div
        className="absolute w-[30vw] h-[30vw] rounded-full bg-violet-500/30 blur-3xl opacity-30 mix-blend-screen dark:mix-blend-lighten will-change-transform"
        animate={{
          x: ["0%", "10%", "-20%", "0%"],
          y: ["0%", "25%", "-10%", "0%"],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: 20,
          ease: "easeInOut",
        }}
        style={{ top: "40%", left: "40%" }}
      />
    </div>
  );
}
