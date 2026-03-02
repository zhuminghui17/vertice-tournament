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
  confetti({
    particleCount: 100,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#6366f1', '#8b5cf6', '#a855f7', '#22c55e', '#eab308'],
  });
  
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#6366f1', '#8b5cf6', '#a855f7'],
    });
    confetti({
      particleCount: 60,
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

  // Determine winner for preview
  const s1 = parseInt(player1Score, 10);
  const s2 = parseInt(player2Score, 10);
  const hasValidScores = !isNaN(s1) && !isNaN(s2) && s1 !== s2 && s1 >= 0 && s2 >= 0;
  const previewWinner = hasValidScores ? (s1 > s2 ? 1 : 2) : null;

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
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                  previewWinner === 1 
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {match.player1?.seed}
                </div>
                <span className={`font-semibold truncate ${previewWinner === 1 ? 'text-green-600 dark:text-green-400' : ''}`}>
                  {match.player1?.name}
                </span>
                {previewWinner === 1 && <span className="text-green-500">🏆</span>}
              </div>
              <Input
                type="number"
                min="0"
                value={player1Score}
                onChange={(e) => setPlayer1Score(e.target.value)}
                className={`w-20 h-12 text-center text-xl font-mono font-bold border-2 transition-colors ${
                  previewWinner === 1 ? 'border-green-500 bg-green-500/10' : ''
                }`}
                placeholder="0"
                autoFocus
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">vs</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            
            {/* Player 2 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                  previewWinner === 2 
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {match.player2?.seed}
                </div>
                <span className={`font-semibold truncate ${previewWinner === 2 ? 'text-green-600 dark:text-green-400' : ''}`}>
                  {match.player2?.name}
                </span>
                {previewWinner === 2 && <span className="text-green-500">🏆</span>}
              </div>
              <Input
                type="number"
                min="0"
                value={player2Score}
                onChange={(e) => setPlayer2Score(e.target.value)}
                className={`w-20 h-12 text-center text-xl font-mono font-bold border-2 transition-colors ${
                  previewWinner === 2 ? 'border-green-500 bg-green-500/10' : ''
                }`}
                placeholder="0"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive text-center font-medium">{error}</p>
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
