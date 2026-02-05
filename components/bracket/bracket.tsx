'use client';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { BracketSide } from './bracket-side';
import { MatchCard } from './match-card';
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
  
  // For small brackets (2-4 players), use single-sided layout
  if (totalRounds <= 2) {
    return (
      <SingleSidedBracket 
        matches={matches} 
        totalRounds={totalRounds} 
        onMatchClick={onMatchClick}
        champion={champion}
      />
    );
  }
  
  // Split matches into left and right sides
  // Left side: top half of bracket (positions 0 to half-1 in each round)
  // Right side: bottom half of bracket (positions half to end in each round)
  const leftMatches: MatchWithPlayers[] = [];
  const rightMatches: MatchWithPlayers[] = [];
  let finalMatch: MatchWithPlayers | null = null;
  
  matches.forEach(match => {
    if (match.round === totalRounds) {
      // Championship match goes in center
      finalMatch = match;
    } else {
      // Calculate how many matches are in this round for each side
      const matchesInRound = bracketSize / Math.pow(2, match.round);
      const halfMatches = matchesInRound / 2;
      
      if (match.position < halfMatches) {
        leftMatches.push(match);
      } else {
        // Adjust position for right side (relative to that side)
        rightMatches.push({
          ...match,
          position: match.position - halfMatches
        });
      }
    }
  });

  // Group by round for each side (excluding final)
  const roundsBeforeFinal = totalRounds - 1;
  
  const leftByRound = new Map<number, MatchWithPlayers[]>();
  const rightByRound = new Map<number, MatchWithPlayers[]>();
  
  for (let round = 1; round <= roundsBeforeFinal; round++) {
    leftByRound.set(round, leftMatches.filter(m => m.round === round).sort((a, b) => a.position - b.position));
    rightByRound.set(round, rightMatches.filter(m => m.round === round).sort((a, b) => a.position - b.position));
  }

  return (
    <div className="w-full">
      <ScrollArea className="w-full pb-4">
        <div className="flex items-stretch justify-center gap-4 p-6 min-h-[500px]">
          {/* Left Side - rounds go left to right */}
          <BracketSide
            matchesByRound={leftByRound}
            totalRoundsInSide={roundsBeforeFinal}
            side="left"
            onMatchClick={onMatchClick}
          />
          
          {/* Center - Championship */}
          <div className="flex flex-col items-center justify-center min-w-[240px] px-4">
            {champion && (
              <div className="mb-6 text-center">
                <div className="inline-flex flex-col items-center gap-2 bg-gradient-to-br from-yellow-500/10 via-amber-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl px-6 py-4">
                  <div className="text-4xl">🏆</div>
                  <div>
                    <p className="text-xs font-medium text-yellow-600 dark:text-yellow-500 uppercase tracking-widest">
                      Champion
                    </p>
                    <p className="text-xl font-bold gradient-text">
                      {champion.name}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-center mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                Championship
              </h3>
            </div>
            
            {finalMatch && (
              <MatchCard
                match={finalMatch}
                onClick={() => onMatchClick?.(finalMatch!)}
                isClickable={!!onMatchClick}
              />
            )}
          </div>
          
          {/* Right Side - rounds go right to left (reversed display) */}
          <BracketSide
            matchesByRound={rightByRound}
            totalRoundsInSide={roundsBeforeFinal}
            side="right"
            onMatchClick={onMatchClick}
          />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

// Fallback for small brackets (2-4 players)
function SingleSidedBracket({ 
  matches, 
  totalRounds, 
  onMatchClick,
  champion 
}: { 
  matches: MatchWithPlayers[]; 
  totalRounds: number;
  onMatchClick?: (match: MatchWithPlayers) => void;
  champion?: Participant | null;
}) {
  const matchesByRound = new Map<number, MatchWithPlayers[]>();
  for (let round = 1; round <= totalRounds; round++) {
    matchesByRound.set(round, matches.filter(m => m.round === round).sort((a, b) => a.position - b.position));
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
        <div className="flex justify-center gap-6 p-6 min-h-[300px]">
          <BracketSide
            matchesByRound={matchesByRound}
            totalRoundsInSide={totalRounds}
            side="left"
            onMatchClick={onMatchClick}
            showRoundNames
          />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
