import React from "react";
import { cn } from "../../utils/twMerge";

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-[#2a2a2a] text-[#a1a1aa] border border-[#3a3a3a]",
    primary: "bg-[#ff2d2d]/20 text-[#ff2d2d] border border-[#ff2d2d]/30",
    info: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    success: "bg-green-500/20 text-green-400 border border-green-500/30",
    warning: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    danger: "bg-red-500/20 text-red-400 border border-red-500/30",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-200",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});

Badge.displayName = "Badge";

export { Badge };
