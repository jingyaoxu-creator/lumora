"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import type { CheckResult } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  pass: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
    label: "Pass",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-50 text-amber-600 border-amber-200",
    label: "Warning",
  },
  fail: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-50 text-red-600 border-red-200",
    label: "Fail",
  },
};

export function CheckResultCard({
  check,
  index,
}: {
  check: CheckResult;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[check.status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={`glass group rounded-xl transition-all ${
        expanded ? "!border-border" : ""
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${config.bg}`}
        >
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{check.name}</span>
            <Badge
              variant="outline"
              className={`px-1.5 py-0 text-[10px] ${config.badge}`}
            >
              {config.label}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">{check.category}</span>
        </div>
        {/* Mini score bar */}
        <div className="hidden items-center gap-2 sm:flex">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border/30">
            <motion.div
              className="h-full rounded-full"
              style={{
                backgroundColor:
                  check.score >= 80
                    ? "#22c55e"
                    : check.score >= 50
                    ? "#f59e0b"
                    : "#ef4444",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${check.score}%` }}
              transition={{ duration: 0.8, delay: index * 0.04 + 0.2 }}
            />
          </div>
          <span className="w-8 text-right font-mono text-xs text-muted-foreground">
            {check.score}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-border/50 px-4 pb-4 pt-3"
        >
          <p className="text-sm text-muted-foreground">{check.details}</p>
          {check.suggestion && (
            <div className="mt-3 rounded-lg border border-aurora-violet/15 bg-aurora-violet/5 p-3">
              <p className="text-sm text-foreground/90">
                <span className="font-medium text-aurora-violet">Fix: </span>
                {check.suggestion}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
