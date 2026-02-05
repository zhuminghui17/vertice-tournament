'use client';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { RoundColumn } from './round-column';
import { getTotalRounds } from '@/lib/bracket-utils';
import type { MatchWithPlayers, Participant } from '@/lib/supabase/types';

interface BracketProps {
  matches: MatchWithPlayers[];
  bracketSize: number;
  onMatchClick?: (match: MatchWithPlayers) => void;
  champion?: Participant | null;
}

export function Bracket({ matches, bracketSize, onMatchClick, champion }: BracketProps) {
  const totalRounds = getTotalRounds(bracketSize);
  
  // Group matches by round
  const matchesByRound = new Map<number, MatchWithPlayers[]>();
  for (let round = 1; round <= totalRounds; round++) {
    matchesByRound.set(round, matches.filter(m => m.round === round));
  }

  return (
    <div className="w-full">
      {champion && (
        <div className="mb-6 text-center">
          <div className="inline-block bg-gradient-to-r from-yellow-500/20 via-yellow-500/30 to-yellow-500/20 rounded-lg px-6 py-4">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Champion</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              🏆 {champion.name}
            </p>
          </div>
        </div>
      )}
      
      <ScrollArea className="w-full">
        <div className="flex gap-8 p-4 min-h-[400px]">
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
            <RoundColumn
              key={round}
              round={round}
              totalRounds={totalRounds}
              matches={matchesByRound.get(round) || []}
              onMatchClick={onMatchClick}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
