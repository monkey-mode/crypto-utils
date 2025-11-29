interface CopyIconButtonProps {
  onClick: () => void;
  title?: string;
  className?: string;
}

export default function CopyIconButton({ onClick, title = "Copy", className = "" }: CopyIconButtonProps) {
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95 active:bg-blue-100 dark:active:bg-blue-900/30 transition-all shrink-0 h-8 flex items-center justify-center ${className}`} title={title}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </button>
  );
}
