'use client';

import { motion } from 'framer-motion';
import { Mic, User, Volume2 } from 'lucide-react';
import { VOICES, type VoiceId, type VoiceMeta } from '@/lib/voices';
import { cn } from '@/lib/utils';

interface Props {
  value: VoiceId;
  onChange: (v: VoiceId) => void;
  onPreview?: (v: VoiceMeta) => void;
  disabled?: boolean;
}

export function VoicePicker({ value, onChange, onPreview, disabled }: Props) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          選擇語音
        </h3>
        <span className="text-xs text-muted-foreground">zh-TW · 台灣口音</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {VOICES.map((v) => {
          const active = v.id === value;
          const Icon = v.gender === 'female' ? Mic : User;
          return (
            <motion.button
              key={v.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(v.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'group relative rounded-xl border bg-card/60 p-4 text-left transition-all backdrop-blur-sm',
                active
                  ? 'border-primary ring-2 ring-primary/40 bg-primary/5'
                  : 'border-border hover:border-primary/40'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      v.gender === 'female'
                        ? 'bg-pink-500/15 text-pink-400'
                        : 'bg-blue-500/15 text-blue-400'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{v.displayName}</div>
                    <div className="text-[11px] text-muted-foreground">{v.style}</div>
                  </div>
                </div>
                {onPreview && (
                  <button
                    type="button"
                    aria-label="預覽"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview(v);
                    }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-3 line-clamp-1 text-xs text-muted-foreground">{v.sample}</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
