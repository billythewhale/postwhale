import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked)
      props.onChange?.(e)
    }

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={handleChange}
          ref={ref}
          {...props}
        />
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded border-2 border-input bg-background transition-colors",
            checked && "border-primary bg-primary",
            props.disabled && "cursor-not-allowed opacity-50",
            !props.disabled && "cursor-pointer hover:border-primary/80",
            className
          )}
          onClick={() => !props.disabled && onCheckedChange?.(!checked)}
        >
          {checked && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
        </div>
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
