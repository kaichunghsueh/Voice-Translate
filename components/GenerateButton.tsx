'use client';

import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function GenerateButton({ loading, disabled, onClick }: Props) {
  return (
    <motion.div whileHover={{ scale: disabled ? 1 : 1.02 }} whileTap={{ scale: 0.98 }}>
      <Button
        size="xl"
        className="w-full bg-gradient-to-r from-primary to-fuchsia-500 hover:from-primary/90 hover:to-fuchsia-500/90 shadow-xl shadow-primary/30"
        onClick={onClick}
        disabled={disabled || loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            正在合成…
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            生成語音
          </>
        )}
      </Button>
    </motion.div>
  );
}
