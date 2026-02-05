import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { TournamentBracket } from './tournament-bracket';
import { getEffectiveBracketSize, getTotalRounds, getByeCount } from '@/lib/bracket-utils';
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
  const byeCount = getByeCount(tournament.bracket_size);
  
  // Find the champion (winner of the final match)
  const finalMatch = enrichedMatches.find(m => m.round === totalRounds);
  const champion: Participant | null = finalMatch?.winner || null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6 gap-2 -ml-2 text-muted-foreground hover:text-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Tournaments
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold">{tournament.name}</h1>
                <Badge 
                  variant={tournament.status === 'completed' ? 'default' : 'secondary'}
                  className={tournament.status === 'completed' 
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' 
                    : 'bg-primary/10 text-primary border-primary/20'
                  }
                >
                  {tournament.status === 'completed' ? 'Completed' : 'In Progress'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {tournament.game_name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {tournament.bracket_size} players
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {totalRounds} rounds
                </span>
                {byeCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-blue-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    {byeCount} byes
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bracket */}
        <div className="bg-card/50 border border-border/50 rounded-2xl p-2 md:p-4">
        <TournamentBracket
          tournamentId={tournament.id}
          initialMatches={enrichedMatches}
          bracketSize={effectiveBracketSize}
          participantCount={tournament.bracket_size}
          champion={champion}
          isCompleted={tournament.status === 'completed'}
        />
        </div>

        {/* Help text */}
        {tournament.status !== 'completed' && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Click on a match to enter scores. The winner will automatically advance to the next round.
          </p>
        )}
      </div>
    </main>
  );
}
