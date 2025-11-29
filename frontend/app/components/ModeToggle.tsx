type HashMode = "single" | "multiple";

interface ModeToggleProps {
  mode: HashMode;
  onModeChange: (mode: HashMode) => void;
}

export default function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg max-w-2xl mx-auto">
      <button onClick={() => onModeChange("single")} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-95 ${mode === "single" ? "bg-white dark:bg-zinc-700 text-black dark:text-zinc-50 shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50"}`}>
        Single Value
      </button>
      <button onClick={() => onModeChange("multiple")} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-95 ${mode === "multiple" ? "bg-white dark:bg-zinc-700 text-black dark:text-zinc-50 shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50"}`}>
        Multiple Values
      </button>
    </div>
  );
}
