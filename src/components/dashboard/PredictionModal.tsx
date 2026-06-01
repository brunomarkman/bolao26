import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Lock } from 'lucide-react';
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
  const [championOptions, setChampionOptions] = useState<string[]>([]);
  const [extraChampion, setExtraChampion] = useState('');
  const [extraGoldenBall, setExtraGoldenBall] = useState('');
  const [extraTopScorer, setExtraTopScorer] = useState('');
  const [extrasLocked, setExtrasLocked] = useState(false);
  const [extraId, setExtraId] = useState<string | null>(null);
  const [extraConfig, setExtraConfig] = useState({ q1Enabled: true, q1Points: 30, q2Enabled: true, q2Points: 25, q3Enabled: true, q3Points: 25 });
  const dateLocale = language === 'en' ? enUS : ptBR;

  useEffect(() => {
    if (!open || !user || !competitionId) return;
    const fetchData = async () => {
      // Fetch lock minutes setting
      const { data: settingData } = await supabase.from('settings').select('value').eq('key', 'lock_minutes_before_match').maybeSingle();
      if (settingData) setLockMinutes(parseInt(settingData.value) || 10);

      const { data: phases } = await (supabase as any).from('phases').select('id, number').eq('competition_id', competitionId).order('number');
      if (!phases || phases.length === 0) { toast.info(t('predModal.noActivePhase')); return; }

      // Active phase matches for predictions
      const { data: activePhases } = await (supabase as any).from('phases').select('id').eq('is_active', true).eq('competition_id', competitionId);
      const activePhaseIds = (activePhases || []).map((p: any) => p.id);
      const { data: matchesData } = activePhaseIds.length > 0
        ? await supabase.from('matches').select('*').in('phase_id', activePhaseIds).eq('is_finished', false).order('match_date', { ascending: true })
        : { data: [] as Match[] };

      if (matchesData) {
        setMatches(matchesData);
        const { data: existingPreds } = await (supabase as any).from('predictions').select('*').eq('user_id', user.id).eq('bolao_id', bolaoId).in('match_id', matchesData.map(m => m.id));
        if (existingPreds) setExistingPredictions(existingPreds);
        setPredictions(matchesData.map(m => {
          const existing = existingPreds?.find((p: Prediction) => p.match_id === m.id);
          return { matchId: m.id, scoreA: existing ? String(existing.score_a) : '', scoreB: existing ? String(existing.score_b) : '' };
        }));
      }

      // Champion options: distinct teams from group phase (number=1) of competition
      const groupPhase = phases.find((p: any) => p.number === 1);
      if (groupPhase) {
        const { data: groupMatches } = await supabase.from('matches').select('team_a, team_b').eq('phase_id', groupPhase.id);
        const teams = new Set<string>();
        (groupMatches || []).forEach((m: any) => {
          if (m.team_a) teams.add(m.team_a);
          if (m.team_b) teams.add(m.team_b);
        });
        setChampionOptions(Array.from(teams).sort());
      }

      // Check if extras are locked + load per-bolão extra config
      const { data: competition } = await (supabase as any)
        .from('competitions')
        .select('start_date')
        .eq('id', competitionId)
        .maybeSingle();
      if (competition?.start_date) {
        const startDate = new Date(`${competition.start_date}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setExtrasLocked(startDate.getTime() <= today.getTime());
      } else {
        setExtrasLocked(false);
      }

      if (bolaoId) {
        const { data: bolaoCfg } = await (supabase as any).from('boloes')
          .select('extra_champion_enabled,extra_champion_points,extra_golden_ball_enabled,extra_golden_ball_points,extra_top_scorer_enabled,extra_top_scorer_points')
          .eq('id', bolaoId).maybeSingle();
        if (bolaoCfg) {
          setExtraConfig({
            q1Enabled: bolaoCfg.extra_champion_enabled ?? true,
            q1Points: bolaoCfg.extra_champion_points ?? 30,
            q2Enabled: bolaoCfg.extra_golden_ball_enabled ?? true,
            q2Points: bolaoCfg.extra_golden_ball_points ?? 25,
            q3Enabled: bolaoCfg.extra_top_scorer_enabled ?? true,
            q3Points: bolaoCfg.extra_top_scorer_points ?? 25,
          });
        }
      }

      // Existing extra predictions for this user/bolao
      const { data: existingExtra } = await (supabase as any).from('extra_predictions').select('*').eq('user_id', user.id).eq('bolao_id', bolaoId).maybeSingle();
      if (existingExtra) {
        setExtraId(existingExtra.id);
        setExtraChampion(existingExtra.champion || '');
        setExtraGoldenBall(existingExtra.golden_ball || '');
        setExtraTopScorer(existingExtra.top_scorer || '');
      } else {
        setExtraId(null);
        setExtraChampion(''); setExtraGoldenBall(''); setExtraTopScorer('');
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
      // Save match predictions
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

      // Save extra predictions (only if not locked)
      if (!extrasLocked && (extraChampion || extraGoldenBall || extraTopScorer)) {
        const payload = {
          user_id: user.id,
          bolao_id: bolaoId,
          champion: extraConfig.q1Enabled ? (extraChampion || null) : null,
          golden_ball: extraConfig.q2Enabled ? (extraGoldenBall ? extraGoldenBall.toUpperCase().trim() : null) : null,
          top_scorer: extraConfig.q3Enabled ? (extraTopScorer ? extraTopScorer.toUpperCase().trim() : null) : null,
        };
        if (extraId) {
          const { error } = await (supabase as any).from('extra_predictions').update(payload).eq('id', extraId);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any).from('extra_predictions').insert(payload);
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

  const ActionButtons = ({ idSuffix }: { idSuffix: string }) => (
    <div className="flex gap-2" key={idSuffix}>
      <Button onClick={() => onOpenChange(false)} variant="outline" disabled={loading} className="flex-1 font-display tracking-wider">
        {t('predModal.cancel')}
      </Button>
      <Button onClick={handleSave} disabled={loading} className="flex-1 font-display tracking-wider">
        {loading ? t('predModal.saving') : t('predModal.save')}
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider text-primary">{t('predModal.title')}</DialogTitle>
        </DialogHeader>

        <ActionButtons idSuffix="top" />

        <div className={`grid grid-cols-1 ${(extraConfig.q1Enabled || extraConfig.q2Enabled || extraConfig.q3Enabled) ? 'md:grid-cols-2' : ''} gap-6`}>
          {/* LEFT: match predictions */}
          <div className="space-y-3">
            <h3 className="font-display tracking-wider text-sm text-primary">{t('predModal.matchesTitle')}</h3>
            {matches.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('predModal.noGames')}</p>
            ) : (
              <ScrollArea className="h-[55vh] pr-4">
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
            )}
          </div>

          {/* RIGHT: extra questions */}
          {(extraConfig.q1Enabled || extraConfig.q2Enabled || extraConfig.q3Enabled) && (
          <div className="space-y-4 px-[15px]">
            <div className="flex items-center justify-between">
              <h3 className="font-display tracking-wider text-sm text-primary">{t('predModal.extrasTitle')}</h3>
              {extrasLocked && <span className="flex items-center gap-1 text-xs text-destructive font-bold"><Lock className="w-3 h-3" /> {t('predModal.lockedLabel')}</span>}
            </div>
            <div className="max-h-[55vh] overflow-y-auto pr-2">
              <div className="space-y-5">
                {extrasLocked && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{t('predModal.extrasLockedMsg')}</AlertDescription>
                  </Alert>
                )}

                {extraConfig.q1Enabled && (
                  <div className="space-y-2 mx-[15px]">
                    <label className="text-xs font-medium">{t('predModal.q1')} <span className="text-primary font-bold">({extraConfig.q1Points} pts)</span></label>
                    <Select value={extraChampion} onValueChange={setExtraChampion} disabled={extrasLocked}>
                      <SelectTrigger><SelectValue placeholder={t('predModal.q1Placeholder')} /></SelectTrigger>
                      <SelectContent>
                        {championOptions.map(team => (<SelectItem key={team} value={team}>{team}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {extraConfig.q2Enabled && (
                  <div className="space-y-2 mx-[15px]">
                    <label className="text-xs font-medium">{t('predModal.q2')} <span className="text-primary font-bold">({extraConfig.q2Points} pts)</span></label>
                    <Input className="uppercase" value={extraGoldenBall} onChange={e => setExtraGoldenBall(e.target.value.toUpperCase())} disabled={extrasLocked} placeholder={t('predModal.q2Placeholder')} />
                    <Alert className="border-0 bg-transparent p-0">
                      <AlertDescription className="text-xs text-muted-foreground">{t('predModal.playerNameWarning')}</AlertDescription>
                    </Alert>
                  </div>
                )}

                {extraConfig.q3Enabled && (
                  <div className="space-y-2 mx-[15px]">
                    <label className="text-xs font-medium">{t('predModal.q3')} <span className="text-primary font-bold">({extraConfig.q3Points} pts)</span></label>
                    <Input className="uppercase" value={extraTopScorer} onChange={e => setExtraTopScorer(e.target.value.toUpperCase())} disabled={extrasLocked} placeholder={t('predModal.q3Placeholder')} />
                    <Alert className="border-0 bg-transparent p-0">
                      <AlertDescription className="text-xs text-muted-foreground">{t('predModal.playerNameWarning')}</AlertDescription>
                    </Alert>
                  </div>
                )}

                <div className="pt-2 mx-[15px]">
                  <ActionButtons idSuffix="extras" />
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        <ActionButtons idSuffix="bottom" />
      </DialogContent>
    </Dialog>
  );
};

export default PredictionModal;
