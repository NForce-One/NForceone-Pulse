import React from "react";
import { cn } from "../../utils/twMerge";

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]",
    primary: "bg-[#EEF2FF] text-[#6366F1] border border-[#C7D2FE]",
    info: "bg-[#EFF6FF] text-[#3B82F6] border border-[#BFDBFE]",
    success: "bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]",
    warning: "bg-[#FFFBEB] text-[#F59E0B] border border-[#FDE68A]",
    danger: "bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]",
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
