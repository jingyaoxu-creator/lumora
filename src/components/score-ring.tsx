"use client";

import { motion } from "framer-motion";

interface ScoreRingProps {
  score: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  delay?: number;
}

export function ScoreRing({
  score,
  label,
  size = 140,
  strokeWidth = 8,
  color,
  delay = 0,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const resolvedColor = color ?? "#0a0a0a";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background ring */}
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border/40"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={resolvedColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{
              duration: 1.2,
              delay: delay,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{
              filter: `drop-shadow(0 0 8px ${resolvedColor}40)`,
            }}
          />
        </svg>
        {/* Score number */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: delay + 0.3 }}
        >
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ color: resolvedColor }}
          >
            {score}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            / 100
          </span>
        </motion.div>
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
