import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Settings, Users, DollarSign, ArrowLeft, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import trophyImg from '@/assets/trophy.png';
import OrganizerMessages from '@/components/dashboard/OrganizerMessages';
import Leaderboard from '@/components/dashboard/Leaderboard';
import MatchPredictions from '@/components/dashboard/MatchPredictions';
import PredictionModal from '@/components/dashboard/PredictionModal';
import MatchBracket from '@/components/dashboard/MatchBracket';
import RulesModal from '@/components/dashboard/RulesModal';
import ResultsReport from '@/components/manage/ResultsReport';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import LanguageSelector from '@/components/LanguageSelector';
import { useLanguage } from '@/i18n/LanguageContext';
import type { Bolao, Competition } from '@/types/bolao';

const Dashboard = () => {
  const { bolaoId } = useParams();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [predictionOpen, setPredictionOpen] = useState(false);
  const [bracketOpen, setBracketOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [bolao, setBolao] = useState<Bolao | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [paidCount, setPaidCount] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);

  const isCreator = bolao?.created_by === user?.id;

  useEffect(() => {
    if (!bolaoId) return;
    const fetchBolaoData = async () => {
      const { data: bolaoData } = await (supabase as any).from('boloes').select('*').eq('id', bolaoId).single();
      if (bolaoData) {
        setBolao(bolaoData);
        const { data: compData } = await (supabase as any).from('competitions').select('*').eq('id', bolaoData.competition_id).single();
        if (compData) setCompetition(compData);
      }
      const [paymentsRes, participantsRes] = await Promise.all([
        (supabase as any).from('payments').select('id', { count: 'exact', head: true }).eq('bolao_id', bolaoId),
        (supabase as any).from('bolao_participants').select('id', { count: 'exact', head: true }).eq('bolao_id', bolaoId),
      ]);
      setPaidCount(paymentsRes.count ?? 0);
      setTotalParticipants(participantsRes.count ?? 0);
    };
    fetchBolaoData();
  }, [bolaoId]);

  const totalReceived = paidCount * (bolao?.bet_value ? Number(bolao.bet_value) : 0);

  const copyInviteCode = () => {
    if (!bolao) return;
    const url = `${window.location.origin}/invite/${bolao.invite_code}`;
    navigator.clipboard.writeText(url);
    toast.success(t('dash.inviteCopied'));
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/home', { replace: true })}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <img src={trophyImg} alt="Troféu" className="w-7 h-7 object-contain" />
              <h1 className="font-display text-lg tracking-wider text-primary font-bold truncate max-w-[200px]">
                {bolao?.nickname || t('dash.pool')}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="font-medium text-foreground">{paidCount}/{totalParticipants}</span>
                  <span>{t('dash.paid')}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-medium text-foreground">R$ {totalReceived.toFixed(2)}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={copyInviteCode} className="gap-1">
                  <Copy className="w-3 h-3" /> {t('dash.invite')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('home.hello')}, <span className="font-medium text-foreground">{profile?.name}</span>
                </span>
                {isCreator && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/bolao/${bolaoId}/manage`)} className="gap-1">
                    <Settings className="w-4 h-4" />
                    <span>{t('dash.manage')}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="flex md:hidden items-center justify-between pb-2 -mt-1 flex-wrap gap-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="font-medium text-foreground">{paidCount}/{totalParticipants}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span className="font-medium text-foreground">R$ {totalReceived.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={copyInviteCode} className="gap-1 h-7 text-xs">
                <Copy className="w-3 h-3" /> {t('dash.invite')}
              </Button>
              {isCreator && (
                <Button variant="outline" size="sm" onClick={() => navigate(`/bolao/${bolaoId}/manage`)} className="gap-1 h-7 text-xs">
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-7rem)]">
          <div className="order-2 lg:order-1">
            <OrganizerMessages bolaoId={bolaoId} />
          </div>
          <div className="order-1 lg:order-2">
            <Leaderboard bolaoId={bolaoId} competitionId={bolao?.competition_id} onOpenPredictions={() => setPredictionOpen(true)} onOpenBracket={() => setBracketOpen(true)} onOpenRules={() => setRulesOpen(true)} onOpenResults={() => setResultsOpen(true)} />
          </div>
          <div className="order-3 lg:order-3">
            <MatchPredictions bolaoId={bolaoId} competitionId={bolao?.competition_id} />
          </div>
        </div>
      </main>

      <PredictionModal open={predictionOpen} onOpenChange={setPredictionOpen} bolaoId={bolaoId} competitionId={bolao?.competition_id} />
      <MatchBracket open={bracketOpen} onOpenChange={setBracketOpen} competitionId={bolao?.competition_id} />
      <RulesModal open={rulesOpen} onOpenChange={setRulesOpen} bolao={bolao} />
      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-auto">
          {bolaoId && bolao?.competition_id && (
            <ResultsReport bolaoId={bolaoId} bolaoNickname={bolao?.nickname || ''} competitionId={bolao.competition_id} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
