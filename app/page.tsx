import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import type { Tournament } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });
  
  const tournaments = data as Tournament[] | null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Vertice Tournament
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Create and manage tournament brackets for your offsite events
          </p>
          <Link href="/create">
            <Button size="lg">
              Create Tournament
            </Button>
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6">Tournaments</h2>
          
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">
                  Failed to load tournaments. Make sure your Supabase connection is configured.
                </p>
              </CardContent>
            </Card>
          )}

          {!error && tournaments && tournaments.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">
                  No tournaments yet. Create your first one!
                </p>
                <Link href="/create">
                  <Button variant="outline">Create Tournament</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {!error && tournaments && tournaments.length > 0 && (
            <div className="grid gap-4">
              {tournaments.map((tournament) => (
                <Link key={tournament.id} href={`/tournament/${tournament.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">{tournament.name}</CardTitle>
                        <Badge variant={tournament.status === 'completed' ? 'default' : 'secondary'}>
                          {tournament.status === 'completed' ? 'Completed' : 'In Progress'}
                        </Badge>
                      </div>
                      <CardDescription>
                        {tournament.game_name} • {tournament.bracket_size} players
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(tournament.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
