import React from "react";
import { cn } from "../../utils/twMerge";

const Button = React.forwardRef(({ className, variant = "primary", size = "default", ...props }, ref) => {
  const variants = {
    primary: "bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white hover:from-[#16a34a] hover:to-[#15803d] shadow-lg shadow-[rgba(34,197,94,0.3)] hover:shadow-[rgba(34,197,94,0.5)] hover:scale-[1.02] active:scale-[0.98]",
    secondary: "bg-[#6b7280] text-white border border-[#9ca3af] hover:bg-[#4b5563] hover:border-[#22c55e] shadow-sm",
    outline: "border border-[#d1d5db] bg-white text-[#6b7280] hover:bg-[#f3f4f6] hover:border-[#22c55e] hover:text-[#22c55e]",
    ghost: "bg-transparent text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]",
    danger: "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98]",
    success: "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98]",
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
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3f4f6] disabled:pointer-events-none disabled:opacity-50",
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
