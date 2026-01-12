import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"

    const variants = {
      default: "bg-primary text-primary-foreground hover:brightness-110 shadow-md dark:shadow-glow-md hover:shadow-xl dark:hover:shadow-glow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md dark:active:shadow-glow-md font-semibold",
      destructive: "bg-destructive text-destructive-foreground hover:brightness-110 shadow-md dark:shadow-glow-md hover:shadow-xl dark:hover:shadow-glow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md dark:active:shadow-glow-md font-semibold",
      outline: "border-2 border-input bg-background hover:bg-accent/80 dark:hover:bg-white/15 hover:text-accent-foreground hover:border-accent-foreground hover:shadow-md dark:hover:shadow-glow-md hover:-translate-y-0.5 active:translate-y-0 font-medium",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/50 hover:brightness-110 hover:shadow-md dark:hover:shadow-glow-md font-medium",
      ghost: "hover:bg-accent/60 dark:hover:bg-white/10 hover:text-accent-foreground hover:shadow-sm dark:hover:shadow-glow-sm",
      link: "text-primary underline-offset-4 hover:underline hover:brightness-110",
    }

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    }

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
