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
        <div className="mb-8 text-center">
          <div className="inline-flex flex-col items-center gap-3 bg-gradient-to-br from-yellow-500/10 via-amber-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl px-8 py-6">
            <div className="text-5xl">🏆</div>
            <div>
              <p className="text-xs font-medium text-yellow-600 dark:text-yellow-500 uppercase tracking-widest mb-1">
                Champion
              </p>
              <p className="text-2xl font-bold gradient-text">
                {champion.name}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <ScrollArea className="w-full pb-4">
        <div className="flex gap-6 p-6 min-h-[450px]">
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
