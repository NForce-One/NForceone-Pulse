import React from "react";
import { cn } from "../../utils/twMerge";

const Button = React.forwardRef(({ className, variant = "primary", size = "default", ...props }, ref) => {
  const variants = {
    primary: "bg-[#6366F1] text-white hover:bg-[#4F46E5] shadow-sm hover:shadow-md active:scale-[0.98]",
    secondary: "bg-white text-[#374151] border border-[#D1D5DB] hover:bg-[#F9FAFB] hover:border-[#9CA3AF] shadow-sm",
    outline: "border border-[#D1D5DB] bg-transparent text-[#6B7280] hover:bg-[#F9FAFB] hover:border-[#6366F1] hover:text-[#6366F1]",
    ghost: "bg-transparent text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]",
    danger: "bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-sm hover:shadow-md active:scale-[0.98]",
    success: "bg-[#10B981] text-white hover:bg-[#059669] shadow-sm hover:shadow-md active:scale-[0.98]",
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
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50",
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
