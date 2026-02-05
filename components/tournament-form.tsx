'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { createInitialMatches, isValidBracketSize } from '@/lib/bracket-utils';

export function TournamentForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [gameName, setGameName] = useState('');
  const [participants, setParticipants] = useState<string[]>(['', '']);
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
    if (filledParticipants.length < 2) return 'At least 2 participants are required';
    
    if (!isValidBracketSize(filledParticipants.length)) {
      return `Number of participants must be a power of 2 (2, 4, 8, 16, 32, etc.). You have ${filledParticipants.length}.`;
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
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(Math.max(filledCount, 2))));
  const needMore = nextPowerOf2 - filledCount;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Tournament</CardTitle>
        <CardDescription>
          Set up a new tournament bracket. Number of participants must be a power of 2.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Tournament Name</Label>
            <Input
              id="name"
              placeholder="Vertice Offsite 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="game">Game Name</Label>
            <Input
              id="game"
              placeholder="Ping Pong"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Participants ({filledCount})</Label>
              {filledCount > 0 && !isValidBracketSize(filledCount) && (
                <span className="text-sm text-muted-foreground">
                  Add {needMore} more for a valid bracket
                </span>
              )}
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {participants.map((participant, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <span className="text-sm text-muted-foreground w-6">
                    {index + 1}.
                  </span>
                  <Input
                    placeholder={`Player ${index + 1}`}
                    value={participant}
                    onChange={(e) => updateParticipant(index, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeParticipant(index)}
                    disabled={participants.length <= 2}
                    className="shrink-0"
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addParticipant}
              className="w-full"
            >
              + Add Participant
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Tournament'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
