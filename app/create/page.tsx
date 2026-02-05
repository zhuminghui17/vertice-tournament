import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TournamentForm } from '@/components/tournament-form';

export default function CreateTournamentPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-8 gap-2 -ml-2 text-muted-foreground hover:text-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Tournaments
            </Button>
          </Link>
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create Tournament</h1>
            <p className="text-muted-foreground">
              Set up a new bracket for your competition
            </p>
          </div>
          
          <TournamentForm />
        </div>
      </div>
    </main>
  );
}
