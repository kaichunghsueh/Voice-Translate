'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Pause, Play, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export interface ClipPlayerProps {
  audioUrl: string;
  filename?: string;
  label?: string;
  subLabel?: string;
  compact?: boolean;
  onDelete?: () => void;
  autoFocus?: boolean;
}

function fmt(sec: number) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ClipPlayer({
  audioUrl,
  filename = 'voice-translate.mp3',
  label,
  subLabel,
  compact,
  onDelete,
  autoFocus
}: ClipPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => setPlaying(false);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('durationchange', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('durationchange', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, [audioUrl]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play().catch(() => setPlaying(false));
    } else {
      a.pause();
    }
  }

  function seekFromEvent(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
  }

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card/70 p-4 backdrop-blur-sm',
        compact ? 'space-y-2' : 'space-y-3'
      )}
    >
      {(label || subLabel) && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {label && <div className="truncate text-sm font-medium">{label}</div>}
            {subLabel && (
              <div className="truncate text-xs text-muted-foreground">{subLabel}</div>
            )}
          </div>
        </div>
      )}

      {/* hidden native audio element for actual playback */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" autoFocus={autoFocus} />

      {/* progress bar */}
      <div
        className="group relative h-2 cursor-pointer overflow-hidden rounded-full bg-muted"
        onClick={seekFromEvent}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(current)}
        tabIndex={0}
      >
        <div
          className="h-full bg-gradient-to-r from-primary to-fuchsia-400 transition-[width] duration-100"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={toggle}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? '暫停' : '播放'}
        </Button>
        <a
          href={audioUrl}
          download={filename}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
        >
          <Download className="h-4 w-4" />
          下載 MP3
        </a>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label="刪除"
            className="ml-auto text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <div
          className={cn(
            'tabular-nums text-xs text-muted-foreground',
            onDelete ? '' : 'ml-auto'
          )}
        >
          {fmt(current)} / {fmt(duration)}
        </div>
      </div>
    </div>
  );
}
