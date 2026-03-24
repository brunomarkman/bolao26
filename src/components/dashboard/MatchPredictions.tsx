import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import TeamName from '@/components/TeamName';

type Match = Tables<'matches'>;
type Prediction = Tables<'predictions'>;
type Profile = Tables<'profiles'>;

const MatchPredictions = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [predictions, setPredictions] = useState<(Prediction & { profile?: Profile })[]>([]);

  useEffect(() => {
    const fetchMatches = async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('is_finished', false)
        .order('match_date', { ascending: true });
      
      if (data) {
        setMatches(data);
        if (data.length > 0 && !selectedMatch) {
          setSelectedMatch(data[0].id);
        }
      }
    };
    fetchMatches();
  }, []);

  useEffect(() => {
    if (!selectedMatch) return;
    const fetchPredictions = async () => {
      const { data: preds } = await supabase
        .from('predictions')
        .select('*')
        .eq('match_id', selectedMatch);
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

      if (preds && profiles) {
        const merged = preds.map(p => ({
          ...p,
          profile: profiles.find(pr => pr.user_id === p.user_id),
        }));
        setPredictions(merged);
      }
    };
    fetchPredictions();
  }, [selectedMatch]);

  const currentMatch = matches.find(m => m.id === selectedMatch);

  return (
    <Card className="h-full border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display tracking-wider flex items-center gap-2 text-primary">
          <Eye className="w-4 h-4" />
          CONFIRA PALPITES
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedMatch} onValueChange={setSelectedMatch}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um jogo" />
          </SelectTrigger>
          <SelectContent>
            {matches.map(m => (
              <SelectItem key={m.id} value={m.id}>
                <span className="inline-flex items-center gap-1">
                  <TeamName name={m.team_a || '???'} side="left" /> vs <TeamName name={m.team_b || '???'} side="right" />
                </span>
                {m.match_date && ` - ${format(new Date(m.match_date), 'dd/MM HH:mm')}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {matches.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum jogo pendente</p>
        )}

        {currentMatch && (
          <div className="text-center py-2">
            <p className="font-display text-lg font-bold">
              <TeamName name={currentMatch.team_a || '???'} side="left" /> vs <TeamName name={currentMatch.team_b || '???'} side="right" />
            </p>
            {currentMatch.match_date && (
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(currentMatch.match_date), "dd MMM, HH:mm", { locale: ptBR })}
                {currentMatch.location && ` • ${currentMatch.location}`}
              </p>
            )}
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-26rem)]">
          {predictions.length === 0 && selectedMatch ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum palpite registrado</p>
          ) : (
            <div className="space-y-2">
              {predictions.map(pred => (
                <div key={pred.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-sm font-medium">{pred.profile?.name || 'Competidor'}</span>
                  <span className="font-display font-bold text-primary">
                    {pred.score_a} × {pred.score_b}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default MatchPredictions;
