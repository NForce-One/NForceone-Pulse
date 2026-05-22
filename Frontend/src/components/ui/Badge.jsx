import React from "react";
import { cn } from "../../utils/twMerge";

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-[#e5e7eb] text-[#6b7280] border border-[#d1d5db]",
    primary: "bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30",
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
