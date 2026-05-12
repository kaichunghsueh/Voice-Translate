'use client';

import { useEffect, useState } from 'react';
import { History as HistoryIcon, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { clearHistory, loadHistory, type HistoryItem } from '@/lib/history';

interface Props {
  open: boolean;
  refreshKey: number;
  onClose: () => void;
  onPick: (item: HistoryItem) => void;
}

export function HistoryDrawer({ open, refreshKey, onClose, onPick }: Props) {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (open) setItems(loadHistory());
  }, [open, refreshKey]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="fixed inset-y-0 left-0 z-50 flex w-full max-w-sm flex-col border-r border-border bg-card/95 backdrop-blur-md"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <HistoryIcon className="h-4 w-4" />
                <h2 className="text-sm font-semibold">最近紀錄</h2>
                <span className="text-xs text-muted-foreground">({items.length}/10)</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="清除"
                  onClick={() => {
                    clearHistory();
                    setItems([]);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="關閉" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </header>
            <ul className="flex-1 space-y-2 overflow-y-auto p-3">
              {items.length === 0 && (
                <li className="px-3 py-10 text-center text-sm text-muted-foreground">
                  尚無紀錄
                </li>
              )}
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(it);
                      onClose();
                    }}
                    className="w-full rounded-lg border border-border bg-background/60 p-3 text-left transition hover:border-primary/50 hover:bg-accent"
                  >
                    <p className="line-clamp-2 text-sm">{it.text}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{it.voice.replace('zh-TW-', '').replace('Neural', '')}</span>
                      <span>·</span>
                      <span>{it.rate.toFixed(2)}x</span>
                      <span>·</span>
                      <span>{new Date(it.createdAt).toLocaleString('zh-TW')}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
