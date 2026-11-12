
import * as React from "react";
import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Layout
        "flex h-10 w-full min-w-0 rounded-lg px-3 py-2",
        
        // Typography
        "text-sm text-gray-900 placeholder:text-gray-400",
        
        // Border & background
        "border border-gray-200 bg-white",
        "shadow-sm shadow-gray-100/50",
        
        // Interaction
        "outline-none transition-all duration-200",
        "hover:border-gray-300",
        "focus:border-primary focus:ring-2 focus:ring-primary/10",
        
        // Selection
        "selection:bg-primary/15 selection:text-gray-900",
        
        // File input
        "file:mr-3 file:h-7 file:border-0 file:bg-transparent",
        "file:text-xs file:font-medium file:text-gray-600",
        
        // Disabled
        "disabled:cursor-not-allowed disabled:bg-gray-50",
        "disabled:text-gray-400 disabled:opacity-70",
        
        // Invalid
        "aria-invalid:border-red-400",
        "aria-invalid:focus:border-red-500",
        "aria-invalid:focus:ring-red-500/10",
        
        // Dark mode
        "dark:border-gray-700 dark:bg-gray-900",
        "dark:text-gray-100 dark:placeholder:text-gray-500",
        "dark:hover:border-gray-600",
        "dark:focus:border-primary",
        "dark:disabled:bg-gray-800",
        
        className
      )}
      {...props}
    />
  );
}

export { Input };
