import React from "react";
import { cn } from "../../utils/twMerge";

const Button = React.forwardRef(({ className, variant = "primary", size = "default", ...props }, ref) => {
  const variants = {
    primary: "bg-gradient-to-r from-[#00d2ff] to-[#0099cc] text-white hover:from-[#0099cc] hover:to-[#006699] shadow-lg shadow-[rgba(0,210,255,0.3)] hover:shadow-[rgba(0,210,255,0.5)] hover:scale-[1.02] active:scale-[0.98]",
    secondary: "bg-[#2a2a2a] text-white border border-[#3a3a3a] hover:bg-[#333333] hover:border-[#00d2ff] shadow-sm",
    outline: "border border-[#3a3a3a] bg-transparent text-[#a1a1aa] hover:bg-[#1a1a1a] hover:border-[#00d2ff] hover:text-white",
    ghost: "bg-transparent text-[#a1a1aa] hover:bg-[#1a1a1a] hover:text-white",
    danger: "bg-gradient-to-r from-[#ff0000] to-[#cc0000] text-white hover:from-[#cc0000] hover:to-[#990000] shadow-lg shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98]",
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
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d2ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#000000] disabled:pointer-events-none disabled:opacity-50",
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
