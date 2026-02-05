export type Tournament = {
  id: string;
  name: string;
  game_name: string;
  bracket_size: number;
  status: 'active' | 'completed';
  created_at: string;
};

export type Participant = {
  id: string;
  tournament_id: string;
  name: string;
  seed: number;
  created_at: string;
};

export type Match = {
  id: string;
  tournament_id: string;
  round: number;
  position: number;
  player1_id: string | null;
  player2_id: string | null;
  player1_score: number | null;
  player2_score: number | null;
  winner_id: string | null;
  created_at: string;
};

// Extended types with joined data
export type MatchWithPlayers = Match & {
  player1: Participant | null;
  player2: Participant | null;
  winner: Participant | null;
};

export type TournamentWithDetails = Tournament & {
  participants: Participant[];
  matches: MatchWithPlayers[];
};

export type Database = {
  public: {
    Tables: {
      tournaments: {
        Row: Tournament;
        Insert: Omit<Tournament, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Tournament, 'id'>>;
      };
      participants: {
        Row: Participant;
        Insert: Omit<Participant, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Participant, 'id'>>;
      };
      matches: {
        Row: Match;
        Insert: Omit<Match, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Match, 'id'>>;
      };
    };
  };
};
