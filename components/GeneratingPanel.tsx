'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface Props {
  voice: string;
  textLength: number;
}

const STAGES = [
  { at: 0, label: '建立連線到 Azure AI Speech…' },
  { at: 600, label: '送出 SSML 並等待語音模型…' },
  { at: 1500, label: '合成神經網路語音中…' },
  { at: 3000, label: '收尾並編碼 MP3…' }
];

export function GeneratingPanel({ voice, textLength }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 100);
    return () => clearInterval(id);
  }, []);

  const stage = [...STAGES].reverse().find((s) => elapsed >= s.at) ?? STAGES[0];

  return (
    <div className="space-y-3 rounded-2xl border border-primary/30 bg-card/70 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="relative flex h-9 w-9 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {stage.label}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {voice} · {textLength} 字 · {(elapsed / 1000).toFixed(1)}s
          </div>
        </div>
      </div>
      {/* indeterminate progress */}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-[shimmer_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary via-fuchsia-400 to-primary" />
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
}
