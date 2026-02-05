import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { TournamentBracket } from './tournament-bracket';
import { getEffectiveBracketSize, getTotalRounds } from '@/lib/bracket-utils';
import type { MatchWithPlayers, Participant, Match, Tournament } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

interface TournamentPageProps {
  params: Promise<{ id: string }>;
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch tournament
  const { data: tournamentData, error: tournamentError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  const tournament = tournamentData as Tournament | null;

  if (tournamentError || !tournament) {
    notFound();
  }

  // Fetch participants
  const { data: participantsData } = await supabase
    .from('participants')
    .select('*')
    .eq('tournament_id', id)
    .order('seed', { ascending: true });

  const participants = (participantsData || []) as Participant[];

  // Fetch matches
  const { data: matchesData } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', id)
    .order('round', { ascending: true })
    .order('position', { ascending: true });

  const matches = (matchesData || []) as Match[];

  // Create a map of participants for easy lookup
  const participantsMap = new Map<string, Participant>(
    participants.map(p => [p.id, p])
  );

  // Enrich matches with player data
  const enrichedMatches: MatchWithPlayers[] = matches.map(match => ({
    ...match,
    player1: match.player1_id ? participantsMap.get(match.player1_id) || null : null,
    player2: match.player2_id ? participantsMap.get(match.player2_id) || null : null,
    winner: match.winner_id ? participantsMap.get(match.winner_id) || null : null,
  }));

  // Calculate effective bracket size (next power of 2)
  const effectiveBracketSize = getEffectiveBracketSize(tournament.bracket_size);
  const totalRounds = getTotalRounds(tournament.bracket_size);
  
  // Find the champion (winner of the final match)
  const finalMatch = enrichedMatches.find(m => m.round === totalRounds);
  const champion: Participant | null = finalMatch?.winner || null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back to Tournaments
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            <Badge variant={tournament.status === 'completed' ? 'default' : 'secondary'}>
              {tournament.status === 'completed' ? 'Completed' : 'In Progress'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {tournament.game_name} • {tournament.bracket_size} players
          </p>
        </div>

        <TournamentBracket
          tournamentId={tournament.id}
          initialMatches={enrichedMatches}
          bracketSize={effectiveBracketSize}
          participantCount={tournament.bracket_size}
          champion={champion}
        />
      </div>
    </main>
  );
}
