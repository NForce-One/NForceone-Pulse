import React from "react";
import { cn } from "../../utils/twMerge";

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]",
    primary: "bg-[#B33A2F]/10 text-[#B33A2F] border border-[#B33A2F]/30",
    info: "bg-blue-500/10 text-blue-600 border border-blue-500/30",
    success: "bg-green-500/10 text-green-600 border border-green-500/30",
    warning: "bg-yellow-500/10 text-yellow-600 border border-yellow-500/30",
    danger: "bg-red-500/10 text-red-600 border border-red-500/30",
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
