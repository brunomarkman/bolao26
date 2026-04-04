import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Medal, Award } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import type { BolaoParticipant } from '@/types/bolao';

type Profile = Tables<'profiles'>;

interface LeaderboardProps {
  bolaoId?: string;
  onOpenPredictions: () => void;
  onOpenBracket: () => void;
  onOpenRules: () => void;
}

interface RankedUser {
  name: string;
  total_score: number;
  user_id: string;
}

const Leaderboard = ({ bolaoId, onOpenPredictions, onOpenBracket, onOpenRules }: LeaderboardProps) => {
  const [rankings, setRankings] = useState<RankedUser[]>([]);

  useEffect(() => {
    const fetchRankings = async () => {
      if (!bolaoId) return;

      // Get participants for this bolão
      const { data: participants } = await (supabase as any)
        .from('bolao_participants')
        .select('*')
        .eq('bolao_id', bolaoId)
        .order('total_score', { ascending: false });

      // Get profiles for names
      const { data: profiles } = await supabase.from('profiles').select('*');

      if (participants && profiles) {
        const ranked = participants.map((p: BolaoParticipant) => {
          const profile = profiles.find((pr: Profile) => pr.user_id === p.user_id);
          return {
            name: profile?.name || 'Desconhecido',
            total_score: p.total_score,
            user_id: p.user_id,
          };
        });
        setRankings(ranked);
      }
    };
    fetchRankings();

    // Listen for changes
    const channel = supabase
      .channel('bolao-participants-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bolao_participants' }, () => fetchRankings())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bolaoId]);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-gold" />;
    if (index === 1) return <Medal className="w-5 h-5 text-silver" />;
    if (index === 2) return <Award className="w-5 h-5 text-bronze" />;
    return <span className="w-5 text-center text-sm font-semibold text-muted-foreground">{index + 1}</span>;
  };

  return (
    <Card className="h-full border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display tracking-wider flex items-center gap-2 text-primary">
          <Trophy className="w-4 h-4" />
          RANKING
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex flex-col">
        <ScrollArea className="h-[calc(100vh-22rem)] px-4">
          {rankings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum competidor</p>
          ) : (
            <div className="space-y-2 pb-4">
              {rankings.map((p, i) => (
                <div
                  key={p.user_id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    i === 0 ? 'bg-accent/10 border border-accent/30' :
                    i < 3 ? 'bg-muted/60 border border-border/50' :
                    'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getRankIcon(i)}
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                    </div>
                  </div>
                  <span className={`font-display text-lg font-bold ${
                    i === 0 ? 'text-accent' : 'text-foreground'
                  }`}>
                    {p.total_score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-4 border-t border-border space-y-2">
          <Button onClick={onOpenPredictions} className="w-full font-display tracking-wider">
            ⚽ LANÇAR PALPITES
          </Button>
          <Button onClick={onOpenBracket} variant="outline" className="w-full font-display tracking-wider">
            📋 TABELA DE JOGOS
          </Button>
          <Button onClick={onOpenRules} variant="outline" className="w-full font-display tracking-wider">
            📖 REGRAS DO BOLÃO
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
