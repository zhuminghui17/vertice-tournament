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
  const [isSavingDraft, setIsSavingDraft] = useState(false);
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

  const validateBasicForm = (): string | null => {
    if (!name.trim()) return 'Tournament name is required';
    if (!gameName.trim()) return 'Game name is required';
    return null;
  };

  const validateFullForm = (): string | null => {
    const basicError = validateBasicForm();
    if (basicError) return basicError;
    
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

  const handleSaveDraft = async () => {
    const validationError = validateBasicForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSavingDraft(true);

    try {
      const supabase = createClient();
      const filledParticipants = participants.filter(p => p.trim());
      
      // Create tournament as draft
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name: name.trim(),
          game_name: gameName.trim(),
          bracket_size: filledParticipants.length || 0,
          status: 'draft',
        })
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      // Create participants with seeds (if any)
      if (filledParticipants.length > 0) {
        const participantData = filledParticipants.map((pName, index) => ({
          tournament_id: tournament.id,
          name: pName.trim(),
          seed: index + 1,
        }));

        const { error: participantsError } = await supabase
          .from('participants')
          .insert(participantData);

        if (participantsError) throw participantsError;
      }

      // Redirect to join page
      router.push(`/join/${tournament.id}`);
    } catch (err) {
      console.error('Error saving draft:', err);
      setError('Failed to save draft. Please try again.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateFullForm();
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

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button 
              type="submit" 
              className="w-full h-14 text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all"
              disabled={isSubmitting || isSavingDraft || filledCount < 2}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating Tournament...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Tournament Now
                </>
              )}
            </Button>
            
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-4 text-sm text-muted-foreground font-medium">or invite others first</span>
              </div>
            </div>
            
            {/* Draft Card */}
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/10 p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Save as draft & share</p>
                  <p className="text-sm text-muted-foreground">
                    Get a link to share with friends so they can add themselves before you start
                  </p>
                </div>
              </div>
              <Button 
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                className="w-full h-11 gap-2 border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50"
                disabled={isSubmitting || isSavingDraft}
              >
                {isSavingDraft ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving Draft...
                  </span>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Draft & Get Shareable Link
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
