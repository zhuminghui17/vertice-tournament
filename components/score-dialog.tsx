'use client';

import { useState } from 'react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { MatchWithPlayers } from '@/lib/supabase/types';

// Confetti celebration effect
function triggerConfetti() {
  // First burst
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#6366f1', '#8b5cf6', '#a855f7', '#22c55e', '#eab308'],
  });
  
  // Second burst with slight delay
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#6366f1', '#8b5cf6', '#a855f7'],
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#22c55e', '#eab308', '#f97316'],
    });
  }, 150);
}

interface ScoreDialogProps {
  match: MatchWithPlayers | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (matchId: string, player1Score: number, player2Score: number) => Promise<void>;
}

export function ScoreDialog({ match, open, onOpenChange, onSubmit }: ScoreDialogProps) {
  const [player1Score, setPlayer1Score] = useState('');
  const [player2Score, setPlayer2Score] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match) return;

    const score1 = parseInt(player1Score, 10);
    const score2 = parseInt(player2Score, 10);

    if (isNaN(score1) || isNaN(score2)) {
      setError('Please enter valid scores');
      return;
    }

    if (score1 < 0 || score2 < 0) {
      setError('Scores cannot be negative');
      return;
    }

    if (score1 === score2) {
      setError('Scores cannot be tied - there must be a winner');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(match.id, score1, score2);
      
      // Trigger confetti celebration!
      triggerConfetti();
      
      setPlayer1Score('');
      setPlayer2Score('');
      onOpenChange(false);
    } catch {
      setError('Failed to update score. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPlayer1Score('');
      setPlayer2Score('');
      setError(null);
    }
    onOpenChange(newOpen);
  };

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Enter Match Score</DialogTitle>
          <DialogDescription>
            Enter the final scores. The winner will automatically advance to the next round.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-6 space-y-4">
            {/* Player 1 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                  {match.player1?.seed}
                </div>
                <span className="font-medium truncate">{match.player1?.name}</span>
              </div>
              <Input
                type="number"
                min="0"
                value={player1Score}
                onChange={(e) => setPlayer1Score(e.target.value)}
                className="w-24 h-12 text-center text-lg font-mono font-semibold"
                placeholder="0"
                autoFocus
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">vs</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            
            {/* Player 2 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                  {match.player2?.seed}
                </div>
                <span className="font-medium truncate">{match.player2?.name}</span>
              </div>
              <Input
                type="number"
                min="0"
                value={player2Score}
                onChange={(e) => setPlayer2Score(e.target.value)}
                className="w-24 h-12 text-center text-lg font-mono font-semibold"
                placeholder="0"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive text-center">{error}</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Score'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
