'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bracket } from '@/components/bracket/bracket';
import { ScoreDialog } from '@/components/score-dialog';
import { createClient } from '@/lib/supabase/client';
import { getNextMatchPosition, getTotalRounds } from '@/lib/bracket-utils';
import type { MatchWithPlayers, Participant, Match } from '@/lib/supabase/types';

interface TournamentBracketProps {
  tournamentId: string;
  initialMatches: MatchWithPlayers[];
  bracketSize: number;
  participantCount: number;
  champion: Participant | null;
}

export function TournamentBracket({
  tournamentId,
  initialMatches,
  bracketSize,
  participantCount,
  champion: initialChampion,
}: TournamentBracketProps) {
  const [matches, setMatches] = useState<MatchWithPlayers[]>(initialMatches);
  const [selectedMatch, setSelectedMatch] = useState<MatchWithPlayers | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [champion, setChampion] = useState<Participant | null>(initialChampion);

  // Refresh matches data
  const refreshMatches = useCallback(async () => {
    const supabase = createClient();
    
    const { data: freshMatchesData } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round', { ascending: true })
      .order('position', { ascending: true });

    const { data: participantsData } = await supabase
      .from('participants')
      .select('*')
      .eq('tournament_id', tournamentId);

    const freshMatches = (freshMatchesData || []) as Match[];
    const participants = (participantsData || []) as Participant[];

    if (freshMatches.length > 0 && participants.length > 0) {
      const participantsMap = new Map<string, Participant>(participants.map(p => [p.id, p]));
      
      const enrichedMatches: MatchWithPlayers[] = freshMatches.map(match => ({
        ...match,
        player1: match.player1_id ? participantsMap.get(match.player1_id) || null : null,
        player2: match.player2_id ? participantsMap.get(match.player2_id) || null : null,
        winner: match.winner_id ? participantsMap.get(match.winner_id) || null : null,
      }));

      setMatches(enrichedMatches);

      // Check for champion
      const totalRounds = getTotalRounds(participantCount);
      const finalMatch = enrichedMatches.find(m => m.round === totalRounds);
      setChampion(finalMatch?.winner || null);
    }
  }, [tournamentId, participantCount]);

  // Set up real-time subscription
  useEffect(() => {
    const supabase = createClient();
    
    const channel = supabase
      .channel(`tournament-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          refreshMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, refreshMatches]);

  const handleMatchClick = (match: MatchWithPlayers) => {
    // Only allow clicking matches that have both players and no winner yet
    if (match.player1 && match.player2 && !match.winner_id) {
      setSelectedMatch(match);
      setDialogOpen(true);
    }
  };

  const handleScoreSubmit = async (matchId: string, player1Score: number, player2Score: number) => {
    const supabase = createClient();
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    // Determine winner
    const winnerId = player1Score > player2Score ? match.player1_id : match.player2_id;

    // Update the match with scores and winner
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        player1_score: player1Score,
        player2_score: player2Score,
        winner_id: winnerId,
      })
      .eq('id', matchId);

    if (updateError) {
      throw updateError;
    }

    // Advance winner to next match (if not the final)
    const totalRounds = getTotalRounds(participantCount);
    if (match.round < totalRounds) {
      const { round: nextRound, position: nextPosition, slot } = getNextMatchPosition(
        match.round,
        match.position
      );

      // Find the next match
      const nextMatch = matches.find(
        m => m.round === nextRound && m.position === nextPosition
      );

      if (nextMatch) {
        const updateData = slot === 'player1'
          ? { player1_id: winnerId }
          : { player2_id: winnerId };

        await supabase
          .from('matches')
          .update(updateData)
          .eq('id', nextMatch.id);
      }
    } else {
      // This was the final match, mark tournament as completed
      await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', tournamentId);
    }

    // Refresh to get updated data
    await refreshMatches();
  };

  return (
    <>
      <Bracket
        matches={matches}
        bracketSize={bracketSize}
        onMatchClick={handleMatchClick}
        champion={champion}
      />
      
      <ScoreDialog
        match={selectedMatch}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleScoreSubmit}
      />

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Click on a match to enter scores. The winner will automatically advance to the next round.
      </div>
    </>
  );
}
