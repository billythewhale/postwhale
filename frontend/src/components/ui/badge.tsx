import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80 shadow-sm dark:shadow-glow-sm",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm dark:shadow-glow-sm",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80 shadow-sm dark:shadow-glow-sm",
    outline: "text-foreground border border-input shadow-sm dark:shadow-glow-sm",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
