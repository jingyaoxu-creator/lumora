"use client";

import { motion } from "framer-motion";
import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function PaymentCancel() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[oklch(0.995_0_0)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm text-center"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10">
          <XCircle className="h-7 w-7 text-foreground" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Payment cancelled</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          No worries — you can upgrade anytime from the pricing page.
        </p>
        <Button
          onClick={() => router.push("/pricing")}
          variant="outline"
          className="rounded-xl"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Pricing
        </Button>
      </motion.div>
    </div>
  );
}
