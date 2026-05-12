'use client';

import { useEffect, useRef, useState } from 'react';
import { Languages, History as HistoryIcon, Copy, Check, GitCompare, Mic, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextInputArea } from '@/components/TextInputArea';
import { VoicePicker } from '@/components/VoicePicker';
import { ParamPanel } from '@/components/ParamPanel';
import { GenerateButton } from '@/components/GenerateButton';
import { ClipPlayer } from '@/components/ClipPlayer';
import { GeneratingPanel } from '@/components/GeneratingPanel';
import { HistoryDrawer } from '@/components/HistoryDrawer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ABCompare } from '@/components/ABCompare';
import { pushHistory } from '@/lib/history';
import { cn } from '@/lib/utils';
import { VOICES, type VoiceId } from '@/lib/voices';
import { costLabel } from '@/lib/cost';

type Mode = 'single' | 'ab';

interface Clip {
  id: string;
  url: string;
  text: string;
  voice: VoiceId;
  rate: number;
  pitch: number;
  createdAt: number;
}

function voiceLabel(v: VoiceId) {
  return VOICES.find((x) => x.id === v)?.displayName ?? v;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('single');
  const [text, setText] = useState('你好,歡迎使用台灣口音語音合成服務,讓我們聽聽看效果如何。');
  const [voice, setVoice] = useState<VoiceId>('zh-TW-HsiaoChenNeural');
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  const [loading, setLoading] = useState(false);
  const [genMeta, setGenMeta] = useState<{ voice: VoiceId; textLength: number } | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const clipsRef = useRef<Clip[]>([]);
  clipsRef.current = clips;

  useEffect(() => {
    return () => {
      clipsRef.current.forEach((c) => URL.revokeObjectURL(c.url));
    };
  }, []);

  async function generate() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setGenMeta({ voice, textLength: text.length });
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, voice, rate, pitch })
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(body.message || body.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const clip: Clip = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url,
        text,
        voice,
        rate,
        pitch,
        createdAt: Date.now()
      };
      setClips((prev) => [clip, ...prev]);
      pushHistory({ text, voice, rate, pitch });
      setHistoryKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setGenMeta(null);
    }
  }

  function deleteClip(id: string) {
    setClips((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((c) => c.id !== id);
    });
  }

  function clearAll() {
    clips.forEach((c) => URL.revokeObjectURL(c.url));
    setClips([]);
  }

  async function copySsml() {
    const safe = text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
    const ssml = `<speak version="1.0" xml:lang="zh-TW" xmlns="http://www.w3.org/2001/10/synthesis"><voice name="${voice}"><prosody rate="${Math.round((rate - 1) * 100)}%" pitch="${pitch}%">${safe}</prosody></voice></speak>`;
    await navigator.clipboard.writeText(ssml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const latest = clips[0];
  const older = clips.slice(1);

  return (
    <main className="bg-app min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="History"
              onClick={() => setHistoryOpen(true)}
            >
              <HistoryIcon className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 font-semibold">
              <Languages className="h-5 w-5 text-primary" />
              Voice Translate
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                zh-TW
              </span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <section className="container max-w-6xl py-10">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h1 className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            中文 → 台灣口音語音
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Azure AI Speech · 神經網路語音 · 即時合成、可下載 MP3
          </p>

          <div className="mt-6 inline-flex rounded-full border border-border bg-card/60 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all',
                mode === 'single'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Mic className="h-3.5 w-3.5" />
              單一模式
            </button>
            <button
              type="button"
              onClick={() => setMode('ab')}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all',
                mode === 'ab'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <GitCompare className="h-3.5 w-3.5" />
              A/B 對比
            </button>
          </div>
        </div>

        {mode === 'single' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-5">
              <TextInputArea value={text} onChange={setText} disabled={loading} />
              {error && (
                <Card className="border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </Card>
              )}

              {loading && genMeta && (
                <GeneratingPanel voice={genMeta.voice} textLength={genMeta.textLength} />
              )}

              {!loading && latest && (
                <ClipPlayer
                  audioUrl={latest.url}
                  filename={`voice-${voiceLabel(latest.voice)}-${latest.id}.mp3`}
                  label={`最新 · ${voiceLabel(latest.voice)} · ${latest.text.length} 字 · ${costLabel(latest.text.length)}`}
                  subLabel={latest.text}
                  onDelete={() => deleteClip(latest.id)}
                />
              )}

              {older.length > 0 && (
                <div className="space-y-3 rounded-2xl border border-border bg-card/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <ListMusic className="h-4 w-4 text-primary" />
                      歷史片段 · {older.length} · 累計 {costLabel(older.reduce((s, c) => s + c.text.length, 0))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAll}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      全部清除
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {older.map((c, i) => (
                      <ClipPlayer
                        key={c.id}
                        audioUrl={c.url}
                        filename={`voice-${voiceLabel(c.voice)}-${c.id}.mp3`}
                        label={`#${clips.length - i - 1} · ${voiceLabel(c.voice)} · 語速 ${c.rate.toFixed(2)}x · 音調 ${c.pitch >= 0 ? '+' : ''}${c.pitch}% · ${c.text.length} 字 · ${costLabel(c.text.length)}`}
                        subLabel={c.text}
                        compact
                        onDelete={() => deleteClip(c.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="min-w-0 space-y-5">
              <Card className="p-5">
                <VoicePicker value={voice} onChange={setVoice} disabled={loading} />
              </Card>
              <Card className="p-5">
                <ParamPanel
                  rate={rate}
                  pitch={pitch}
                  onRateChange={setRate}
                  onPitchChange={setPitch}
                  disabled={loading}
                />
              </Card>
              <GenerateButton loading={loading} disabled={!text.trim()} onClick={generate} />
              <Button variant="outline" size="sm" className="w-full" onClick={copySsml}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? '已複製 SSML' : '複製 SSML'}
              </Button>
            </aside>
          </div>
        ) : (
          <div className="grid gap-6">
            <TextInputArea value={text} onChange={setText} />
            <ABCompare text={text} experimentId="voice-tw-v1" />
          </div>
        )}
      </section>

      <HistoryDrawer
        open={historyOpen}
        refreshKey={historyKey}
        onClose={() => setHistoryOpen(false)}
        onPick={(it) => {
          setText(it.text);
          setVoice(it.voice);
          setRate(it.rate);
          setPitch(it.pitch);
        }}
      />
    </main>
  );
}
