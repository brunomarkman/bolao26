import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Target, DollarSign, Award, Info } from 'lucide-react';
import type { Bolao } from '@/types/bolao';
import { useLanguage } from '@/i18n/LanguageContext';

interface RulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bolao?: Bolao | null;
}

const RulesModal = ({ open, onOpenChange, bolao }: RulesModalProps) => {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider text-primary flex items-center gap-2">
            <Trophy className="w-5 h-5" /> {t('rules.title')}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6 text-sm leading-relaxed">
            <section className="space-y-2">
              <h3 className="font-display text-xs tracking-wider text-primary flex items-center gap-2">
                <Trophy className="w-4 h-4" /> {t('rules.worldCup')}
              </h3>
              <p className="text-muted-foreground">
                {t('rules.worldCupDesc')} <span className="font-semibold text-foreground">{t('rules.teams')}</span>. {t('rules.phasesIntro')} <span className="font-semibold text-foreground">{t('rules.phases')}</span>:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li><span className="text-foreground font-medium">{t('rules.groupStage')}</span> — {t('rules.groupStageDesc')}</li>
                <li><span className="text-foreground font-medium">{t('rules.round32')}</span> — {t('rules.round32Desc')}</li>
                <li><span className="text-foreground font-medium">{t('rules.round16')}</span> — {t('rules.round16Desc')}</li>
                <li><span className="text-foreground font-medium">{t('rules.quarters')}</span> — {t('rules.quartersDesc')}</li>
                <li><span className="text-foreground font-medium">{t('rules.semis')}</span> — {t('rules.semisDesc')}</li>
                <li><span className="text-foreground font-medium">{t('rules.thirdPlace')}</span> — {t('rules.thirdPlaceDesc')}</li>
                <li><span className="text-foreground font-medium">{t('rules.final')}</span> — {t('rules.finalDesc')}</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="font-display text-xs tracking-wider text-primary flex items-center gap-2">
                <Target className="w-4 h-4" /> {t('rules.scoringTitle')}
              </h3>
              <p className="text-muted-foreground">{t('rules.scoringDesc')}</p>
              <div className="ml-2 border border-border/50 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[80px_1fr] bg-muted/30 text-xs font-display tracking-wider text-primary">
                  <div className="px-2 py-1.5 text-center border-r border-border/50">{t('rules.pointsCol') || 'Pontos'}</div>
                  <div className="px-3 py-1.5 text-left">{t('rules.descCol') || 'Descrição'}</div>
                </div>
                {[
                  { p: '5', d: t('rules.score5'), primary: true },
                  { p: '4', d: t('rules.score4'), primary: true },
                  { p: '3', d: t('rules.score3'), primary: true },
                  { p: '2', d: t('rules.score2'), primary: true },
                  { p: '1', d: t('rules.score1'), primary: true },
                  { p: '0', d: t('rules.score0'), primary: false },
                ].map((row) => (
                  <div key={row.p} className="grid grid-cols-[80px_1fr] border-t border-border/50">
                    <div className={`px-2 py-1.5 text-center font-display font-bold border-r border-border/50 ${row.primary ? 'text-primary' : 'text-muted-foreground'}`}>{row.p}</div>
                    <div className="px-3 py-1.5 text-left text-muted-foreground">{row.d}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="font-display text-xs tracking-wider text-primary flex items-center gap-2">{t('rules.multiplierTitle')}</h3>
              <p className="text-muted-foreground">{t('rules.multiplierDesc')}</p>
              <div className="grid grid-cols-2 gap-1 ml-2">
                <span className="text-muted-foreground">{t('rules.groupStage')}:</span><span className="font-semibold">×1</span>
                <span className="text-muted-foreground">{t('rules.round32')}:</span><span className="font-semibold">×2</span>
                <span className="text-muted-foreground">{t('rules.round16')}:</span><span className="font-semibold">×3</span>
                <span className="text-muted-foreground">{t('rules.quarters')}:</span><span className="font-semibold">×4</span>
                <span className="text-muted-foreground">{t('rules.semis')}:</span><span className="font-semibold">×5</span>
                <span className="text-muted-foreground">{t('rules.thirdPlace')} / {t('rules.final')}:</span><span className="font-semibold">×6</span>
              </div>
              <p className="text-xs text-muted-foreground italic mt-2">{t('rules.scoringDuration')}</p>
            </section>


            <section className="space-y-2">
              <h3 className="font-display text-xs tracking-wider text-primary flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> {t('rules.betTitle')}
              </h3>
              <p className="text-muted-foreground">
                {bolao ? <>{t('rules.betDesc')} <span className="font-semibold text-foreground">$ {Number(bolao.bet_value).toFixed(2)}</span>. </> : null}
                {t('rules.totalPrize')}
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-display text-xs tracking-wider text-primary flex items-center gap-2">
                <Award className="w-4 h-4" /> {t('rules.prizeTitle')}
              </h3>
              <p className="text-muted-foreground">{t('rules.prizeDesc')}</p>
              <div className="space-y-2 ml-2">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-accent/10 border border-accent/30">
                  <span className="text-lg">🥇</span><span className="font-semibold">{t('rules.first')}</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border/50">
                  <span className="text-lg">🥈</span><span className="font-semibold">{t('rules.second')}</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-lg">🥉</span><span className="font-semibold">{t('rules.third')}</span>
                </div>
              </div>
            </section>

            <section className="space-y-2 border border-yellow-300/40 bg-yellow-100/40 dark:bg-yellow-900/20 rounded-lg p-3">
              <h3 className="font-display text-xs tracking-wider text-primary flex items-center gap-2">
                <Award className="w-4 h-4" /> {t('rules.disclaimerTitle')}
              </h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{t('rules.disclaimer')}</p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default RulesModal;
