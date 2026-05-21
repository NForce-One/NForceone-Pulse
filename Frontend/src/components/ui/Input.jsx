import React from "react";
import { cn } from "../../utils/twMerge";

const Input = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent focus:shadow-[0_0_10px_rgba(34,197,94,0.3)] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
