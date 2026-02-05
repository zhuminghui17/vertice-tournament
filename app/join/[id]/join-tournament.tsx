'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { createInitialMatches, isValidParticipantCount, getByeCount, getNextPowerOf2 } from '@/lib/bracket-utils';
import type { Tournament, Participant } from '@/lib/supabase/types';

interface JoinTournamentProps {
  tournament: Tournament;
  initialParticipants: Participant[];
}

export function JoinTournament({ tournament, initialParticipants }: JoinTournamentProps) {
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [newName, setNewName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [justJoined, setJustJoined] = useState<string | null>(null);

  // Refresh participants
  const refreshParticipants = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('seed', { ascending: true });
    
    if (data) {
      setParticipants(data as Participant[]);
    }
  }, [tournament.id]);

  // Set up real-time subscription
  useEffect(() => {
    const supabase = createClient();
    
    const channel = supabase
      .channel(`join-${tournament.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `tournament_id=eq.${tournament.id}`,
        },
        () => {
          refreshParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournament.id, refreshParticipants]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName.trim()) {
      setError('Please enter your name');
      return;
    }

    // Check if name already exists
    const nameExists = participants.some(
      p => p.name.toLowerCase() === newName.trim().toLowerCase()
    );
    if (nameExists) {
      setError('This name is already taken');
      return;
    }

    setError(null);
    setIsJoining(true);

    try {
      const supabase = createClient();
      
      // Add participant with next seed number
      const nextSeed = participants.length + 1;
      
      const { data, error: insertError } = await supabase
        .from('participants')
        .insert({
          tournament_id: tournament.id,
          name: newName.trim(),
          seed: nextSeed,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Highlight the just-joined participant
      if (data) {
        setJustJoined(data.id);
        setTimeout(() => setJustJoined(null), 2000);
      }

      setNewName('');
      await refreshParticipants();
    } catch (err) {
      console.error('Error joining tournament:', err);
      setError('Failed to join. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      const supabase = createClient();
      
      await supabase
        .from('participants')
        .delete()
        .eq('id', participantId);

      await refreshParticipants();
    } catch (err) {
      console.error('Error removing participant:', err);
    }
  };

  const handleStartTournament = async () => {
    if (!isValidParticipantCount(participants.length)) {
      setError('At least 2 participants are required to start');
      return;
    }

    setError(null);
    setIsStarting(true);

    try {
      const supabase = createClient();

      // Randomize seeds - Fisher-Yates shuffle
      const shuffledParticipants = [...participants];
      for (let i = shuffledParticipants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledParticipants[i], shuffledParticipants[j]] = [shuffledParticipants[j], shuffledParticipants[i]];
      }

      // Update participant seeds in database
      const seedUpdates = shuffledParticipants.map((p, index) => 
        supabase
          .from('participants')
          .update({ seed: index + 1 })
          .eq('id', p.id)
      );
      await Promise.all(seedUpdates);

      // Update tournament to active
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({ 
          status: 'active',
          bracket_size: participants.length 
        })
        .eq('id', tournament.id);

      if (updateError) throw updateError;

      // Create initial matches with randomized seeds
      const matchesData = createInitialMatches(
        tournament.id,
        shuffledParticipants.map((p, index) => ({ id: p.id, seed: index + 1 }))
      );

      const { error: matchesError } = await supabase
        .from('matches')
        .insert(matchesData);

      if (matchesError) throw matchesError;

      // Redirect to tournament page
      router.push(`/tournament/${tournament.id}`);
    } catch (err) {
      console.error('Error starting tournament:', err);
      setError('Failed to start tournament. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const copyLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filledCount = participants.length;
  const byeCount = filledCount >= 2 ? getByeCount(filledCount) : 0;
  const effectiveBracketSize = filledCount >= 2 ? getNextPowerOf2(filledCount) : 0;
  const totalRounds = effectiveBracketSize > 0 ? Math.log2(effectiveBracketSize) : 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12 relative">
        <div className="max-w-2xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-8 gap-2 -ml-2 text-muted-foreground hover:text-foreground group">
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Tournaments
            </Button>
          </Link>
          
          {/* Header */}
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{tournament.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    Waiting for players
                  </Badge>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground flex items-center gap-2 ml-14">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {tournament.game_name}
            </p>
          </div>

          {/* Share Link Card */}
          <Card className="mb-6 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 ring-2 ring-primary/20">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">Share this link with friends</p>
                    <p className="text-sm text-muted-foreground truncate">
                      Anyone with the link can join the tournament
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={copyLink} 
                  variant={copied ? "default" : "secondary"} 
                  size="sm" 
                  className={`shrink-0 gap-2 transition-all ${copied ? 'bg-green-500 hover:bg-green-500 text-white' : ''}`}
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-xl shadow-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <CardContent className="p-6 md:p-8">
              {/* Join Form */}
              <form onSubmit={handleJoin} className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <Label className="text-base font-semibold">Join the tournament</Label>
                </div>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter your name to join..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-12 text-base px-4"
                  />
                  <Button 
                    type="submit" 
                    disabled={isJoining} 
                    className="shrink-0 h-12 px-6 font-semibold shadow-lg shadow-primary/20"
                  >
                    {isJoining ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Join
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-4 text-sm text-muted-foreground font-medium">Players</span>
                </div>
              </div>

              {/* Participants List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm text-muted-foreground">
                      Seeds randomized when starting
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                    {filledCount} player{filledCount !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {/* Bracket Preview Info */}
                {filledCount >= 2 && (
                  <div className="rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 p-4 animate-in fade-in duration-300">
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{totalRounds} round{totalRounds !== 1 ? 's' : ''}</p>
                          <p className="text-muted-foreground text-xs">to championship</p>
                        </div>
                      </div>
                      {byeCount > 0 && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{byeCount} bye{byeCount !== 1 ? 's' : ''}</p>
                            <p className="text-muted-foreground text-xs">top seeds advance</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Player List */}
                {filledCount === 0 ? (
                  <div className="text-center py-12 animate-in fade-in duration-300">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                      <svg className="w-8 h-8 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-muted-foreground mb-1">No players yet</p>
                    <p className="text-sm text-muted-foreground/70">Be the first to join the tournament!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {participants.map((participant, index) => (
                      <div 
                        key={participant.id} 
                        className={`flex gap-3 items-center group rounded-xl px-4 py-3 transition-all duration-300 ${
                          justJoined === participant.id 
                            ? 'bg-green-500/10 ring-2 ring-green-500/30 animate-in fade-in slide-in-from-left-4' 
                            : 'bg-muted/30 hover:bg-muted/50'
                        }`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          justJoined === participant.id
                            ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold truncate block">{participant.name}</span>
                          {justJoined === participant.id && (
                            <span className="text-xs text-green-600 dark:text-green-400">Just joined!</span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-all h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-6 rounded-xl bg-destructive/10 border border-destructive/20 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3 text-destructive">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Start Tournament Button */}
              <div className="mt-8 pt-6 border-t border-border/60">
                <Button 
                  onClick={handleStartTournament}
                  className="w-full h-14 text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all"
                  disabled={isStarting || filledCount < 2}
                >
                  {isStarting ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Starting Tournament...
                    </span>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Start Tournament
                    </>
                  )}
                </Button>
                {filledCount < 2 && (
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Need at least 2 players to start the tournament
                  </p>
                )}
                {filledCount >= 2 && (
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Ready to go! Click above to generate the bracket
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
