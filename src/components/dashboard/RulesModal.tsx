import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Target, DollarSign, Award } from 'lucide-react';
import type { Bolao } from '@/types/bolao';

interface RulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bolao?: Bolao | null;
}

const RulesModal = ({ open, onOpenChange, bolao }: RulesModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider text-primary flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            REGRAS DO BOLÃO
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6 text-sm leading-relaxed">
            <section className="space-y-2">
              <h3 className="font-display text-xs tracking-wider text-primary flex items-center gap-2">
                <Trophy className="w-4 h-4" /> COPA DO MUNDO FIFA 2026
              </h3>
              <p className="text-muted-foreground">
                A Copa do Mundo FIFA 2026 será realizada nos Estados Unidos, México e Canadá, sendo a primeira edição com <span className="font-semibold text-foreground">48 seleções</span>. O torneio terá um formato expandido com <span className="font-semibold text-foreground">7 fases</span>:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li><span className="text-foreground font-medium">Fase de Grupos</span> — 12 grupos de 4 equipes (48 jogos)</li>
                <li><span className="text-foreground font-medium">16-avos de Final</span> — 16 jogos com 32 equipes</li>
                <li><span className="text-foreground font-medium">Oitavas de Final</span> — 8 jogos</li>
                <li><span className="text-foreground font-medium">Quartas de Final</span> — 4 jogos</li>
                <li><span className="text-foreground font-medium">Semifinais</span> — 2 jogos</li>
                <li><span className="text-foreground font-medium">Disputa de 3º Lugar</span> — 1 jogo</li>
                <li><span className="text-foreground font-medium">Final</span> — 1 jogo</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="font-display text-xs tracking-wider text-primary flex items-center gap-2">
                <Target className="w-4 h-4" /> SISTEMA DE PONTUAÇÃO
              </h3>
              <p className="text-muted-foreground">
                Para cada jogo, o competidor recebe pontos com base na precisão do seu palpite:
              </p>
              <div className="space-y-1 ml-2">
                <div className="flex items-center gap-2"><span className="font-display font-bold text-primary w-6 text-right">5</span><span className="text-muted-foreground">— Acertou o placar exato do jogo</span></div>
                <div className="flex items-center gap-2"><span className="font-display font-bold text-primary w-6 text-right">4</span><span className="text-muted-foreground">— Acertou o placar do vencedor, errou o do perdedor</span></div>
                <div className="flex items-center gap-2"><span className="font-display font-bold text-primary w-6 text-right">3</span><span className="text-muted-foreground">— Acertou o placar do perdedor ou acertou o empate com placar diferente</span></div>
                <div className="flex items-center gap-2"><span className="font-display font-bold text-primary w-6 text-right">2</span><span className="text-muted-foreground">— Acertou o vencedor mas errou ambos os placares</span></div>
                <div className="flex items-center gap-2"><span className="font-display font-bold text-primary w-6 text-right">1</span><span className="text-muted-foreground">— Errou tudo mas acertou o total de gols da partida</span></div>
                <div className="flex items-center gap-2"><span className="font-display font-bold text-muted-foreground w-6 text-right">0</span><span className="text-muted-foreground">— Não acertou nenhum critério</span></div>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="font-display text-xs tracking-wider text-primary flex items-center gap-2">
                ✖️ MULTIPLICADOR POR FASE
              </h3>
              <p className="text-muted-foreground">
                A pontuação de cada jogo é multiplicada pelo número da fase:
              </p>
              <div className="grid grid-cols-2 gap-1 ml-2">
                <span className="text-muted-foreground">Fase de Grupos:</span><span className="font-semibold">×1</span>
                <span className="text-muted-foreground">16-avos de Final:</span><span className="font-semibold">×2</span>
                <span className="text-muted-foreground">Oitavas de Final:</span><span className="font-semibold">×3</span>
                <span className="text-muted-foreground">Quartas de Final:</span><span className="font-semibold">×4</span>
                <span className="text-muted-foreground">Semifinais:</span><span className="font-semibold">×5</span>
                <span className="text-muted-foreground">3º Lugar e Final:</span><span className="font-semibold">×6</span>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="font-display text-xs tracking-wider text-primary flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> VALOR DA APOSTA
              </h3>
              <p className="text-muted-foreground">
                {bolao ? (
                  <>O valor da aposta deste bolão é de <span className="font-semibold text-foreground">R$ {Number(bolao.bet_value).toFixed(2)}</span>. </>
                ) : null}
                O valor total do prêmio dependerá do número total de participantes inscritos.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-display text-xs tracking-wider text-primary flex items-center gap-2">
                <Award className="w-4 h-4" /> DIVISÃO DO PRÊMIO
              </h3>
              <p className="text-muted-foreground">
                Ao final da Copa, o prêmio será distribuído:
              </p>
              <div className="space-y-2 ml-2">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-accent/10 border border-accent/30">
                  <span className="text-lg">🥇</span><span className="font-semibold">1º Lugar — 70% do prêmio</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border/50">
                  <span className="text-lg">🥈</span><span className="font-semibold">2º Lugar — 20% do prêmio</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-lg">🥉</span><span className="font-semibold">3º Lugar — 10% do prêmio</span>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default RulesModal;
