import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TournamentForm } from '@/components/tournament-form';

export default function CreateTournamentPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back to Tournaments
            </Button>
          </Link>
        </div>
        
        <TournamentForm />
      </div>
    </main>
  );
}
