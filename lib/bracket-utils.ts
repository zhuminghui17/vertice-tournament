import type { Match } from './supabase/types';

/**
 * Gets the next power of 2 that is >= n
 */
export function getNextPowerOf2(n: number): number {
  if (n <= 1) return 2;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Calculates how many byes are needed for a given number of participants
 * Byes are given to top seeds so they advance automatically in round 1
 */
export function getByeCount(participantCount: number): number {
  const bracketSize = getNextPowerOf2(participantCount);
  return bracketSize - participantCount;
}

/**
 * Generates NCAA-style seeding order for a bracket with potential byes
 * Returns matchups where null indicates a bye (no opponent)
 * Top seeds get byes when needed, distributed evenly across bracket halves
 */
export function generateSeedingOrder(bracketSize: number, participantCount: number): (number | null)[][] {
  if (bracketSize === 2) {
    if (participantCount === 1) {
      return [[0, null]]; // Single player gets a bye
    }
    return [[0, 1]];
  }

  // Generate standard NCAA bracket positions for the given bracket size
  // This creates the classic 1v16, 8v9, 5v12, 4v13, etc. matchups
  function generateBracketPositions(size: number): number[] {
    if (size === 2) return [0, 1];
    
    const smaller = generateBracketPositions(size / 2);
    const result: number[] = [];
    
    for (const seed of smaller) {
      result.push(seed);
      result.push(size - 1 - seed);
    }
    
    return result;
  }
  
  const positions = generateBracketPositions(bracketSize);
  
  // Create matchups from positions, pairing every 2 positions
  // Positions >= participantCount become byes (null)
  const matchups: (number | null)[][] = [];
  for (let i = 0; i < positions.length; i += 2) {
    const seed1 = positions[i] < participantCount ? positions[i] : null;
    const seed2 = positions[i + 1] < participantCount ? positions[i + 1] : null;
    matchups.push([seed1, seed2]);
  }
  
  return matchups;
}

/**
 * Creates initial bracket matches for a tournament
 * Supports any number of participants >= 2 by using byes
 */
export function createInitialMatches(
  tournamentId: string,
  participants: { id: string; seed: number }[]
): Omit<Match, 'id' | 'created_at'>[] {
  const participantCount = participants.length;
  const bracketSize = getNextPowerOf2(participantCount);
  const totalRounds = Math.log2(bracketSize);
  const matches: Omit<Match, 'id' | 'created_at'>[] = [];
  
  // Sort participants by seed
  const sortedParticipants = [...participants].sort((a, b) => a.seed - b.seed);
  
  // Get first round matchups based on seeding (may include byes as null)
  const matchups = generateSeedingOrder(bracketSize, participantCount);
  
  // Track which players get byes (advance directly to round 2)
  const byeWinners: { position: number; playerId: string }[] = [];
  
  // Create first round matches
  matchups.forEach((matchup, position) => {
    const player1Index = matchup[0];
    const player2Index = matchup[1];
    
    const player1Id = player1Index !== null ? sortedParticipants[player1Index].id : null;
    const player2Id = player2Index !== null ? sortedParticipants[player2Index].id : null;
    
    // If one player has a bye, they automatically win
    const isBye = player1Id === null || player2Id === null;
    const winnerId = isBye ? (player1Id || player2Id) : null;
    
    if (isBye && winnerId) {
      byeWinners.push({ position, playerId: winnerId });
    }
    
    matches.push({
      tournament_id: tournamentId,
      round: 1,
      position,
      player1_id: player1Id,
      player2_id: player2Id,
      player1_score: isBye ? 0 : null,
      player2_score: isBye ? 0 : null,
      winner_id: winnerId,
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
  
  // Advance bye winners to round 2
  if (totalRounds >= 2) {
    byeWinners.forEach(({ position, playerId }) => {
      const { round: nextRound, position: nextPosition, slot } = getNextMatchPosition(1, position);
      const nextMatchIndex = matches.findIndex(
        m => m.round === nextRound && m.position === nextPosition
      );
      
      if (nextMatchIndex !== -1) {
        if (slot === 'player1') {
          matches[nextMatchIndex].player1_id = playerId;
        } else {
          matches[nextMatchIndex].player2_id = playerId;
        }
      }
    });
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
      return 'Final';
    case 1:
      return 'Semifinals';
    case 2:
      return 'Quarterfinals';
    case 3:
      return 'Round of 16';
    case 4:
      return 'Round of 32';
    default:
      return `Round ${round}`;
  }
}

/**
 * Gets the round name for a side bracket (before the championship)
 */
export function getSideRoundName(round: number, totalRoundsInSide: number, side: 'left' | 'right'): string {
  if (round === totalRoundsInSide) {
    return 'Semifinal';
  }
  
  const roundsFromSemis = totalRoundsInSide - round;
  
  switch (roundsFromSemis) {
    case 1:
      return 'Quarterfinal';
    case 2:
      return 'Round of 16';
    case 3:
      return 'Round of 32';
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
 * Validates that participant count is valid (>= 2)
 */
export function isValidParticipantCount(count: number): boolean {
  return count >= 2;
}

/**
 * Gets total number of rounds for a given participant count
 */
export function getTotalRounds(participantCount: number): number {
  const bracketSize = getNextPowerOf2(participantCount);
  return Math.log2(bracketSize);
}

/**
 * Gets the effective bracket size (next power of 2) for display
 */
export function getEffectiveBracketSize(participantCount: number): number {
  return getNextPowerOf2(participantCount);
}
