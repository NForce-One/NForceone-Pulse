import React from "react";
import { cn } from "../../utils/twMerge";

const Input = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-[#2a2a2a] bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff2d2d] focus:border-transparent focus:shadow-[0_0_10px_rgba(255,45,45,0.3)] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
