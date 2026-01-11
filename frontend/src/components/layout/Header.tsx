import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "@/components/theme-provider"
import type { Environment } from "@/types"

interface HeaderProps {
  environment: Environment
  onEnvironmentChange: (env: Environment) => void
}

export function Header({ environment, onEnvironmentChange }: HeaderProps) {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <header className="border-b bg-card">
      <div className="flex h-14 items-center px-4 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">P</span>
          </div>
          <h1 className="text-lg font-semibold">PostWhale</h1>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Select value={environment} onValueChange={(v) => onEnvironmentChange(v as Environment)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOCAL">LOCAL</SelectItem>
              <SelectItem value="STAGING">STAGING</SelectItem>
              <SelectItem value="PRODUCTION">PRODUCTION</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
