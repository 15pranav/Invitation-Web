"use client";
import { motion, useIsPresent } from "motion/react";
import type { ReactNode } from "react";
// Exiting scrubbed layers retain their last props. Hide them immediately so a
// settled incoming scene can never re-expose its already-faded predecessor.
export default function JourneyLayer({
  className,
  slot,
  reduced,
  children,
  onComplete,
}: {
  className: string;
  slot?: number;
  reduced: boolean;
  children?: ReactNode;
  onComplete?: () => void;
}) {
  const present = useIsPresent();
  return (
    <motion.div
      className={className}
      data-scroll-slot={slot}
      style={{
        visibility: !present && slot !== undefined ? "hidden" : undefined,
      }}
      initial={slot !== undefined || reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: reduced || slot !== undefined ? 0 : 0.6,
        ease: "easeInOut",
      }}
      aria-hidden={!present || slot !== undefined ? true : undefined}
      inert={!present || slot !== undefined}
      onAnimationComplete={slot === undefined ? onComplete : undefined}
    >
      {children}
    </motion.div>
  );
}
