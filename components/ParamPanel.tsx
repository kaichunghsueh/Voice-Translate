'use client';

import { Slider } from './ui/slider';

interface Props {
  rate: number;
  pitch: number;
  onRateChange: (v: number) => void;
  onPitchChange: (v: number) => void;
  disabled?: boolean;
}

export function ParamPanel({ rate, pitch, onRateChange, onPitchChange, disabled }: Props) {
  return (
    <div className="grid gap-5">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium">語速</label>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs tabular-nums">
            {rate.toFixed(2)}x
          </span>
        </div>
        <Slider
          value={[rate]}
          min={0.5}
          max={2}
          step={0.05}
          disabled={disabled}
          onValueChange={(v) => onRateChange(v[0] ?? 1)}
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium">音調</label>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs tabular-nums">
            {pitch >= 0 ? '+' : ''}
            {pitch}%
          </span>
        </div>
        <Slider
          value={[pitch]}
          min={-50}
          max={50}
          step={1}
          disabled={disabled}
          onValueChange={(v) => onPitchChange(v[0] ?? 0)}
        />
      </div>
    </div>
  );
}
