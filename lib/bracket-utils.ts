import type { Participant, Match } from './supabase/types';

/**
 * Generates NCAA-style seeding order for a bracket
 * For an 8-player bracket: 1v8, 4v5, 3v6, 2v7
 * This ensures top seeds meet lower seeds and are spread out
 */
export function generateSeedingOrder(bracketSize: number): number[][] {
  if (bracketSize === 2) {
    return [[0, 1]];
  }

  const rounds: number[][] = [];
  
  // Generate matchups for first round
  const matchups: number[][] = [];
  const halfSize = bracketSize / 2;
  
  // Standard bracket seeding pattern
  function getMatchups(seeds: number[]): number[][] {
    if (seeds.length === 2) {
      return [[seeds[0], seeds[1]]];
    }
    
    const half = seeds.length / 2;
    const top: number[] = [];
    const bottom: number[] = [];
    
    // Split seeds so that top seed plays bottom seed, etc.
    for (let i = 0; i < half; i++) {
      if (i % 2 === 0) {
        top.push(seeds[i]);
        bottom.push(seeds[seeds.length - 1 - i]);
      } else {
        top.push(seeds[seeds.length - 1 - i]);
        bottom.push(seeds[i]);
      }
    }
    
    return [...getMatchups(top), ...getMatchups(bottom)];
  }
  
  const seeds = Array.from({ length: bracketSize }, (_, i) => i);
  return getMatchups(seeds);
}

/**
 * Creates initial bracket matches for a tournament
 */
export function createInitialMatches(
  tournamentId: string,
  participants: { id: string; seed: number }[]
): Omit<Match, 'id' | 'created_at'>[] {
  const bracketSize = participants.length;
  const totalRounds = Math.log2(bracketSize);
  const matches: Omit<Match, 'id' | 'created_at'>[] = [];
  
  // Sort participants by seed
  const sortedParticipants = [...participants].sort((a, b) => a.seed - b.seed);
  
  // Get first round matchups based on seeding
  const matchups = generateSeedingOrder(bracketSize);
  
  // Create first round matches
  matchups.forEach((matchup, position) => {
    matches.push({
      tournament_id: tournamentId,
      round: 1,
      position,
      player1_id: sortedParticipants[matchup[0]].id,
      player2_id: sortedParticipants[matchup[1]].id,
      player1_score: null,
      player2_score: null,
      winner_id: null,
    });
  });
  
  // Create placeholder matches for subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let position = 0; position < matchesInRound; position++) {
      matches.push({
        tournament_id: tournamentId,
        round,
        position,
        player1_id: null,
        player2_id: null,
        player1_score: null,
        player2_score: null,
        winner_id: null,
      });
    }
  }
  
  return matches;
}

/**
 * Gets the round name based on round number and total rounds
 */
export function getRoundName(round: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - round;
  
  switch (roundsFromEnd) {
    case 0:
      return 'Championship';
    case 1:
      return 'Semifinals';
    case 2:
      return 'Quarterfinals';
    default:
      return `Round ${round}`;
  }
}

/**
 * Gets the next match position for a winner to advance to
 */
export function getNextMatchPosition(currentRound: number, currentPosition: number): { round: number; position: number; slot: 'player1' | 'player2' } {
  const nextRound = currentRound + 1;
  const nextPosition = Math.floor(currentPosition / 2);
  const slot = currentPosition % 2 === 0 ? 'player1' : 'player2';
  
  return { round: nextRound, position: nextPosition, slot };
}

/**
 * Validates that bracket size is a power of 2
 */
export function isValidBracketSize(size: number): boolean {
  return size >= 2 && (size & (size - 1)) === 0;
}

/**
 * Gets total number of rounds for a bracket size
 */
export function getTotalRounds(bracketSize: number): number {
  return Math.log2(bracketSize);
}
