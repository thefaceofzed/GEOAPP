import { motion } from "framer-motion";
import { memo, useMemo } from "react";
import type { ReactNode } from "react";

const initial = { opacity: 0, y: 12 } as const;
const visible = { opacity: 1, y: 0 } as const;
const exit = { opacity: 0, y: -8 } as const;
const transition = { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } as const;

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition = memo(function PageTransition({ children, className = "" }: PageTransitionProps) {
  const style = useMemo(() => ({ willChange: "transform, opacity" }), []);

  return (
    <motion.div
      initial={initial}
      animate={visible}
      exit={exit}
      transition={transition}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
});
