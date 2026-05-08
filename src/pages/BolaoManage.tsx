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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Users, DollarSign, Save, Trash2, MessageSquare, Settings, Play, Square, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import trophyImg from '@/assets/trophy.png';
import type { Bolao, BolaoParticipant } from '@/types/bolao';
import type { Tables } from '@/integrations/supabase/types';
import ResultsReport from '@/components/manage/ResultsReport';
import LanguageSelector from '@/components/LanguageSelector';
import { useLanguage } from '@/i18n/LanguageContext';

type Profile = Tables<'profiles'>;

const BolaoManage = () => {
  const { bolaoId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? enUS : ptBR;

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
  const [extraQ1Enabled, setExtraQ1Enabled] = useState(true);
  const [extraQ1Points, setExtraQ1Points] = useState('30');
  const [extraQ2Enabled, setExtraQ2Enabled] = useState(true);
  const [extraQ2Points, setExtraQ2Points] = useState('25');
  const [extraQ3Enabled, setExtraQ3Enabled] = useState(true);
  const [extraQ3Points, setExtraQ3Points] = useState('25');
  const [activeTab, setActiveTab] = useState('settings');

  useEffect(() => { if (bolaoId && user) fetchAll(); }, [bolaoId, user]);

  const fetchAll = async () => {
    const [bolaoRes, participantsRes, paymentsRes, messagesRes, profilesRes] = await Promise.all([
      (supabase as any).from('boloes').select('*').eq('id', bolaoId).single(),
      (supabase as any).from('bolao_participants').select('*').eq('bolao_id', bolaoId),
      (supabase as any).from('payments').select('*').eq('bolao_id', bolaoId).order('created_at', { ascending: false }),
      (supabase as any).from('messages').select('*').eq('bolao_id', bolaoId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ]);
    if (bolaoRes.data) {
      setBolao(bolaoRes.data); setBetValue(String(bolaoRes.data.bet_value)); setNickname(bolaoRes.data.nickname);
      setExtraQ1Enabled(bolaoRes.data.extra_champion_enabled ?? true);
      setExtraQ1Points(String(bolaoRes.data.extra_champion_points ?? 30));
      setExtraQ2Enabled(bolaoRes.data.extra_golden_ball_enabled ?? true);
      setExtraQ2Points(String(bolaoRes.data.extra_golden_ball_points ?? 25));
      setExtraQ3Enabled(bolaoRes.data.extra_top_scorer_enabled ?? true);
      setExtraQ3Points(String(bolaoRes.data.extra_top_scorer_points ?? 25));
      if (bolaoRes.data.created_by !== user!.id) { navigate(`/bolao/${bolaoId}`); return; }
    }
    if (participantsRes.data && profilesRes.data) {
      setParticipants(participantsRes.data.map((p: BolaoParticipant) => ({ ...p, profile: profilesRes.data!.find((pr: Profile) => pr.user_id === p.user_id) })));
    }
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (paymentsRes.data) setPayments(paymentsRes.data);
    if (messagesRes.data) setMessages(messagesRes.data);
  };

  const copyInviteCode = () => {
    if (!bolao) return;
    navigator.clipboard.writeText(`${window.location.origin}/invite/${bolao.invite_code}`);
    toast.success(t('manage.inviteCopied'));
  };

  const saveSettings = async () => {
    if (!bolao) return;
    await (supabase as any).from('boloes').update({ nickname: nickname.trim(), bet_value: parseFloat(betValue) || 0 }).eq('id', bolao.id);
    toast.success(t('manage.settingsSaved')); fetchAll();
  };

  const updateStatus = async (status: 'waiting' | 'active' | 'finished' | 'cancelled') => {
    if (!bolao) return;
    await (supabase as any).from('boloes').update({ status }).eq('id', bolao.id);
    toast.success(`${t('manage.statusUpdated')} ${status}`); fetchAll();
  };

  const addPayment = async () => {
    if (!selectedUser || !receivedBy.trim()) { toast.error(t('manage.selectAndReceiver')); return; }
    await (supabase as any).from('payments').insert({ user_id: selectedUser, received_by: receivedBy.trim(), bolao_id: bolaoId });
    setSelectedUser(''); setReceivedBy(''); toast.success(t('manage.paymentRegistered')); fetchAll();
  };

  const deletePayment = async (id: string) => { await supabase.from('payments').delete().eq('id', id); toast.success(t('manage.paymentRemoved')); fetchAll(); };

  const deleteAllPayments = async () => {
    if (!confirm(t('manage.confirmDeletePayments'))) return;
    for (const p of payments) await supabase.from('payments').delete().eq('id', p.id);
    toast.success(t('manage.allPaymentsRemoved')); fetchAll();
  };

  const addMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await (supabase as any).from('messages').insert({ content: newMessage, created_by: user.id, bolao_id: bolaoId, source: 'manage', tipo: 'G' });
    setNewMessage(''); toast.success(t('manage.messageSent')); fetchAll();
  };

  const deleteMessage = async (id: string) => { await supabase.from('messages').delete().eq('id', id); toast.success(t('manage.messageRemoved')); fetchAll(); };

  const getProfileName = (userId: string) => profiles.find(p => p.user_id === userId)?.name ?? t('home.unknown');
  const paidUserIds = new Set(payments.map((p: any) => p.user_id));
  const participantProfiles = participants.map(p => p.profile).filter(Boolean) as Profile[];
  const unpaidParticipants = participantProfiles.filter(p => !paidUserIds.has(p.user_id));

  if (!bolao) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { navigate(`/bolao/${bolaoId}`); setTimeout(() => navigate(`/bolao/${bolaoId}`), 50); }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <img src={trophyImg} alt="Troféu" className="w-6 h-6 object-contain" />
            <h1 className="font-display text-lg tracking-wider text-primary font-bold">{t('manage.title')}: {bolao.nickname}</h1>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="hidden md:grid w-full grid-cols-5">
            <TabsTrigger value="settings" className="font-display text-xs tracking-wider"><Settings className="w-3 h-3 mr-1" />{t('manage.config')}</TabsTrigger>
            <TabsTrigger value="participants" className="font-display text-xs tracking-wider"><Users className="w-3 h-3 mr-1" />{t('manage.members')}</TabsTrigger>
            <TabsTrigger value="payments" className="font-display text-xs tracking-wider"><DollarSign className="w-3 h-3 mr-1" />{t('manage.payments')}</TabsTrigger>
            <TabsTrigger value="messages" className="font-display text-xs tracking-wider"><MessageSquare className="w-3 h-3 mr-1" />{t('manage.messages')}</TabsTrigger>
            <TabsTrigger value="results" className="font-display text-xs tracking-wider"><FileText className="w-3 h-3 mr-1" />{t('manage.resultsList')}</TabsTrigger>
          </TabsList>
          <div className="md:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="font-display tracking-wider"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="settings">{t('manage.config')}</SelectItem>
                <SelectItem value="participants">{t('manage.members')}</SelectItem>
                <SelectItem value="payments">{t('manage.payments')}</SelectItem>
                <SelectItem value="messages">{t('manage.messages')}</SelectItem>
                <SelectItem value="results">{t('manage.resultsList')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="settings">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm tracking-wider">{t('manage.poolSettings')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-sm font-medium">{t('manage.nickname')}</label><Input value={nickname} onChange={e => setNickname(e.target.value)} /></div>
                  <div className="space-y-2"><label className="text-sm font-medium">{t('manage.betValue')}</label><Input type="number" min="0" step="0.01" value={betValue} onChange={e => setBetValue(e.target.value)} /></div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{t('manage.inviteCode')}</span>
                  <code className="bg-muted px-3 py-1 rounded font-display tracking-widest">{bolao.invite_code}</code>
                  <Button variant="outline" size="sm" onClick={copyInviteCode} className="gap-1"><Copy className="w-3 h-3" /> {t('manage.copyLink')}</Button>
                </div>
                <div className="flex items-center gap-3"><span className="text-sm font-medium">{t('manage.statusLabel')}</span><span className="font-medium capitalize">{bolao.status}</span></div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveSettings} className="gap-1"><Save className="w-4 h-4" /> {t('manage.save')}</Button>
                  {bolao.status === 'waiting' && <Button variant="outline" onClick={() => updateStatus('active')} className="gap-1"><Play className="w-4 h-4" /> {t('manage.startPool')}</Button>}
                  {(bolao.status === 'waiting' || bolao.status === 'active') && <Button variant="destructive" onClick={() => updateStatus('cancelled')} className="gap-1"><Square className="w-4 h-4" /> {t('manage.cancelPool')}</Button>}
                  {bolao.status === 'active' && <Button variant="outline" onClick={() => updateStatus('finished')} className="gap-1">{t('manage.finishPool')}</Button>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm tracking-wider">{t('manage.participants')} ({participants.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[50vh] overflow-y-auto pr-2 space-y-2">
                  {participants.map(p => {
                    const hasPaid = paidUserIds.has(p.user_id);
                    const isActive = p.is_active !== false;
                    return (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex-1">
                          <span className="text-sm font-medium">{p.profile?.name || t('home.unknown')}</span>
                          <span className="text-xs text-muted-foreground ml-2">{p.profile?.email || ''}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-display font-bold text-primary">{p.total_score} pts</span>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={isActive}
                              disabled={hasPaid && isActive}
                              onCheckedChange={async (checked) => {
                                if (hasPaid && !checked) { toast.error(t('manage.cannotDeactivatePaid')); return; }
                                await (supabase as any).from('bolao_participants').update({ is_active: checked }).eq('id', p.id);
                                toast.success(t('manage.memberStatusUpdated'));
                                fetchAll();
                              }}
                            />
                            <span className="text-xs text-muted-foreground w-14">{isActive ? t('manage.activeMember') : t('manage.inactiveMember')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm tracking-wider">{t('manage.registerPayment')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger><SelectValue placeholder={t('manage.selectCompetitor')} /></SelectTrigger>
                    <SelectContent>{unpaidParticipants.map(p => (<SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>))}</SelectContent>
                  </Select>
                  <Input placeholder={t('manage.receivedBy')} value={receivedBy} onChange={e => setReceivedBy(e.target.value)} />
                </div>
                <Button onClick={addPayment} className="gap-2"><DollarSign className="w-4 h-4" /> {t('manage.register')}</Button>
              </CardContent>
            </Card>
            <Card className="mt-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display text-sm tracking-wider">{t('manage.payments')} ({payments.length}/{participants.length})</CardTitle>
                {payments.length > 0 && <Button variant="destructive" size="sm" className="gap-1" onClick={deleteAllPayments}><Trash2 className="w-3 h-3" /> {t('manage.deleteAll')}</Button>}
              </CardHeader>
              <CardContent>
                <div className="h-[40vh] overflow-y-auto pr-2 space-y-2">
                  {payments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">{t('manage.noPayments')}</p>
                  ) : payments.map((pay: any) => (
                    <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="text-sm font-medium">{getProfileName(pay.user_id)}</p>
                        <p className="text-xs text-muted-foreground">{t('manage.receivedBy')}: {pay.received_by} • {format(new Date(pay.created_at), "dd MMM, HH:mm", { locale: dateLocale })}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deletePayment(pay.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm tracking-wider">{t('manage.messages')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Textarea placeholder={t('manage.writeMessage')} value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1" />
                  <Button onClick={addMessage} className="self-end">{t('manage.sendMsg')}</Button>
                </div>
                <div className="h-[40vh] overflow-y-auto pr-2 space-y-2">
                  {messages.map((msg: any) => (
                    <div key={msg.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(msg.created_at), "dd MMM, HH:mm", { locale: dateLocale })}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteMessage(msg.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <ResultsReport bolaoId={bolaoId!} bolaoNickname={bolao.nickname} competitionId={bolao.competition_id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default BolaoManage;
