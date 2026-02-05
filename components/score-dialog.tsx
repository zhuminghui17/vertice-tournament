'use client';

import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import type { MatchWithPlayers } from '@/lib/supabase/types';

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
      setPlayer1Score('');
      setPlayer2Score('');
      onOpenChange(false);
    } catch (err) {
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enter Match Score</DialogTitle>
          <DialogDescription>
            Enter the final scores for this match. The player with the higher score will advance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="player1-score" className="text-right col-span-2">
                <span className="text-xs text-muted-foreground mr-1">
                  ({match.player1?.seed})
                </span>
                {match.player1?.name}
              </Label>
              <Input
                id="player1-score"
                type="number"
                min="0"
                value={player1Score}
                onChange={(e) => setPlayer1Score(e.target.value)}
                className="col-span-2"
                placeholder="Score"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="player2-score" className="text-right col-span-2">
                <span className="text-xs text-muted-foreground mr-1">
                  ({match.player2?.seed})
                </span>
                {match.player2?.name}
              </Label>
              <Input
                id="player2-score"
                type="number"
                min="0"
                value={player2Score}
                onChange={(e) => setPlayer2Score(e.target.value)}
                className="col-span-2"
                placeholder="Score"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Score'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
