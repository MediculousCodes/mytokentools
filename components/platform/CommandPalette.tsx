import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

type CommandOption = {
  label: string
  value: string
}

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: CommandOption[]
  onSelect: (value: string) => void
}

export function CommandPalette({ open, onOpenChange, options, onSelect }: CommandPaletteProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <Command>
          <CommandInput placeholder="Jump to surface…" autoFocus />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup heading="Navigation">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    onSelect(option.value)
                    onOpenChange(false)
                  }}
                >
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  )
}

