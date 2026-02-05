'use client';

import { MatchCard } from './match-card';
import { getRoundName } from '@/lib/bracket-utils';
import type { MatchWithPlayers } from '@/lib/supabase/types';

interface RoundColumnProps {
  round: number;
  totalRounds: number;
  matches: MatchWithPlayers[];
  onMatchClick?: (match: MatchWithPlayers) => void;
}

export function RoundColumn({ round, totalRounds, matches, onMatchClick }: RoundColumnProps) {
  const roundName = getRoundName(round, totalRounds);
  
  // Calculate spacing based on round
  // Each round has half the matches of the previous, so we need more spacing
  const spacingMultiplier = Math.pow(2, round - 1);
  
  return (
    <div className="flex flex-col items-center min-w-[200px]">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
        {roundName}
      </h3>
      <div 
        className="flex flex-col justify-around flex-1"
        style={{ gap: `${spacingMultiplier * 1.5}rem` }}
      >
        {matches
          .sort((a, b) => a.position - b.position)
          .map((match) => (
            <div 
              key={match.id} 
              className="flex items-center"
              style={{ 
                marginTop: round > 1 ? `${(spacingMultiplier - 1) * 1.5}rem` : 0,
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
}
