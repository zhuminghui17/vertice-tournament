-- Tournament Bracket App Schema

-- Tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  game_name TEXT NOT NULL,
  bracket_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  seed INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  position INTEGER NOT NULL,
  player1_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  player1_score INTEGER,
  player2_score INTEGER,
  winner_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, round, position)
);

-- Indexes for better query performance
CREATE INDEX idx_participants_tournament ON participants(tournament_id);
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_round ON matches(tournament_id, round);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Allow public access for this app (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access on tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on tournaments" ON tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on tournaments" ON tournaments FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on participants" ON participants FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on matches" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on matches" ON matches FOR UPDATE USING (true);
