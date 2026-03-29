import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Calendar, UserPlus, LogIn, UserCheck } from 'lucide-react';
import trophyImg from '@/assets/trophy.png';

interface BolaoInfo {
  id: string;
  nickname: string;
  bet_value: number;
  status: string;
  invite_code: string;
  competition?: {
    name: string;
    year: number;
    start_date: string | null;
    end_date: string | null;
    total_clubs: number | null;
    format: string | null;
  };
  managerName: string;
  participantCount: number;
}

const InvitePage = () => {
  const { code } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bolaoInfo, setBolaoInfo] = useState<BolaoInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [joining, setJoining] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Fetch bolão details (public info)
  useEffect(() => {
    const fetchBolaoInfo = async () => {
      if (!code) { setNotFound(true); setLoadingInfo(false); return; }

      const { data: bolao } = await (supabase as any)
        .from('boloes')
        .select('*')
        .eq('invite_code', code.toUpperCase())
        .single();

      if (!bolao) {
        setNotFound(true);
        setLoadingInfo(false);
        return;
      }

      // Get competition
      let competition;
      if (bolao.competition_id) {
        const { data: comp } = await (supabase as any)
          .from('competitions')
          .select('*')
          .eq('id', bolao.competition_id)
          .single();
        competition = comp;
      }

      // Get manager name
      const { data: managerProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', bolao.created_by)
        .single();

      // Get participant count
      const { count } = await (supabase as any)
        .from('bolao_participants')
        .select('*', { count: 'exact', head: true })
        .eq('bolao_id', bolao.id);

      setBolaoInfo({
        id: bolao.id,
        nickname: bolao.nickname,
        bet_value: Number(bolao.bet_value),
        status: bolao.status,
        invite_code: bolao.invite_code,
        competition,
        managerName: managerProfile?.name || 'Desconhecido',
        participantCount: count || 0,
      });
      setLoadingInfo(false);
    };

    fetchBolaoInfo();
  }, [code]);

  const handleJoin = async () => {
    if (!user || !bolaoInfo) return;
    setJoining(true);

    const { error } = await (supabase as any)
      .from('bolao_participants')
      .insert({ bolao_id: bolaoInfo.id, user_id: user.id });

    if (error?.code === '23505') {
      toast.info('Você já participa deste bolão!');
    } else if (error) {
      toast.error('Erro ao ingressar no bolão');
    } else {
      toast.success(`Você entrou no bolão "${bolaoInfo.nickname}"!`);
    }

    setJoining(false);
    navigate('/home');
  };

  const handleGoToLogin = () => {
    if (code) localStorage.setItem('pending_invite_code', code);
    navigate('/');
  };

  if (authLoading || loadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-display text-primary tracking-wider">CARREGANDO CONVITE...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/30 bg-card/95 backdrop-blur-sm">
          <CardContent className="text-center py-10 space-y-4">
            <div className="text-4xl">❌</div>
            <h2 className="font-display text-xl tracking-wider text-destructive">CONVITE INVÁLIDO</h2>
            <p className="text-muted-foreground text-sm">
              O código de convite não foi encontrado. Verifique o link e tente novamente.
            </p>
            <Button onClick={() => navigate('/')} variant="outline" className="font-display tracking-wider">
              IR PARA O INÍCIO
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bolaoInfo?.status === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/30 bg-card/95 backdrop-blur-sm">
          <CardContent className="text-center py-10 space-y-4">
            <div className="text-4xl">🚫</div>
            <h2 className="font-display text-xl tracking-wider text-destructive">BOLÃO CANCELADO</h2>
            <p className="text-muted-foreground text-sm">
              Este bolão foi cancelado e não aceita novos participantes.
            </p>
            <Button onClick={() => navigate('/')} variant="outline" className="font-display tracking-wider">
              IR PARA O INÍCIO
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-primary/20 shadow-2xl bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16">
            <img src={trophyImg} alt="Troféu" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="text-2xl font-display tracking-wider text-primary">
            🎟️ CONVITE PARA BOLÃO
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Você foi convidado para participar de um bolão!
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Bolão Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bolão</span>
              <span className="font-display font-bold text-primary text-lg">{bolaoInfo?.nickname}</span>
            </div>
            {bolaoInfo?.competition && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Competição
                  </span>
                  <span className="font-medium">{bolaoInfo.competition.name} {bolaoInfo.competition.year}</span>
                </div>
                {bolaoInfo.competition.format && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Formato</span>
                    <span className="text-sm">{bolaoInfo.competition.format}</span>
                  </div>
                )}
                {bolaoInfo.competition.total_clubs && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Equipes</span>
                    <span className="text-sm">{bolaoInfo.competition.total_clubs} seleções</span>
                  </div>
                )}
                {bolaoInfo.competition.start_date && bolaoInfo.competition.end_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Período
                    </span>
                    <span className="text-sm">{bolaoInfo.competition.start_date} a {bolaoInfo.competition.end_date}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Gerente</span>
              <span className="text-sm">{bolaoInfo?.managerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" /> Participantes
              </span>
              <span className="font-medium">{bolaoInfo?.participantCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valor da Aposta</span>
              <Badge variant="secondary" className="font-display">
                R$ {bolaoInfo?.bet_value.toFixed(2)}
              </Badge>
            </div>
          </div>

          {/* Action area */}
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                <UserCheck className="w-4 h-4 text-primary shrink-0" />
                <span>Logado como <span className="font-medium text-foreground">{user.email}</span></span>
              </div>
              <Button onClick={handleJoin} disabled={joining} className="w-full font-display tracking-wider text-lg h-12 gap-2">
                <UserPlus className="w-5 h-5" />
                {joining ? 'INGRESSANDO...' : 'INGRESSAR NO BOLÃO'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                <h3 className="font-display text-sm tracking-wider text-primary font-bold">
                  COMO PARTICIPAR:
                </h3>
                <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>Se ainda não tem conta, <strong>crie uma</strong> no botão abaixo</li>
                  <li>Verifique seu e-mail e <strong>confirme o cadastro</strong></li>
                  <li>Faça <strong>login</strong> com seu e-mail e senha</li>
                  <li>Após o login, clique em <strong>"Ingressar Bolão"</strong> e informe o código:
                    <span className="font-display font-bold text-primary ml-1 tracking-widest">{code?.toUpperCase()}</span>
                  </li>
                </ol>
              </div>

              <Button onClick={handleGoToLogin} className="w-full font-display tracking-wider text-lg h-12 gap-2">
                <LogIn className="w-5 h-5" />
                ENTRAR / CRIAR CONTA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitePage;
