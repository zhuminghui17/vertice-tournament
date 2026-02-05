import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JoinTournament } from './join-tournament';
import type { Tournament, Participant } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

interface JoinPageProps {
  params: Promise<{ id: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
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

  // If tournament is not a draft, redirect to the tournament page
  if (tournament.status !== 'draft') {
    redirect(`/tournament/${tournament.id}`);
  }

  // Fetch participants
  const { data: participantsData } = await supabase
    .from('participants')
    .select('*')
    .eq('tournament_id', id)
    .order('seed', { ascending: true });

  const participants = (participantsData || []) as Participant[];

  return (
    <JoinTournament
      tournament={tournament}
      initialParticipants={participants}
    />
  );
}
