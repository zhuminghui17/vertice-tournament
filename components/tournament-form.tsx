'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { createInitialMatches, isValidParticipantCount, getByeCount, getNextPowerOf2 } from '@/lib/bracket-utils';

export function TournamentForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [gameName, setGameName] = useState('');
  const [participants, setParticipants] = useState<string[]>(['', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addParticipant = () => {
    setParticipants([...participants, '']);
  };

  const removeParticipant = (index: number) => {
    if (participants.length <= 2) return;
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, value: string) => {
    const updated = [...participants];
    updated[index] = value;
    setParticipants(updated);
  };

  const validateForm = (): string | null => {
    if (!name.trim()) return 'Tournament name is required';
    if (!gameName.trim()) return 'Game name is required';
    
    const filledParticipants = participants.filter(p => p.trim());
    if (!isValidParticipantCount(filledParticipants.length)) {
      return 'At least 2 participants are required';
    }
    
    const uniqueNames = new Set(filledParticipants.map(p => p.trim().toLowerCase()));
    if (uniqueNames.size !== filledParticipants.length) {
      return 'All participant names must be unique';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const filledParticipants = participants.filter(p => p.trim());
      
      // Create tournament
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name: name.trim(),
          game_name: gameName.trim(),
          bracket_size: filledParticipants.length,
          status: 'active',
        })
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      // Create participants with seeds
      const participantData = filledParticipants.map((pName, index) => ({
        tournament_id: tournament.id,
        name: pName.trim(),
        seed: index + 1,
      }));

      const { data: createdParticipants, error: participantsError } = await supabase
        .from('participants')
        .insert(participantData)
        .select();

      if (participantsError) throw participantsError;

      // Create initial matches
      const matchesData = createInitialMatches(
        tournament.id,
        createdParticipants.map(p => ({ id: p.id, seed: p.seed }))
      );

      const { error: matchesError } = await supabase
        .from('matches')
        .insert(matchesData);

      if (matchesError) throw matchesError;

      // Redirect to tournament page
      router.push(`/tournament/${tournament.id}`);
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError('Failed to create tournament. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filledCount = participants.filter(p => p.trim()).length;
  const byeCount = filledCount >= 2 ? getByeCount(filledCount) : 0;
  const effectiveBracketSize = filledCount >= 2 ? getNextPowerOf2(filledCount) : 0;
  const totalRounds = effectiveBracketSize > 0 ? Math.log2(effectiveBracketSize) : 0;

  return (
    <Card className="border-border/50 shadow-xl shadow-primary/5">
      <CardContent className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Tournament Details */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Tournament Name</Label>
              <Input
                id="name"
                placeholder="e.g., Vertice Offsite Championship"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="game" className="text-sm font-medium">Game / Activity</Label>
              <Input
                id="game"
                placeholder="e.g., Ping Pong, Pool, Chess"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          {/* Participants Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Participants</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Add players in seed order (best player first)
                </p>
              </div>
              <Badge variant="secondary" className="font-mono">
                {filledCount} player{filledCount !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            {/* Bracket Preview Info */}
            {filledCount >= 2 && (
              <div className="rounded-lg bg-muted/50 border border-border/50 p-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">{totalRounds} round{totalRounds !== 1 ? 's' : ''}</p>
                      <p className="text-muted-foreground text-xs">to championship</p>
                    </div>
                  </div>
                  {byeCount > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">{byeCount} bye{byeCount !== 1 ? 's' : ''}</p>
                        <p className="text-muted-foreground text-xs">top seeds advance</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Participant List */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {participants.map((participant, index) => (
                <div key={index} className="flex gap-3 items-center group">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                    {index + 1}
                  </div>
                  <Input
                    placeholder={`Player ${index + 1}`}
                    value={participant}
                    onChange={(e) => updateParticipant(index, e.target.value)}
                    className="h-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeParticipant(index)}
                    disabled={participants.length <= 2}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addParticipant}
              className="w-full h-10 border-dashed gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Player
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25"
            disabled={isSubmitting || filledCount < 2}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating Tournament...
              </span>
            ) : (
              'Create Tournament'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
