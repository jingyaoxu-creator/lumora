"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export function AnalysisLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      {/* Header skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Score rings skeleton */}
      <div className="flex justify-center gap-10 py-8">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.15 }}
            className="flex flex-col items-center gap-3"
          >
            <Skeleton className="h-[140px] w-[140px] rounded-full" />
            <Skeleton className="h-4 w-16" />
          </motion.div>
        ))}
      </div>

      {/* Animated scan line */}
      <div className="glass relative overflow-hidden rounded-2xl p-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-violet/10"
            >
              <div className="h-5 w-5 rounded-full border-2 border-aurora-violet/30 border-t-aurora-violet" />
            </motion.div>
            <div>
              <motion.p
                className="text-sm font-medium"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Analyzing your page...
              </motion.p>
              <p className="text-xs text-muted-foreground">
                Running 137 checks across SEO, GEO, and 10 AI platforms
              </p>
            </div>
          </div>

          {/* Progress items */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              "Meta tags",
              "Headings",
              "Structured data",
              "Social tags",
              "Content structure",
              "FAQ patterns",
              "Entity coverage",
              "Citations",
            ].map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.2 }}
                className="flex items-center gap-2 rounded-lg bg-secondary/30 px-3 py-2"
              >
                <motion.div
                  className="h-2 w-2 rounded-full bg-aurora-violet"
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.2,
                    repeat: Infinity,
                  }}
                />
                <span className="text-xs text-muted-foreground">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Scanning beam */}
        <motion.div
          className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-aurora-violet/60 to-transparent"
          animate={{ left: ["0%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Results skeleton */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
