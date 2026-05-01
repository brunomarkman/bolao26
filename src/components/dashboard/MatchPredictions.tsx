import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Eye, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import TeamName from '@/components/TeamName';
import { useLanguage } from '@/i18n/LanguageContext';

type Match = Tables<'matches'>;
type Prediction = Tables<'predictions'>;
type Profile = Tables<'profiles'>;

interface MatchPredictionsProps {
  bolaoId?: string;
  competitionId?: string;
}

const MatchPredictions = ({ bolaoId, competitionId }: MatchPredictionsProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [predictions, setPredictions] = useState<(Prediction & { profile?: Profile })[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const { t, language } = useLanguage();

  const handleRefresh = () => setRefreshKey(k => k + 1);
  const dateLocale = language === 'en' ? enUS : ptBR;

  useEffect(() => {
    if (!competitionId) return;
    const fetchMatches = async () => {
      const { data: phases } = await (supabase as any).from('phases').select('id').eq('competition_id', competitionId).eq('is_active', true);
      if (!phases || phases.length === 0) { setMatches([]); return; }
      const phaseIds = phases.map((p: any) => p.id);
      const { data } = await supabase.from('matches').select('*').in('phase_id', phaseIds).eq('is_finished', false).order('match_date', { ascending: true });
      if (data) {
        setMatches(data);
        if (data.length > 0 && !selectedMatch) setSelectedMatch(data[0].id);
      }
    };
    fetchMatches();
  }, [competitionId, refreshKey]);

  useEffect(() => {
    if (!selectedMatch || !bolaoId) return;
    const fetchPredictions = async () => {
      const { data: preds } = await (supabase as any).from('predictions').select('*').eq('match_id', selectedMatch).eq('bolao_id', bolaoId);
      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: parts } = await (supabase as any).from('bolao_participants').select('user_id,is_active').eq('bolao_id', bolaoId);
      const activeIds = new Set((parts || []).filter((p: any) => p.is_active !== false).map((p: any) => p.user_id));
      if (preds && profiles) {
        const merged = preds
          .filter((p: Prediction) => activeIds.has(p.user_id))
          .map((p: Prediction) => ({ ...p, profile: profiles.find((pr: Profile) => pr.user_id === p.user_id) }));
        setPredictions(merged);
      }
    };
    fetchPredictions();
  }, [selectedMatch, bolaoId, refreshKey]);

  const currentMatch = matches.find(m => m.id === selectedMatch);

  return (
    <Card className="h-full border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display tracking-wider flex items-center gap-2 text-primary">
          <Eye className="w-4 h-4" /> {t('predictions.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleRefresh} variant="outline" size="sm" className="w-full font-display tracking-wider gap-2">
          <RefreshCw className="w-4 h-4" /> {t('predictions.refresh')}
        </Button>
        <Select value={selectedMatch} onValueChange={setSelectedMatch}>
          <SelectTrigger><SelectValue placeholder={t('predictions.selectMatch')} /></SelectTrigger>
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

        {matches.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{t('predictions.noPending')}</p>}


        <ScrollArea className="h-[calc((100vh-26rem)*0.9)]">
          {predictions.length === 0 && selectedMatch ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('predictions.noRegistered')}</p>
          ) : (
            <div className="space-y-2">
              {predictions.map(pred => (
                <div key={pred.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-sm font-medium">{pred.profile?.name || t('predictions.competitor')}</span>
                  <span className="font-display font-bold text-primary">{pred.score_a} × {pred.score_b}</span>
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
