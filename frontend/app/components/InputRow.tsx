interface InputRowProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export default function InputRow({ index, value, onChange, onPaste, onRemove, canRemove }: InputRowProps) {
  return (
    <div className="flex gap-2 items-stretch">
      <div className="flex items-center justify-center w-6 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold shrink-0">{index + 1}</div>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} onPaste={onPaste} placeholder={`Value ${index + 1}`} className="flex-1 min-w-0 px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 h-8" />
      {canRemove && (
        <button onClick={onRemove} className="px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 active:bg-red-100 dark:active:bg-red-900/30 transition-all text-xs shrink-0 h-8" title="Remove this value">
          ×
        </button>
      )}
    </div>
  );
}
