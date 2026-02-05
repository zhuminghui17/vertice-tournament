# Vertice Tournament

A tournament bracket web app for Vertice offsite events. Create NCAA-style brackets, enter participant names, track scores, and crown champions.

## Features

- Create tournaments with any power-of-2 bracket size (4, 8, 16, 32, etc.)
- NCAA-style seeding (1 vs 16, 8 vs 9, etc.)
- Real-time bracket updates
- Score entry with automatic winner advancement
- Champion celebration display

## Tech Stack

- **Next.js 14** - React framework with App Router
- **shadcn/ui** - UI component library
- **Tailwind CSS** - Styling
- **Supabase** - Database and real-time subscriptions
- **TypeScript** - Type safety

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the migration file located at `supabase/migrations/001_initial.sql`
4. Enable Realtime for the `matches` table:
   - Go to Database → Replication
   - Enable replication for the `matches` table

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your Supabase project settings under API.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Usage

1. **Create a Tournament**: Click "Create Tournament", enter a name, game name, and participant names
2. **View Bracket**: After creation, you'll see the NCAA-style bracket with all matchups
3. **Enter Scores**: Click on any match with two players to enter scores
4. **Advance Winners**: Winners automatically advance to the next round
5. **Crown Champion**: When the final match is complete, the champion is displayed

## Project Structure

```
vertice-tournament/
├── app/
│   ├── page.tsx              # Home - tournament list
│   ├── create/page.tsx       # Create tournament form
│   └── tournament/[id]/      # Tournament bracket view
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── bracket/              # Bracket visualization
│   ├── tournament-form.tsx   # Tournament creation
│   └── score-dialog.tsx      # Score entry modal
├── lib/
│   ├── supabase/             # Supabase clients
│   └── bracket-utils.ts      # Bracket generation logic
└── supabase/
    └── migrations/           # Database schema
```
