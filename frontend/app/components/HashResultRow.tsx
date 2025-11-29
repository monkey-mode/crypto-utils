import CopyIconButton from "./CopyIconButton";

interface HashResultRowProps {
  hash?: string;
  onCopy: () => void;
}

export default function HashResultRow({ hash, onCopy }: HashResultRowProps) {
  if (hash) {
    return (
      <>
        <div className="flex-1 min-w-0 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700 h-8 flex items-center">
          <code className="text-xs text-black dark:text-zinc-50 font-mono truncate w-full" title={hash}>
            {hash}
          </code>
        </div>
        <CopyIconButton onClick={onCopy} title="Copy hash" />
      </>
    );
  }

  return (
    <div className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 border-dashed h-8 flex items-center">
      <span className="text-xs text-zinc-400 dark:text-zinc-500">No hash yet</span>
    </div>
  );
}
