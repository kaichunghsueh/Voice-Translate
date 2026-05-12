'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Pause, Play } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  audioUrl: string;
  filename?: string;
}

interface WS {
  destroy: () => void;
  playPause: () => void;
  on: (event: string, cb: () => void) => void;
}

export function Waveform({ audioUrl, filename = 'voice-translate.mp3' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WS | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let ws: WS | null = null;

    (async () => {
      const WaveSurferMod = await import('wavesurfer.js');
      if (cancelled || !containerRef.current) return;
      ws = WaveSurferMod.default.create({
        container: containerRef.current,
        waveColor: 'rgba(168, 130, 255, 0.45)',
        progressColor: 'rgb(168, 130, 255)',
        cursorColor: 'rgba(255,255,255,0.5)',
        barWidth: 2,
        barGap: 2,
        barRadius: 2,
        height: 72,
        url: audioUrl
      }) as unknown as WS;
      wsRef.current = ws;
      ws.on('play', () => setPlaying(true));
      ws.on('pause', () => setPlaying(false));
      ws.on('finish', () => setPlaying(false));
    })();

    return () => {
      cancelled = true;
      ws?.destroy();
      wsRef.current = null;
    };
  }, [audioUrl]);

  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card/70 p-4 backdrop-blur-sm">
      <div ref={containerRef} className="overflow-hidden rounded-lg" />
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => wsRef.current?.playPause()}>
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
      </div>
    </div>
  );
}
