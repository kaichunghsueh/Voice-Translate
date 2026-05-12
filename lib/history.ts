'use client';

import type { VoiceId } from './voices';

const KEY = 'voice-translate.history';
const MAX = 10;

export interface HistoryItem {
  id: string;
  text: string;
  voice: VoiceId;
  rate: number;
  pitch: number;
  createdAt: number;
}

export function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushHistory(item: Omit<HistoryItem, 'id' | 'createdAt'>): HistoryItem[] {
  const next: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: Date.now()
  };
  const list = [next, ...loadHistory()].slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}
