import React from "react";
import { cn } from "../../utils/twMerge";

const Button = React.forwardRef(({ className, variant = "primary", size = "default", ...props }, ref) => {
  const variants = {
    primary: "bg-[#5B3CC4] text-white hover:bg-[#4A2FA0] shadow-sm hover:shadow-[rgba(91,60,196,0.3)] hover:scale-[1.02] active:scale-[0.98]",
    secondary: "bg-[#F1F5F9] text-[#1E293B] border border-[#E2E8F0] hover:bg-[#E2E8F0] hover:border-[#5B3CC4]/30 shadow-sm",
    outline: "border border-[#E2E8F0] bg-transparent text-[#64748B] hover:bg-[#F8FAFC] hover:border-[#5B3CC4] hover:text-[#5B3CC4]",
    ghost: "bg-transparent text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]",
    danger: "bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-sm hover:shadow-[rgba(239,68,68,0.3)] hover:scale-[1.02] active:scale-[0.98]",
    success: "bg-[#10B981] text-white hover:bg-[#059669] shadow-sm hover:shadow-[rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.98]",
  };

  const sizes = {
    sm: "h-8 px-3 text-sm",
    default: "h-10 px-4 py-2",
    lg: "h-12 px-8 text-lg",
    icon: "h-10 w-10",
  };

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3CC4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F6FA] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});

Button.displayName = "Button";
export { Button };
