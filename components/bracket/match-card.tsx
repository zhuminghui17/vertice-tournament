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
  const isBye = hasPlayers && (!match.player1 || !match.player2) && isComplete;
  const canEnterScore = hasPlayers && match.player1 && match.player2 && !isComplete;

  return (
    <Card
      className={cn(
        'w-48 overflow-hidden transition-all',
        isClickable && canEnterScore && 'cursor-pointer hover:ring-2 hover:ring-primary',
        isComplete && !isBye && 'bg-muted/50',
        isBye && 'bg-blue-500/5 border-dashed'
      )}
      onClick={isClickable && canEnterScore ? onClick : undefined}
    >
      <PlayerRow
        player={match.player1}
        score={match.player1_score}
        isWinner={match.winner_id === match.player1_id}
        isComplete={isComplete}
        isBye={isBye ?? false}
        hasBye={!match.player2_id && !!match.player1_id}
      />
      <div className="border-t border-border" />
      <PlayerRow
        player={match.player2}
        score={match.player2_score}
        isWinner={match.winner_id === match.player2_id}
        isComplete={isComplete}
        isBye={isBye ?? false}
        hasBye={!match.player1_id && !!match.player2_id}
      />
    </Card>
  );
}

interface PlayerRowProps {
  player: { id: string; name: string; seed: number } | null;
  score: number | null;
  isWinner: boolean;
  isComplete: boolean;
  isBye?: boolean;
  hasBye?: boolean;
}

function PlayerRow({ player, score, isWinner, isComplete, isBye, hasBye }: PlayerRowProps) {
  // Show "BYE" for the empty slot in a bye match
  const showBye = isBye && !player;
  
  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 text-sm',
        isWinner && !isBye && 'bg-green-500/10 font-semibold',
        isWinner && isBye && 'bg-blue-500/10 font-semibold',
        !player && !showBye && 'text-muted-foreground italic'
      )}
    >
      <div className="flex items-center gap-2 truncate">
        {player && (
          <span className="text-xs text-muted-foreground w-4">
            {player.seed}
          </span>
        )}
        {showBye ? (
          <span className="text-muted-foreground text-xs uppercase tracking-wide">BYE</span>
        ) : (
          <span className="truncate">
            {player ? player.name : 'TBD'}
          </span>
        )}
        {hasBye && player && (
          <span className="text-xs text-blue-500 ml-1">(bye)</span>
        )}
      </div>
      {isComplete && score !== null && !isBye && (
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
