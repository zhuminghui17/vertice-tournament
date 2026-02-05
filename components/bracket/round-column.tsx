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
  const isChampionship = round === totalRounds;
  
  // Calculate spacing based on round
  const spacingMultiplier = Math.pow(2, round - 1);
  
  return (
    <div className="flex flex-col items-center min-w-[220px]">
      <div className="mb-6 text-center">
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${
          isChampionship 
            ? 'text-primary' 
            : 'text-muted-foreground'
        }`}>
          {roundName}
        </h3>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {matches.length} match{matches.length !== 1 ? 'es' : ''}
        </p>
      </div>
      <div 
        className="flex flex-col justify-around flex-1"
        style={{ gap: `${spacingMultiplier * 2}rem` }}
      >
        {matches
          .sort((a, b) => a.position - b.position)
          .map((match) => (
            <div 
              key={match.id} 
              className="flex items-center"
              style={{ 
                marginTop: round > 1 ? `${(spacingMultiplier - 1) * 2}rem` : 0,
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
