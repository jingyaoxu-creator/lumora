"use client";

import { motion } from "framer-motion";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function PaymentSuccess() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[oklch(0.995_0_0)]" />
        <div
          className="absolute top-[20%] left-[30%] h-[500px] w-[500px] rounded-full opacity-[0.12] blur-[140px]"
          style={{
            background:
              "radial-gradient(circle, oklch(0.7 0.2 285), transparent 65%)",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10"
        >
          <CheckCircle className="h-8 w-8 text-foreground" />
        </motion.div>

        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          Welcome to Pro!
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Your account has been upgraded. You now have unlimited scans and
          AI-powered suggestions.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => router.push("/")}
            className="rounded-xl bg-foreground px-6 text-background hover:bg-foreground/85"
          >
            Start Scanning
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <Button
            onClick={() => router.push("/pricing")}
            variant="outline"
            className="rounded-xl"
          >
            View Plan Details
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
