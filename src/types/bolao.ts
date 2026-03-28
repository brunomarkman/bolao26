export interface Competition {
  id: string;
  name: string;
  year: number;
  start_date: string | null;
  end_date: string | null;
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
}

export interface BolaoParticipant {
  id: string;
  bolao_id: string;
  user_id: string;
  total_score: number;
  joined_at: string;
}

export const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};
