import { Languages } from "lucide-react"

import { useI18n, type Lang } from "@/i18n"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface LanguageToggleProps {
  className?: string
}

const LANG_OPTIONS: Array<{ key: Lang; label: string }> = [
  { key: "uz", label: "O'zbek" },
  { key: "ru", label: "Русский" },
  { key: "en", label: "English" },
]

export function LanguageToggle({ className = "" }: LanguageToggleProps) {
  const { lang, setLang } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className={className}>
        <Button variant="outline" size="icon">
          <Languages className="size-4" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANG_OPTIONS.map((option) => (
          <DropdownMenuItem key={option.key} onClick={() => setLang(option.key)}>
            {option.label} {lang === option.key ? "✓" : ""}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
