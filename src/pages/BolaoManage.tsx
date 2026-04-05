import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Users, DollarSign, Save, Trash2, MessageSquare, Settings, Play, Square, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import trophyImg from '@/assets/trophy.png';
import type { Bolao, BolaoParticipant } from '@/types/bolao';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

const BolaoManage = () => {
  const { bolaoId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bolao, setBolao] = useState<Bolao | null>(null);
  const [participants, setParticipants] = useState<(BolaoParticipant & { profile?: Profile })[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [betValue, setBetValue] = useState('');
  const [nickname, setNickname] = useState('');
  const [activeTab, setActiveTab] = useState('settings');

  useEffect(() => {
    if (!bolaoId || !user) return;
    fetchAll();
  }, [bolaoId, user]);

  const fetchAll = async () => {
    const [bolaoRes, participantsRes, paymentsRes, messagesRes, profilesRes] = await Promise.all([
      (supabase as any).from('boloes').select('*').eq('id', bolaoId).single(),
      (supabase as any).from('bolao_participants').select('*').eq('bolao_id', bolaoId),
      (supabase as any).from('payments').select('*').eq('bolao_id', bolaoId).order('created_at', { ascending: false }),
      (supabase as any).from('messages').select('*').eq('bolao_id', bolaoId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ]);

    if (bolaoRes.data) {
      setBolao(bolaoRes.data);
      setBetValue(String(bolaoRes.data.bet_value));
      setNickname(bolaoRes.data.nickname);
      if (bolaoRes.data.created_by !== user!.id) {
        navigate(`/bolao/${bolaoId}`);
        return;
      }
    }
    if (participantsRes.data && profilesRes.data) {
      setParticipants(participantsRes.data.map((p: BolaoParticipant) => ({
        ...p,
        profile: profilesRes.data!.find((pr: Profile) => pr.user_id === p.user_id),
      })));
    }
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (paymentsRes.data) setPayments(paymentsRes.data);
    if (messagesRes.data) setMessages(messagesRes.data);
  };

  const copyInviteCode = () => {
    if (!bolao) return;
    const url = `${window.location.origin}/invite/${bolao.invite_code}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de convite copiado!');
  };

  const saveSettings = async () => {
    if (!bolao) return;
    await (supabase as any).from('boloes').update({
      nickname: nickname.trim(),
      bet_value: parseFloat(betValue) || 0,
    }).eq('id', bolao.id);
    toast.success('Configurações salvas');
    fetchAll();
  };

  const updateStatus = async (status: 'waiting' | 'active' | 'finished' | 'cancelled') => {
    if (!bolao) return;
    await (supabase as any).from('boloes').update({ status }).eq('id', bolao.id);
    toast.success(`Status atualizado para ${status}`);
    fetchAll();
  };

  const addPayment = async () => {
    if (!selectedUser || !receivedBy.trim()) {
      toast.error('Selecione o competidor e informe quem recebeu');
      return;
    }
    await (supabase as any).from('payments').insert({
      user_id: selectedUser,
      received_by: receivedBy.trim(),
      bolao_id: bolaoId,
    });
    setSelectedUser('');
    setReceivedBy('');
    toast.success('Pagamento registrado');
    fetchAll();
  };

  const deletePayment = async (id: string) => {
    await supabase.from('payments').delete().eq('id', id);
    toast.success('Pagamento removido');
    fetchAll();
  };

  const deleteAllPayments = async () => {
    if (!confirm('Deletar TODOS os pagamentos?')) return;
    for (const p of payments) {
      await supabase.from('payments').delete().eq('id', p.id);
    }
    toast.success('Todos os pagamentos removidos');
    fetchAll();
  };

  const addMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await (supabase as any).from('messages').insert({
      content: newMessage,
      created_by: user.id,
      bolao_id: bolaoId,
    });
    setNewMessage('');
    toast.success('Mensagem enviada');
    fetchAll();
  };

  const deleteMessage = async (id: string) => {
    await supabase.from('messages').delete().eq('id', id);
    toast.success('Mensagem removida');
    fetchAll();
  };

  const getProfileName = (userId: string) => profiles.find(p => p.user_id === userId)?.name ?? 'Desconhecido';

  const paidUserIds = new Set(payments.map((p: any) => p.user_id));
  const participantProfiles = participants.map(p => p.profile).filter(Boolean) as Profile[];
  const unpaidParticipants = participantProfiles.filter(p => !paidUserIds.has(p.user_id));

  if (!bolao) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/bolao/${bolaoId}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img src={trophyImg} alt="Troféu" className="w-6 h-6 object-contain" />
          <h1 className="font-display text-lg tracking-wider text-primary font-bold">GERENCIAR: {bolao.nickname}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Desktop tabs */}
          <TabsList className="hidden md:grid w-full grid-cols-4">
            <TabsTrigger value="settings" className="font-display text-xs tracking-wider"><Settings className="w-3 h-3 mr-1" />CONFIG</TabsTrigger>
            <TabsTrigger value="participants" className="font-display text-xs tracking-wider"><Users className="w-3 h-3 mr-1" />MEMBROS</TabsTrigger>
            <TabsTrigger value="payments" className="font-display text-xs tracking-wider"><DollarSign className="w-3 h-3 mr-1" />PAGAMENTOS</TabsTrigger>
            <TabsTrigger value="messages" className="font-display text-xs tracking-wider"><MessageSquare className="w-3 h-3 mr-1" />MENSAGENS</TabsTrigger>
          </TabsList>
          {/* Mobile dropdown */}
          <div className="md:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="font-display tracking-wider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="settings">CONFIG</SelectItem>
                <SelectItem value="participants">MEMBROS</SelectItem>
                <SelectItem value="payments">PAGAMENTOS</SelectItem>
                <SelectItem value="messages">MENSAGENS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="settings">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm tracking-wider">CONFIGURAÇÕES DO BOLÃO</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Apelido</label>
                    <Input value={nickname} onChange={e => setNickname(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Valor da Aposta (R$)</label>
                    <Input type="number" min="0" step="0.01" value={betValue} onChange={e => setBetValue(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Código de Convite:</span>
                  <code className="bg-muted px-3 py-1 rounded font-display tracking-widest">{bolao.invite_code}</code>
                  <Button variant="outline" size="sm" onClick={copyInviteCode} className="gap-1">
                    <Copy className="w-3 h-3" /> Copiar Link
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Status:</span>
                  <span className="font-medium capitalize">{bolao.status}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveSettings} className="gap-1"><Save className="w-4 h-4" /> Salvar</Button>
                  {bolao.status === 'waiting' && (
                    <Button variant="outline" onClick={() => updateStatus('active')} className="gap-1"><Play className="w-4 h-4" /> Iniciar Bolão</Button>
                  )}
                  {(bolao.status === 'waiting' || bolao.status === 'active') && (
                    <Button variant="destructive" onClick={() => updateStatus('cancelled')} className="gap-1"><Square className="w-4 h-4" /> Cancelar Bolão</Button>
                  )}
                  {bolao.status === 'active' && (
                    <Button variant="outline" onClick={() => updateStatus('finished')} className="gap-1">Finalizar Bolão</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm tracking-wider">PARTICIPANTES ({participants.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[50vh] overflow-y-auto pr-2 space-y-2">
                  {participants.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <span className="text-sm font-medium">{p.profile?.name || 'Desconhecido'}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.profile?.email || ''}</span>
                      </div>
                      <span className="font-display font-bold text-primary">{p.total_score} pts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm tracking-wider">REGISTRAR PAGAMENTO</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger><SelectValue placeholder="Selecione o competidor" /></SelectTrigger>
                    <SelectContent>
                      {unpaidParticipants.map(p => (
                        <SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Recebido por" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} />
                </div>
                <Button onClick={addPayment} className="gap-2"><DollarSign className="w-4 h-4" /> Registrar</Button>
              </CardContent>
            </Card>
            <Card className="mt-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display text-sm tracking-wider">PAGAMENTOS ({payments.length}/{participants.length})</CardTitle>
                {payments.length > 0 && (
                  <Button variant="destructive" size="sm" className="gap-1" onClick={deleteAllPayments}>
                    <Trash2 className="w-3 h-3" /> Deletar Todos
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="h-[40vh] overflow-y-auto pr-2 space-y-2">
                  {payments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum pagamento</p>
                  ) : payments.map((pay: any) => (
                    <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="text-sm font-medium">{getProfileName(pay.user_id)}</p>
                        <p className="text-xs text-muted-foreground">
                          Recebido por: {pay.received_by} • {format(new Date(pay.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deletePayment(pay.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm tracking-wider">MENSAGENS</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Textarea placeholder="Escreva uma mensagem..." value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1" />
                  <Button onClick={addMessage} className="self-end">Enviar</Button>
                </div>
                <div className="h-[40vh] overflow-y-auto pr-2 space-y-2">
                  {messages.map((msg: any) => (
                    <div key={msg.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(msg.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteMessage(msg.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default BolaoManage;
