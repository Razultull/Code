import { useState, useCallback } from 'react';
import { Check, Copy as CopyIcon } from 'lucide-react';

export default function Copy({ text, children }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="relative inline-flex items-center gap-1.5 hover:text-blue-400 transition-colors cursor-pointer group"
    >
      {children}
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-emerald-400 text-xs rounded-md px-2 py-1 shadow-xl ring-1 ring-zinc-700 whitespace-nowrap animate-[fadeIn_100ms_ease-out]">
            Copied!
          </span>
        </>
      ) : (
        <CopyIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </button>
  );
}
