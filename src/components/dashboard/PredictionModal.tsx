import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import TeamName from '@/components/TeamName';
import { useLanguage } from '@/i18n/LanguageContext';

type Match = Tables<'matches'>;
type Prediction = Tables<'predictions'>;

interface PredictionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bolaoId?: string;
  competitionId?: string;
}

interface PredictionInput { matchId: string; scoreA: string; scoreB: string; }

const PredictionModal = ({ open, onOpenChange, bolaoId, competitionId }: PredictionModalProps) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<PredictionInput[]>([]);
  const [existingPredictions, setExistingPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [lockMinutes, setLockMinutes] = useState(10);
  const dateLocale = language === 'en' ? enUS : ptBR;

  useEffect(() => {
    if (!open || !user || !competitionId) return;
    const fetchData = async () => {
      // Fetch lock minutes setting
      const { data: settingData } = await supabase.from('settings').select('value').eq('key', 'lock_minutes_before_match').maybeSingle();
      if (settingData) setLockMinutes(parseInt(settingData.value) || 10);

      const { data: phases } = await (supabase as any).from('phases').select('id').eq('is_active', true).eq('competition_id', competitionId);
      if (!phases || phases.length === 0) { toast.info(t('predModal.noActivePhase')); return; }
      const phaseIds = phases.map((p: any) => p.id);
      const { data: matchesData } = await supabase.from('matches').select('*').in('phase_id', phaseIds).eq('is_finished', false).order('match_date', { ascending: true });
      if (matchesData) {
        setMatches(matchesData);
        const { data: existingPreds } = await (supabase as any).from('predictions').select('*').eq('user_id', user.id).eq('bolao_id', bolaoId).in('match_id', matchesData.map(m => m.id));
        if (existingPreds) setExistingPredictions(existingPreds);
        setPredictions(matchesData.map(m => {
          const existing = existingPreds?.find((p: Prediction) => p.match_id === m.id);
          return { matchId: m.id, scoreA: existing ? String(existing.score_a) : '', scoreB: existing ? String(existing.score_b) : '' };
        }));
      }
    };
    fetchData();
  }, [open, user, competitionId, bolaoId]);

  const isMatchLocked = (match: Match) => {
    if (!match.match_date) return false;
    const matchTime = new Date(match.match_date).getTime();
    const now = Date.now();
    const lockMs = lockMinutes * 60 * 1000;
    return now >= matchTime - lockMs;
  };

  const handleSave = async () => {
    if (!user || !bolaoId) return;
    setLoading(true);
    try {
      for (const pred of predictions) {
        if (pred.scoreA === '' || pred.scoreB === '') continue;
        const scoreA = parseInt(pred.scoreA);
        const scoreB = parseInt(pred.scoreB);
        if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) continue;
        
        const match = matches.find(m => m.id === pred.matchId);
        if (match && isMatchLocked(match)) {
          toast.error(`${match.team_a} x ${match.team_b}: ${t('predModal.locked')}`);
          continue;
        }
        
        const existing = existingPredictions.find(p => p.match_id === pred.matchId);
        if (existing) {
          const { error } = await supabase.from('predictions').update({ score_a: scoreA, score_b: scoreB }).eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any).from('predictions').insert({ user_id: user.id, match_id: pred.matchId, score_a: scoreA, score_b: scoreB, bolao_id: bolaoId });
          if (error) throw error;
        }
      }
      toast.success(t('predModal.success'));
      onOpenChange(false);
    } catch (error: any) {
      toast.error(t('predModal.error'));
    } finally { setLoading(false); }
  };

  const updatePrediction = (matchId: string, field: 'scoreA' | 'scoreB', value: string) => {
    setPredictions(prev => prev.map(p => p.matchId === matchId ? { ...p, [field]: value } : p));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider text-primary">{t('predModal.title')}</DialogTitle>
        </DialogHeader>
        {matches.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t('predModal.noGames')}</p>
        ) : (
          <>
            <ScrollArea className="max-h-[55vh] pr-4">
              <div className="space-y-4">
                {matches.map(match => {
                  const pred = predictions.find(p => p.matchId === match.id);
                  return (
                    <div key={match.id} className={`p-4 rounded-lg border border-border/50 space-y-3 ${isMatchLocked(match) ? 'bg-muted/60 opacity-60' : 'bg-muted/30'}`}>
                      {match.match_date && (
                        <p className="text-xs text-muted-foreground text-center">
                          {format(new Date(match.match_date), "dd MMM, HH:mm", { locale: dateLocale })}
                          {isMatchLocked(match) && <span className="ml-2 text-destructive font-bold">🔒 {t('predModal.lockedLabel')}</span>}
                        </p>
                      )}
                      <div className="flex items-center justify-center gap-3">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1"><TeamName name={match.team_a || 'Time A'} side="left" /></p>
                          <Input type="number" min="0" className="w-16 text-center font-display font-bold"
                            value={pred?.scoreA ?? ''} onChange={e => updatePrediction(match.id, 'scoreA', e.target.value)} disabled={isMatchLocked(match)} />
                        </div>
                        <span className="font-display text-lg text-muted-foreground pt-4">×</span>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1"><TeamName name={match.team_b || 'Time B'} side="right" /></p>
                          <Input type="number" min="0" className="w-16 text-center font-display font-bold"
                            value={pred?.scoreB ?? ''} onChange={e => updatePrediction(match.id, 'scoreB', e.target.value)} disabled={isMatchLocked(match)} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <Button onClick={handleSave} disabled={loading} className="w-full font-display tracking-wider">
              {loading ? t('predModal.saving') : t('predModal.save')}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PredictionModal;
