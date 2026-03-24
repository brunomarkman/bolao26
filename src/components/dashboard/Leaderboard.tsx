import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Award } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface LeaderboardProps {
  onOpenPredictions: () => void;
}

const Leaderboard = ({ onOpenPredictions }: LeaderboardProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('total_score', { ascending: false });
      if (data) setProfiles(data);
    };
    fetch();

    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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
        <ScrollArea className="h-[calc(100vh-20rem)] px-4">
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum competidor</p>
          ) : (
            <div className="space-y-2 pb-4">
              {profiles.map((p, i) => (
                <div
                  key={p.id}
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
        <div className="p-4 border-t border-border">
          <Button onClick={onOpenPredictions} className="w-full font-display tracking-wider">
            ⚽ LANÇAR PALPITES
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
