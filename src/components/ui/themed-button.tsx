'use client'

import * as React from "react"
import { Button, ButtonProps } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useTheme } from "@/components/providers/ThemeProvider"
import { cn } from "@/lib/utils"

interface ThemedButtonProps extends ButtonProps {
  showLoadingState?: boolean;
}

const ThemedButton = React.forwardRef<HTMLButtonElement, ThemedButtonProps>(
  ({ className, variant = "default", size = "default", showLoadingState = true, children, ...props }, ref) => {
    const { isLoading } = useTheme();

    // Check if this button variant uses bg-gradient-primary that would flash
    const usesGradientPrimary = variant === "default" || variant === "premium";

    if (showLoadingState && isLoading && usesGradientPrimary) {
      return (
        <Skeleton 
          className={cn(
            "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
            size === "default" && "h-10 px-4 py-2",
            size === "sm" && "h-9 px-3",
            size === "lg" && "h-11 px-8",
            size === "icon" && "h-10 w-10",
            className
          )} 
        />
      );
    }

    return (
      <Button
        className={className}
        variant={variant}
        size={size}
        ref={ref}
        {...props}
      >
        {children}
      </Button>
    );
  }
)
ThemedButton.displayName = "ThemedButton"

export { ThemedButton }
