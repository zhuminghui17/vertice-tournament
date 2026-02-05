'use client';

import { MatchCard } from './match-card';
import { getRoundName, getSideRoundName } from '@/lib/bracket-utils';
import type { MatchWithPlayers } from '@/lib/supabase/types';

interface BracketSideProps {
  matchesByRound: Map<number, MatchWithPlayers[]>;
  totalRoundsInSide: number;
  side: 'left' | 'right';
  onMatchClick?: (match: MatchWithPlayers) => void;
  showRoundNames?: boolean;
}

export function BracketSide({ 
  matchesByRound, 
  totalRoundsInSide, 
  side,
  onMatchClick,
  showRoundNames = false
}: BracketSideProps) {
  // For left side: Round 1 on left, progressing right toward center
  // For right side: Round 1 on right, progressing left toward center
  const rounds = Array.from({ length: totalRoundsInSide }, (_, i) => i + 1);
  // Right side shows rounds in reverse order (high rounds first, then lower rounds on the right)
  const displayRounds = side === 'right' ? [...rounds].reverse() : rounds;

  return (
    <div className="flex flex-row gap-4">
      {displayRounds.map((round) => {
        const matches = matchesByRound.get(round) || [];
        const spacingMultiplier = Math.pow(2, round - 1);
        
        // Get round name
        const roundName = showRoundNames 
          ? getRoundName(round, totalRoundsInSide)
          : getSideRoundName(round, totalRoundsInSide, side);
        
        return (
          <div key={round} className="flex flex-col items-center min-w-[220px]">
            <div className="mb-4 text-center">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {roundName}
              </h3>
              <p className="text-xs text-muted-foreground/50 mt-0.5">
                {matches.length} match{matches.length !== 1 ? 'es' : ''}
              </p>
            </div>
            
            <div 
              className="flex flex-col justify-around flex-1"
              style={{ gap: `${spacingMultiplier * 1.5}rem` }}
            >
              {matches.map((match, idx) => (
                <div 
                  key={match.id} 
                  className="flex items-center"
                  style={{ 
                    marginTop: round > 1 && idx === 0 ? `${(spacingMultiplier - 1) * 1.5}rem` : 0,
                  }}
                >
                  <MatchCard
                    match={match}
                    onClick={() => onMatchClick?.(match)}
                    isClickable={!!onMatchClick}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
