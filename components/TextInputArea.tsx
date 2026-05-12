'use client';

import { cn } from '@/lib/utils';

const MAX = 5000;

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function TextInputArea({ value, onChange, disabled }: Props) {
  const over = value.length > MAX;
  return (
    <div className="relative w-full">
      <textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.slice(0, MAX + 100))}
        placeholder="輸入中文文字,將以台灣口音朗讀…"
        className={cn(
          'min-h-[260px] w-full resize-y rounded-2xl border border-border bg-card/60 px-6 py-5 text-lg leading-relaxed text-foreground placeholder:text-muted-foreground/70 shadow-inner backdrop-blur-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all',
          over && 'border-destructive focus:ring-destructive'
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute bottom-3 right-4 text-xs tabular-nums',
          over ? 'text-destructive' : 'text-muted-foreground'
        )}
      >
        {value.length.toLocaleString()} / {MAX.toLocaleString()}
      </div>
    </div>
  );
}
