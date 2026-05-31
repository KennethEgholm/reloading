'use client';

import { adjustProjectileAmount } from './actions';
import { toast } from 'sonner';

interface AdjustAmountButtonProps {
  id: string;
  delta: number;
  children: React.ReactNode;
}

export function AdjustAmountButton({ id, delta, children }: AdjustAmountButtonProps) {
  return (
    <button
      type="button"
      className="w-7 h-7 flex items-center justify-center border border-zinc-300 dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      onClick={async () => {
        try {
          await adjustProjectileAmount(id, delta);
          toast.success(delta > 0 ? 'Stock increased' : 'Stock decreased');
        } catch (error) {
          toast.error('Failed to update stock');
        }
      }}
    >
      {children}
    </button>
  );
}
