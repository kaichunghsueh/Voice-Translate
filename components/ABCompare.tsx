'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Pause, Play, Sparkles, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { VOICES, type VoiceId } from '@/lib/voices';
import { cn } from '@/lib/utils';

export interface VariantConfig {
  voice: VoiceId;
  rate: number;
  pitch: number;
}

interface Props {
  text: string;
  experimentId?: string;
}

interface VariantState {
  url: string | null;
  loading: boolean;
  error: string | null;
  durationMs: number;
}

const initial: VariantState = { url: null, loading: false, error: null, durationMs: 0 };

export function ABCompare({ text, experimentId = 'default' }: Props) {
  const [a, setA] = useState<VariantConfig>({ voice: 'zh-TW-HsiaoChenNeural', rate: 1.0, pitch: 0 });
  const [b, setB] = useState<VariantConfig>({ voice: 'zh-TW-HsiaoYuNeural', rate: 1.0, pitch: 0 });
  const [stA, setStA] = useState<VariantState>(initial);
  const [stB, setStB] = useState<VariantState>(initial);
  const [winner, setWinner] = useState<'A' | 'B' | 'tie' | null>(null);
  const [voting, setVoting] = useState(false);

  const audioA = useRef<HTMLAudioElement | null>(null);
  const audioB = useRef<HTMLAudioElement | null>(null);
  const [playingA, setPlayingA] = useState(false);
  const [playingB, setPlayingB] = useState(false);

  useEffect(() => {
    return () => {
      if (stA.url) URL.revokeObjectURL(stA.url);
      if (stB.url) URL.revokeObjectURL(stB.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function synth(variant: 'A' | 'B', cfg: VariantConfig) {
    const setSt = variant === 'A' ? setStA : setStB;
    const cur = variant === 'A' ? stA : stB;
    if (cur.url) URL.revokeObjectURL(cur.url);
    setSt({ ...initial, loading: true });
    const started = Date.now();
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...cfg, text, variant, experimentId })
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setSt({ url, loading: false, error: null, durationMs: Date.now() - started });
    } catch (e) {
      setSt({ url: null, loading: false, error: e instanceof Error ? e.message : String(e), durationMs: 0 });
    }
  }

  async function generateBoth() {
    setWinner(null);
    await Promise.all([synth('A', a), synth('B', b)]);
  }

  function toggle(variant: 'A' | 'B') {
    const el = variant === 'A' ? audioA.current : audioB.current;
    if (!el) return;
    if (el.paused) {
      // pause the other
      if (variant === 'A') audioB.current?.pause();
      else audioA.current?.pause();
      void el.play();
    } else el.pause();
  }

  async function vote(w: 'A' | 'B' | 'tie') {
    if (!stA.url || !stB.url || voting) return;
    setVoting(true);
    setWinner(w);
    try {
      await fetch('/api/ab/vote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          experimentId,
          winner: w,
          variantA: `${a.voice}|${a.rate}|${a.pitch}`,
          variantB: `${b.voice}|${b.rate}|${b.pitch}`,
          textLength: text.length
        })
      });
    } finally {
      setVoting(false);
    }
  }

  const canCompare = !!stA.url && !!stB.url;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            A/B 對比測試
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            並排合成兩組設定,選出你偏好的版本(匿名記錄到 App Insights)
          </p>
        </div>
        <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
          exp: {experimentId}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <VariantPanel
          label="A"
          accent="from-primary to-fuchsia-500"
          cfg={a}
          setCfg={setA}
          state={stA}
          playing={playingA}
          onToggle={() => toggle('A')}
          audioRef={audioA}
          onPlay={() => setPlayingA(true)}
          onPause={() => setPlayingA(false)}
          isWinner={winner === 'A'}
        />
        <VariantPanel
          label="B"
          accent="from-cyan-400 to-blue-500"
          cfg={b}
          setCfg={setB}
          state={stB}
          playing={playingB}
          onToggle={() => toggle('B')}
          audioRef={audioB}
          onPlay={() => setPlayingB(true)}
          onPause={() => setPlayingB(false)}
          isWinner={winner === 'B'}
        />
      </div>

      <div className="mt-5 grid gap-3">
        <Button
          size="lg"
          onClick={generateBoth}
          disabled={!text.trim() || stA.loading || stB.loading}
          className="w-full bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-500"
        >
          {stA.loading || stB.loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> 同時合成中…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> 生成 A 與 B
            </>
          )}
        </Button>

        {canCompare && (
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={winner === 'A' ? 'default' : 'outline'}
              onClick={() => vote('A')}
              disabled={voting}
            >
              <Trophy className="h-4 w-4" /> A 較佳
            </Button>
            <Button
              variant={winner === 'tie' ? 'default' : 'outline'}
              onClick={() => vote('tie')}
              disabled={voting}
            >
              平手
            </Button>
            <Button
              variant={winner === 'B' ? 'default' : 'outline'}
              onClick={() => vote('B')}
              disabled={voting}
            >
              <Trophy className="h-4 w-4" /> B 較佳
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

interface VariantProps {
  label: 'A' | 'B';
  accent: string;
  cfg: VariantConfig;
  setCfg: (v: VariantConfig) => void;
  state: VariantState;
  playing: boolean;
  onToggle: () => void;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  onPlay: () => void;
  onPause: () => void;
  isWinner: boolean;
}

function VariantPanel({
  label,
  accent,
  cfg,
  setCfg,
  state,
  playing,
  onToggle,
  audioRef,
  onPlay,
  onPause,
  isWinner
}: VariantProps) {
  return (
    <motion.div
      animate={isWinner ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'relative rounded-xl border bg-background/50 p-4 backdrop-blur-sm transition-all',
        isWinner ? 'border-primary ring-2 ring-primary/40' : 'border-border'
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white',
            accent
          )}
        >
          {label}
        </span>
        {state.durationMs > 0 && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {state.durationMs} ms
          </span>
        )}
      </div>

      <label className="text-xs text-muted-foreground">語音</label>
      <select
        className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        value={cfg.voice}
        onChange={(e) => setCfg({ ...cfg, voice: e.target.value as VoiceId })}
      >
        {VOICES.map((v) => (
          <option key={v.id} value={v.id}>
            {v.displayName} · {v.style}
          </option>
        ))}
      </select>

      <div className="mt-3 grid gap-3">
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>語速</span>
            <span className="tabular-nums">{cfg.rate.toFixed(2)}x</span>
          </div>
          <Slider
            value={[cfg.rate]}
            min={0.5}
            max={2}
            step={0.05}
            onValueChange={(v) => setCfg({ ...cfg, rate: v[0] ?? 1 })}
          />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>音調</span>
            <span className="tabular-nums">
              {cfg.pitch >= 0 ? '+' : ''}
              {cfg.pitch}%
            </span>
          </div>
          <Slider
            value={[cfg.pitch]}
            min={-50}
            max={50}
            step={1}
            onValueChange={(v) => setCfg({ ...cfg, pitch: v[0] ?? 0 })}
          />
        </div>
      </div>

      <div className="mt-4 min-h-[40px]">
        {state.error && (
          <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
            {state.error}
          </p>
        )}
        {state.url && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onToggle}>
              {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {playing ? '暫停' : '播放'}
            </Button>
            <a
              href={state.url}
              download={`voice-${label}.mp3`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input px-2.5 text-xs hover:bg-accent"
            >
              <Download className="h-3 w-3" />
              MP3
            </a>
            <audio
              ref={audioRef}
              src={state.url}
              onPlay={onPlay}
              onPause={onPause}
              onEnded={onPause}
              preload="auto"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
