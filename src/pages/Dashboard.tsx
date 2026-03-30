import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Settings, Users, DollarSign, ArrowLeft, Copy } from 'lucide-react';
import { toast } from 'sonner';
import trophyImg from '@/assets/trophy.png';
import OrganizerMessages from '@/components/dashboard/OrganizerMessages';
import Leaderboard from '@/components/dashboard/Leaderboard';
import MatchPredictions from '@/components/dashboard/MatchPredictions';
import PredictionModal from '@/components/dashboard/PredictionModal';
import MatchBracket from '@/components/dashboard/MatchBracket';
import RulesModal from '@/components/dashboard/RulesModal';
import type { Bolao, Competition } from '@/types/bolao';

const Dashboard = () => {
  const { bolaoId } = useParams();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [predictionOpen, setPredictionOpen] = useState(false);
  const [bracketOpen, setBracketOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
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
    toast.success('Link de convite copiado!');
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <img src={trophyImg} alt="Troféu" className="w-7 h-7 object-contain" />
            <h1 className="font-display text-lg tracking-wider text-primary font-bold truncate max-w-[200px]">
              {bolao?.nickname || 'BOLÃO'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="font-medium text-foreground">{paidCount}/{totalParticipants}</span>
              <span className="hidden sm:inline">pagos</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span className="font-medium text-foreground">R$ {totalReceived.toFixed(2)}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={copyInviteCode} className="gap-1 hidden sm:flex">
              <Copy className="w-3 h-3" /> Convite
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:block">
              Olá, <span className="font-medium text-foreground">{profile?.name}</span>
            </span>
            {isCreator && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/bolao/${bolaoId}/manage`)} className="gap-1">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Gerenciar</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-7rem)]">
          <div className="order-2 lg:order-1">
            <OrganizerMessages bolaoId={bolaoId} />
          </div>
          <div className="order-1 lg:order-2">
            <Leaderboard bolaoId={bolaoId} onOpenPredictions={() => setPredictionOpen(true)} onOpenBracket={() => setBracketOpen(true)} onOpenRules={() => setRulesOpen(true)} />
          </div>
          <div className="order-3 lg:order-3">
            <MatchPredictions bolaoId={bolaoId} competitionId={bolao?.competition_id} />
          </div>
        </div>
      </main>

      <PredictionModal open={predictionOpen} onOpenChange={setPredictionOpen} bolaoId={bolaoId} competitionId={bolao?.competition_id} />
      <MatchBracket open={bracketOpen} onOpenChange={setBracketOpen} competitionId={bolao?.competition_id} />
      <RulesModal open={rulesOpen} onOpenChange={setRulesOpen} bolao={bolao} />
    </div>
  );
};

export default Dashboard;
