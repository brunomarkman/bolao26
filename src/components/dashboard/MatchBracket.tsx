import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import TeamName from '@/components/TeamName';
import type { Tables } from '@/integrations/supabase/types';
import { useLanguage } from '@/i18n/LanguageContext';

type Phase = Tables<'phases'>;
type Match = Tables<'matches'>;

interface MatchBracketProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitionId?: string;
}

const MatchBracket = ({ open, onOpenChange, competitionId }: MatchBracketProps) => {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedPhase, setSelectedPhase] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    if (!open || !competitionId) return;
    const fetch = async () => {
      const { data: phasesData } = await (supabase as any).from('phases').select('*').eq('competition_id', competitionId).order('number');
      if (phasesData) {
        setPhases(phasesData);
        if (!selectedPhase && phasesData.length > 0) setSelectedPhase(phasesData[0].id);
      }
      if (phasesData && phasesData.length > 0) {
        const phaseIds = phasesData.map((p: Phase) => p.id);
        const { data: matchesData } = await supabase.from('matches').select('*').in('phase_id', phaseIds).order('match_date', { ascending: true });
        if (matchesData) setMatches(matchesData);
      }
    };
    fetch();
  }, [open, competitionId]);

  const currentPhase = phases.find(p => p.id === selectedPhase);
  const phaseMatches = matches.filter(m => m.phase_id === selectedPhase);
  const isGroupPhase = currentPhase?.number === 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider text-primary">{t('bracket.title')}</DialogTitle>
        </DialogHeader>
        <Select value={selectedPhase} onValueChange={setSelectedPhase}>
          <SelectTrigger><SelectValue placeholder={t('bracket.selectPhase')} /></SelectTrigger>
          <SelectContent>
            {phases.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <ScrollArea className="max-h-[65vh]">
          {isGroupPhase ? <GroupView matches={phaseMatches} /> : <KnockoutView matches={phaseMatches} phaseName={currentPhase?.name ?? ''} />}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

const GroupView = ({ matches }: { matches: Match[] }) => {
  const { t } = useLanguage();
  const groups = new Map<string, Match[]>();
  matches.forEach(m => {
    const g = m.group_name || t('bracket.noGroup');
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(m);
  });
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  if (sortedGroups.length === 0) return <p className="text-center text-muted-foreground py-8">{t('bracket.noMatches')}</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
      {sortedGroups.map(([groupName, groupMatches]) => (
        <div key={groupName} className="rounded-lg border border-primary/20 bg-card/80 overflow-hidden">
          <div className="bg-primary/10 px-3 py-2 text-center">
            <span className="font-display text-sm font-bold tracking-wider text-primary">{t('bracket.group')} {groupName}</span>
          </div>
          <div className="p-2 space-y-1">
            {groupMatches.map(m => (
              <div key={m.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/30 text-xs">
                <span className="flex-1 text-right truncate"><TeamName name={m.team_a} side="left" /></span>
                <span className="mx-2 font-display font-bold text-primary min-w-[40px] text-center">
                  {m.is_finished ? `${m.score_a} × ${m.score_b}` : '× '}
                </span>
                <span className="flex-1 truncate"><TeamName name={m.team_b} side="right" /></span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const KnockoutView = ({ matches, phaseName }: { matches: Match[]; phaseName: string }) => {
  const { t } = useLanguage();
  if (matches.length === 0) return <p className="text-center text-muted-foreground py-8">{t('bracket.noMatches')}</p>;
  return (
    <div className="p-1">
      <div className="space-y-3">
        {matches.map((m, i) => (
          <div key={m.id} className="relative">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-display font-bold text-primary shrink-0">{i + 1}</div>
              <div className="flex-1 rounded-lg border border-primary/20 bg-card/80 overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_1fr]">
                  <div className={`p-3 flex items-center justify-end gap-2 ${m.is_finished && m.score_a !== null && m.score_b !== null && m.score_a > m.score_b ? 'bg-primary/10' : ''}`}>
                    <span className="text-sm font-medium truncate"><TeamName name={m.team_a} side="left" /></span>
                    {m.is_finished && <span className="font-display font-bold text-lg text-primary">{m.score_a}</span>}
                  </div>
                  <div className="flex items-center justify-center px-2 bg-muted/30">
                    <span className="font-display text-xs text-muted-foreground">VS</span>
                  </div>
                  <div className={`p-3 flex items-center gap-2 ${m.is_finished && m.score_a !== null && m.score_b !== null && m.score_b > m.score_a ? 'bg-primary/10' : ''}`}>
                    {m.is_finished && <span className="font-display font-bold text-lg text-primary">{m.score_b}</span>}
                    <span className="text-sm font-medium truncate"><TeamName name={m.team_b} side="right" /></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchBracket;
