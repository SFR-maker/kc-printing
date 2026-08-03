"use client";

/**
 * Scroll-reveal primitives for the marketing pages.
 *
 * Motion here is doing one job: sequencing. Content enters in the order it should be read, which
 * is why the product tiles and the process entries stagger rather than all appearing at once.
 * Nothing on these pages loops, pulses, or parallaxes.
 *
 * Everything collapses to a plain static render under `prefers-reduced-motion`.
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Reveal({
  children,
  className,
  delay = 0,
  y = 20,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.65, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const groupVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
};

/** Parent + child must live in the same client tree for staggerChildren to fire. */
export function RevealGroup({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={groupVariants}
      initial={reduce ? false : "hidden"}
      whileInView="shown"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
