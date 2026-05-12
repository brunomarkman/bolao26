export const COMPETITION_FORMATS = [
  'Mata-mata',
  'Mata-mata ida/volta',
  'Grupo + Mata-mata',
  'Grupo ida/volta + Mata-mata',
  'Pontos corridos ida/volta',
] as const;

export type CompetitionFormat = typeof COMPETITION_FORMATS[number];

export interface Competition {
  id: string;
  name: string;
  year: number;
  start_date: string | null;
  end_date: string | null;
  total_clubs: number | null;
  format: string | null;
  fee?: number;
  created_at: string;
}

export interface Bolao {
  id: string;
  number: number;
  nickname: string;
  competition_id: string;
  created_by: string;
  bet_value: number;
  status: 'waiting' | 'active' | 'finished' | 'cancelled';
  invite_code: string;
  created_at: string;
  updated_at: string;
  extra_champion_enabled?: boolean;
  extra_champion_points?: number;
  extra_golden_ball_enabled?: boolean;
  extra_golden_ball_points?: number;
  extra_top_scorer_enabled?: boolean;
  extra_top_scorer_points?: number;
}

export interface BolaoParticipant {
  id: string;
  bolao_id: string;
  user_id: string;
  total_score: number;
  joined_at: string;
  is_active?: boolean;
}

export const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};
