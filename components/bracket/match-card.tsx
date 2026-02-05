'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MatchWithPlayers } from '@/lib/supabase/types';

interface MatchCardProps {
  match: MatchWithPlayers;
  onClick?: () => void;
  isClickable?: boolean;
}

export function MatchCard({ match, onClick, isClickable = false }: MatchCardProps) {
  const hasPlayers = match.player1 || match.player2;
  const isComplete = match.winner_id !== null;
  const canEnterScore = hasPlayers && match.player1 && match.player2 && !isComplete;

  return (
    <Card
      className={cn(
        'w-48 overflow-hidden transition-all',
        isClickable && canEnterScore && 'cursor-pointer hover:ring-2 hover:ring-primary',
        isComplete && 'bg-muted/50'
      )}
      onClick={isClickable && canEnterScore ? onClick : undefined}
    >
      <PlayerRow
        player={match.player1}
        score={match.player1_score}
        isWinner={match.winner_id === match.player1_id}
        isComplete={isComplete}
      />
      <div className="border-t border-border" />
      <PlayerRow
        player={match.player2}
        score={match.player2_score}
        isWinner={match.winner_id === match.player2_id}
        isComplete={isComplete}
      />
    </Card>
  );
}

interface PlayerRowProps {
  player: { id: string; name: string; seed: number } | null;
  score: number | null;
  isWinner: boolean;
  isComplete: boolean;
}

function PlayerRow({ player, score, isWinner, isComplete }: PlayerRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 text-sm',
        isWinner && 'bg-green-500/10 font-semibold',
        !player && 'text-muted-foreground italic'
      )}
    >
      <div className="flex items-center gap-2 truncate">
        {player && (
          <span className="text-xs text-muted-foreground w-4">
            {player.seed}
          </span>
        )}
        <span className="truncate">
          {player ? player.name : 'TBD'}
        </span>
      </div>
      {isComplete && score !== null && (
        <span className={cn(
          'ml-2 font-mono',
          isWinner ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
        )}>
          {score}
        </span>
      )}
    </div>
  );
}
