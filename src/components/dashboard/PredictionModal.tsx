import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import TeamName from '@/components/TeamName';

type Match = Tables<'matches'>;
type Prediction = Tables<'predictions'>;

interface PredictionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PredictionInput {
  matchId: string;
  scoreA: string;
  scoreB: string;
}

const PredictionModal = ({ open, onOpenChange }: PredictionModalProps) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<PredictionInput[]>([]);
  const [existingPredictions, setExistingPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;

    const fetchData = async () => {
      // Get active phases
      const { data: phases } = await supabase
        .from('phases')
        .select('id')
        .eq('is_active', true);

      if (!phases || phases.length === 0) {
        toast.info('Nenhuma fase ativa no momento');
        return;
      }

      const phaseIds = phases.map(p => p.id);

      // Get unfinished matches from active phases
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .in('phase_id', phaseIds)
        .eq('is_finished', false)
        .order('match_date', { ascending: true });

      if (matchesData) {
        setMatches(matchesData);

        // Get existing predictions
        const { data: existingPreds } = await supabase
          .from('predictions')
          .select('*')
          .eq('user_id', user.id)
          .in('match_id', matchesData.map(m => m.id));

        if (existingPreds) setExistingPredictions(existingPreds);

        setPredictions(matchesData.map(m => {
          const existing = existingPreds?.find(p => p.match_id === m.id);
          return {
            matchId: m.id,
            scoreA: existing ? String(existing.score_a) : '',
            scoreB: existing ? String(existing.score_b) : '',
          };
        }));
      }
    };
    fetchData();
  }, [open, user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
      for (const pred of predictions) {
        if (pred.scoreA === '' || pred.scoreB === '') continue;
        
        const scoreA = parseInt(pred.scoreA);
        const scoreB = parseInt(pred.scoreB);
        if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) continue;

        const existing = existingPredictions.find(p => p.match_id === pred.matchId);

        if (existing) {
          await supabase
            .from('predictions')
            .update({ score_a: scoreA, score_b: scoreB })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('predictions')
            .insert({
              user_id: user.id,
              match_id: pred.matchId,
              score_a: scoreA,
              score_b: scoreB,
            });
        }
      }

      toast.success('Palpites salvos com sucesso!');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao salvar palpites');
    } finally {
      setLoading(false);
    }
  };

  const updatePrediction = (matchId: string, field: 'scoreA' | 'scoreB', value: string) => {
    setPredictions(prev => prev.map(p =>
      p.matchId === matchId ? { ...p, [field]: value } : p
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider text-primary">
            ⚽ LANÇAR PALPITES
          </DialogTitle>
        </DialogHeader>

        {matches.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum jogo disponível para palpite
          </p>
        ) : (
          <>
            <ScrollArea className="max-h-[55vh] pr-4">
              <div className="space-y-4">
                {matches.map(match => {
                  const pred = predictions.find(p => p.matchId === match.id);
                  return (
                    <div key={match.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                      <div className="text-center">
                        <p className="font-medium text-sm">
                          <TeamName name={match.team_a || '???'} side="left" /> vs <TeamName name={match.team_b || '???'} side="right" />
                        </p>
                        {match.match_date && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(match.match_date), "dd MMM, HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1"><TeamName name={match.team_a || 'Time A'} side="left" /></p>
                          <Input
                            type="number"
                            min="0"
                            className="w-16 text-center font-display font-bold"
                            value={pred?.scoreA ?? ''}
                            onChange={e => updatePrediction(match.id, 'scoreA', e.target.value)}
                          />
                        </div>
                        <span className="font-display text-lg text-muted-foreground pt-4">×</span>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1"><TeamName name={match.team_b || 'Time B'} side="right" /></p>
                          <Input
                            type="number"
                            min="0"
                            className="w-16 text-center font-display font-bold"
                            value={pred?.scoreB ?? ''}
                            onChange={e => updatePrediction(match.id, 'scoreB', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <Button onClick={handleSave} disabled={loading} className="w-full font-display tracking-wider">
              {loading ? 'SALVANDO...' : 'SALVAR PALPITES'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PredictionModal;
