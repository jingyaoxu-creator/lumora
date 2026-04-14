import { cn } from "@/lib/utils";

interface LumoraLogoProps {
  className?: string;
  height?: number;
}

export function LumoraLogo({ className, height }: LumoraLogoProps) {
  return (
    <span
      className={cn(
        "text-[22px] font-bold tracking-tight text-foreground select-none",
        className
      )}
      style={height ? { fontSize: height } : undefined}
    >
      Lumora
    </span>
  );
}
