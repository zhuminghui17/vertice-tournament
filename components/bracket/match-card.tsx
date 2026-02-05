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
        'w-52 overflow-hidden transition-all duration-200 border-border/60',
        isClickable && canEnterScore && 'cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5',
        canEnterScore && 'pulse-ring',
        isComplete && !isBye && 'bg-muted/30',
        isBye && 'bg-blue-500/5 border-dashed border-blue-500/30'
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
        isTop
      />
      <div className="h-px bg-border/60" />
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
  isTop?: boolean;
}

function PlayerRow({ player, score, isWinner, isComplete, isBye, hasBye, isTop }: PlayerRowProps) {
  const showBye = isBye && !player;
  
  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2.5 text-sm transition-colors',
        isWinner && !isBye && 'bg-green-500/10',
        isWinner && isBye && 'bg-blue-500/10',
        !player && !showBye && 'bg-muted/20'
      )}
    >
      <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
        {player ? (
          <>
            <span className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
              isWinner ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'
            )}>
              {player.seed}
            </span>
            <span className={cn(
              'truncate',
              isWinner && 'font-semibold'
            )}>
              {player.name}
            </span>
            {hasBye && (
              <span className="text-xs text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded shrink-0">
                bye
              </span>
            )}
          </>
        ) : showBye ? (
          <span className="text-muted-foreground/60 text-xs font-medium uppercase tracking-wider">
            — BYE —
          </span>
        ) : (
          <span className="text-muted-foreground/50 italic">TBD</span>
        )}
      </div>
      {isComplete && score !== null && !isBye && (
        <span className={cn(
          'ml-2 font-mono text-sm font-semibold tabular-nums px-2 py-0.5 rounded',
          isWinner 
            ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
            : 'bg-muted text-muted-foreground'
        )}>
          {score}
        </span>
      )}
    </div>
  );
}
