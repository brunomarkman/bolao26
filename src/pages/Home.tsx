import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, Plus, UserPlus, Shield, Trophy, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import trophyImg from '@/assets/trophy.png';
import type { Bolao, Competition, BolaoParticipant } from '@/types/bolao';
import type { Tables } from '@/integrations/supabase/types';
import CreateBolaoModal from '@/components/home/CreateBolaoModal';
import JoinBolaoModal from '@/components/home/JoinBolaoModal';

type Profile = Tables<'profiles'>;

interface BolaoRow extends Bolao {
  competition?: Competition;
  managerName?: string;
  participantCount: number;
  totalCollected: number;
  winnerName?: string;
  isCreator: boolean;
  isParticipant: boolean;
}

const Home = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [boloes, setBoloes] = useState<BolaoRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSiteAdmin = profile?.email === 'brunomarkman@gmail.com';

  const fetchBoloes = async () => {
    if (!user) return;
    setLoading(true);

    // Get all bolões where user participates
    const { data: participations } = await (supabase as any)
      .from('bolao_participants')
      .select('bolao_id')
      .eq('user_id', user.id);

    // Also get bolões created by user (they might not have joined yet)
    const { data: createdBoloes } = await (supabase as any)
      .from('boloes')
      .select('id')
      .eq('created_by', user.id);

    const participatedIds = (participations || []).map((p: any) => p.bolao_id);
    const createdIds = (createdBoloes || []).map((b: any) => b.id);
    const allIds = [...new Set([...participatedIds, ...createdIds])];

    if (allIds.length === 0) {
      setBoloes([]);
      setLoading(false);
      return;
    }

    // Get bolão details
    const { data: boloesData } = await (supabase as any)
      .from('boloes')
      .select('*')
      .in('id', allIds)
      .order('created_at', { ascending: false });

    // Get competitions
    const { data: competitions } = await (supabase as any)
      .from('competitions')
      .select('*');

    // Get all participants counts
    const { data: allParticipants } = await (supabase as any)
      .from('bolao_participants')
      .select('*')
      .in('bolao_id', allIds);

    // Get all payments counts
    const { data: allPayments } = await (supabase as any)
      .from('payments')
      .select('bolao_id')
      .in('bolao_id', allIds);

    // Get profiles for manager names and winners
    const { data: profiles } = await supabase.from('profiles').select('*');

    const rows: BolaoRow[] = (boloesData || []).map((b: Bolao) => {
      const comp = (competitions || []).find((c: Competition) => c.id === b.competition_id);
      const participants = (allParticipants || []).filter((p: BolaoParticipant) => p.bolao_id === b.id);
      const payments = (allPayments || []).filter((p: any) => p.bolao_id === b.id);
      const manager = (profiles || []).find((p: Profile) => p.user_id === b.created_by);

      // Find winner if finished
      let winnerName: string | undefined;
      if (b.status === 'finished' && participants.length > 0) {
        const sorted = [...participants].sort((a: BolaoParticipant, b: BolaoParticipant) => b.total_score - a.total_score);
        const winnerProfile = (profiles || []).find((p: Profile) => p.user_id === sorted[0].user_id);
        winnerName = winnerProfile?.name;
      }

      return {
        ...b,
        competition: comp,
        managerName: manager?.name || 'Desconhecido',
        participantCount: participants.length,
        totalCollected: payments.length * Number(b.bet_value),
        winnerName,
        isCreator: b.created_by === user!.id,
        isParticipant: participatedIds.includes(b.id),
      };
    });

    setBoloes(rows);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    const loadAndRedirect = async () => {
      await fetchBoloes();
    };
    loadAndRedirect();
  }, [user]);

  // Auto-redirect only on fresh login (not when returning to Home)
  useEffect(() => {
    if (loading || boloes.length === 0) return;
    const justLoggedIn = sessionStorage.getItem('just_logged_in');
    if (!justLoggedIn) return;
    sessionStorage.removeItem('just_logged_in');
    const activeBoloes = boloes.filter(b => b.status === 'waiting' || b.status === 'active');
    if (activeBoloes.length === 1) {
      navigate(`/bolao/${activeBoloes[0].id}`);
    }
  }, [loading, boloes]);

  // Check for pending invite
  useEffect(() => {
    const pendingCode = localStorage.getItem('pending_invite_code');
    if (pendingCode && user) {
      localStorage.removeItem('pending_invite_code');
      handleJoinByCode(pendingCode);
    }
  }, [user]);

  const handleJoinByCode = async (code: string) => {
    const { data: bolao } = await (supabase as any)
      .from('boloes')
      .select('*')
      .eq('invite_code', code.toUpperCase())
      .single();

    if (!bolao) {
      toast.error('Bolão não encontrado');
      return;
    }
    if (bolao.status === 'cancelled') {
      toast.error('Este bolão foi cancelado');
      return;
    }

    const { error } = await (supabase as any)
      .from('bolao_participants')
      .insert({ bolao_id: bolao.id, user_id: user!.id });

    if (error) {
      if (error.code === '23505') toast.info('Você já participa deste bolão');
      else toast.error('Erro ao ingressar');
      return;
    }
    toast.success(`Você entrou no bolão "${bolao.nickname}"!`);
    fetchBoloes();
  };

  const handleLeaveBolao = async (bolaoId: string) => {
    if (!confirm('Deseja realmente sair deste bolão?')) return;
    await (supabase as any).from('bolao_participants').delete().eq('bolao_id', bolaoId).eq('user_id', user!.id);
    toast.success('Você saiu do bolão');
    fetchBoloes();
  };

  const handleCancelBolao = async (bolaoId: string) => {
    if (!confirm('Deseja cancelar este bolão? Essa ação não pode ser desfeita.')) return;
    await (supabase as any).from('boloes').update({ status: 'cancelled' }).eq('id', bolaoId);
    toast.success('Bolão cancelado');
    fetchBoloes();
  };

  const handleDeleteBolao = async (bolaoId: string) => {
    if (!confirm('Deseja deletar este bolão? Essa ação não pode ser desfeita.')) return;
    await (supabase as any).from('boloes').delete().eq('id', bolaoId);
    toast.success('Bolão deletado');
    fetchBoloes();
  };

  const getStatusBadge = (status: Bolao['status']) => {
    const map = {
      waiting: { label: 'Esperando', variant: 'secondary' as const },
      active: { label: 'Ativo', variant: 'default' as const },
      finished: { label: 'Finalizado', variant: 'outline' as const },
      cancelled: { label: 'Cancelado', variant: 'destructive' as const },
    };
    const s = map[status];
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const handleSelectBolao = (bolao: BolaoRow) => {
    if (bolao.status === 'cancelled') {
      toast.error('Este bolão foi cancelado');
      return;
    }
    navigate(`/bolao/${bolao.id}`);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={trophyImg} alt="Troféu" className="w-7 h-7 object-contain" />
            <h1 className="font-display text-lg tracking-wider text-primary font-bold">
              MEUS BOLÕES
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Olá, <span className="font-medium text-foreground">{profile?.name}</span>
            </span>
            {isSiteAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="gap-1">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Área de Administração do Site</span>
                <span className="sm:hidden">Admin</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setCreateOpen(true)} className="gap-2 font-display tracking-wider">
            <Plus className="w-4 h-4" /> CRIAR BOLÃO
          </Button>
          <Button onClick={() => setJoinOpen(true)} variant="outline" className="gap-2 font-display tracking-wider">
            <UserPlus className="w-4 h-4" /> INGRESSAR BOLÃO
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-sm tracking-wider flex items-center gap-2 text-primary">
              <Trophy className="w-4 h-4" /> MEUS BOLÕES
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : boloes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Você ainda não participa de nenhum bolão. Crie um novo ou ingresse em um existente!
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 font-display text-xs tracking-wider text-muted-foreground">Competição</th>
                      <th className="text-center p-2 font-display text-xs tracking-wider text-muted-foreground">Nº</th>
                      <th className="text-left p-2 font-display text-xs tracking-wider text-muted-foreground">Apelido</th>
                      <th className="text-center p-2 font-display text-xs tracking-wider text-muted-foreground">Ano</th>
                      <th className="text-center p-2 font-display text-xs tracking-wider text-muted-foreground">Início</th>
                      <th className="text-center p-2 font-display text-xs tracking-wider text-muted-foreground">Final</th>
                      <th className="text-center p-2 font-display text-xs tracking-wider text-muted-foreground">Status</th>
                      <th className="text-left p-2 font-display text-xs tracking-wider text-muted-foreground">Gerente</th>
                      <th className="text-center p-2 font-display text-xs tracking-wider text-muted-foreground"><Users className="w-3 h-3 inline" /></th>
                      <th className="text-center p-2 font-display text-xs tracking-wider text-muted-foreground">R$ Total</th>
                      <th className="text-left p-2 font-display text-xs tracking-wider text-muted-foreground">Vencedor</th>
                      <th className="text-center p-2 font-display text-xs tracking-wider text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boloes.map(b => (
                      <tr
                        key={b.id}
                        className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => handleSelectBolao(b)}
                      >
                        <td className="p-2">{b.competition?.name || '—'}</td>
                        <td className="p-2 text-center font-display font-bold">{b.number}</td>
                        <td className="p-2 font-medium">{b.nickname}</td>
                        <td className="p-2 text-center">{b.competition?.year || '—'}</td>
                        <td className="p-2 text-center text-xs">{b.competition?.start_date || '—'}</td>
                        <td className="p-2 text-center text-xs">{b.competition?.end_date || '—'}</td>
                        <td className="p-2 text-center">{getStatusBadge(b.status)}</td>
                        <td className="p-2">{b.managerName}</td>
                        <td className="p-2 text-center font-medium">{b.participantCount}</td>
                        <td className="p-2 text-center font-medium">R$ {b.totalCollected.toFixed(2)}</td>
                        <td className="p-2">{b.winnerName || '—'}</td>
                        <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {b.isCreator && b.status === 'waiting' && (
                              <>
                                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleCancelBolao(b.id)}>
                                  Cancelar
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteBolao(b.id)}>
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </Button>
                              </>
                            )}
                            {b.isCreator && b.status === 'active' && (
                              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleCancelBolao(b.id)}>
                                Cancelar
                              </Button>
                            )}
                            {!b.isCreator && b.isParticipant && b.status !== 'cancelled' && (
                              <Button variant="outline" size="sm" className="text-xs h-7 text-destructive" onClick={() => handleLeaveBolao(b.id)}>
                                Sair
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <CreateBolaoModal open={createOpen} onOpenChange={setCreateOpen} onCreated={fetchBoloes} />
      <JoinBolaoModal open={joinOpen} onOpenChange={setJoinOpen} onJoined={fetchBoloes} />
    </div>
  );
};

export default Home;
