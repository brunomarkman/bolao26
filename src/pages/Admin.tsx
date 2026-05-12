import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Save, CheckCircle, AlertTriangle, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import EditMatchModal from '@/components/admin/EditMatchModal';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import TeamName from '@/components/TeamName';
import trophyImg from '@/assets/trophy.png';
import { COMPETITION_FORMATS } from '@/types/bolao';
import type { Competition } from '@/types/bolao';
import LanguageSelector from '@/components/LanguageSelector';
import { useLanguage } from '@/i18n/LanguageContext';

type Phase = Tables<'phases'>;
type Match = Tables<'matches'>;
type Message = Tables<'messages'>;

const Admin = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? enUS : ptBR;

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [newCompName, setNewCompName] = useState('');
  const [newCompYear, setNewCompYear] = useState('');
  const [newCompStart, setNewCompStart] = useState('');
  const [newCompEnd, setNewCompEnd] = useState('');
  const [newCompClubs, setNewCompClubs] = useState('32');
  const [newCompFormat, setNewCompFormat] = useState<string>('Grupo + Mata-mata');
  const [newCompFee, setNewCompFee] = useState('0');

  // Extra questions (admin)
  const [extraChampionOptions, setExtraChampionOptions] = useState<string[]>([]);
  const [extraChampion, setExtraChampion] = useState('');
  const [extraGoldenBall, setExtraGoldenBall] = useState('');
  const [extraTopScorer, setExtraTopScorer] = useState('');
  const [extraSavingField, setExtraSavingField] = useState<string | null>(null);

  const [phases, setPhases] = useState<Phase[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const [newTeamA, setNewTeamA] = useState('');
  const [newTeamB, setNewTeamB] = useState('');
  const [newMatchDate, setNewMatchDate] = useState('');
  const [newMatchTime, setNewMatchTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageBolaoId, setMessageBolaoId] = useState<string>('all');
  const [messageBoloes, setMessageBoloes] = useState<{ id: string; nickname: string }[]>([]);

  const [resultScoreA, setResultScoreA] = useState<Record<string, string>>({});
  const [resultScoreB, setResultScoreB] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('boloes');
  const [allBoloes, setAllBoloes] = useState<any[]>([]);
  const [lockMinutes, setLockMinutes] = useState('10');
  const [lockMinutesLoading, setLockMinutesLoading] = useState(false);
  const [finalizeReady, setFinalizeReady] = useState<Record<string, boolean>>({});

  const isSiteAdmin = profile?.email === 'brunomarkman@gmail.com';

  useEffect(() => {
    if (!isSiteAdmin) { navigate('/'); return; }
    fetchCompetitions(); fetchMessages(); fetchMessageBoloes(); fetchLockMinutes(); fetchAllBoloes();
  }, [isSiteAdmin]);

  const fetchAllBoloes = async () => {
    const { data: boloesData } = await (supabase as any)
      .from('boloes').select('*').order('created_at', { ascending: false });
    if (!boloesData || boloesData.length === 0) { setAllBoloes([]); return; }
    const ids = boloesData.map((b: any) => String(b.id));
    const creatorIds = Array.from(new Set(boloesData.map((b: any) => String(b.created_by))));
    const compIds = Array.from(new Set(boloesData.map((b: any) => String(b.competition_id))));
    const [profilesRes, compsRes, partsRes, paysRes] = await Promise.all([
      (supabase as any).from('profiles').select('user_id, name, email, city, country').in('user_id', creatorIds),
      (supabase as any).from('competitions').select('id, name').in('id', compIds),
      (supabase as any).from('bolao_participants').select('bolao_id, user_id, total_score, is_active').in('bolao_id', ids),
      (supabase as any).from('payments').select('bolao_id').in('bolao_id', ids),
    ]);
    const profilesAll = (await supabase.from('profiles').select('user_id, name')).data || [];
    const rows = boloesData.map((b: any) => {
      const creator = (profilesRes.data || []).find((p: any) => p.user_id === b.created_by);
      const comp = (compsRes.data || []).find((c: any) => c.id === b.competition_id);
      const parts = (partsRes.data || []).filter((p: any) => p.bolao_id === b.id);
      const paidCount = (paysRes.data || []).filter((p: any) => p.bolao_id === b.id).length;
      let winnerName: string | undefined;
      if (b.status === 'finished' && parts.length > 0) {
        const top = [...parts].sort((a: any, x: any) => x.total_score - a.total_score)[0];
        winnerName = profilesAll.find((p: any) => p.user_id === top.user_id)?.name;
      }
      return {
        ...b,
        creatorName: creator?.name || '—',
        creatorEmail: creator?.email || '—',
        creatorCity: creator?.city || '—',
        creatorCountry: creator?.country || '—',
        competitionName: comp?.name || '—',
        paidCount,
        totalCollected: paidCount * Number(b.bet_value || 0),
        winnerName: winnerName || '—',
      };
    });
    setAllBoloes(rows);
  };

  useEffect(() => {
    if (selectedCompetition) { fetchPhasesAndMatches(); fetchExtraResults(); }
    else { setPhases([]); setMatches([]); setSelectedPhase(''); setExtraChampion(''); setExtraGoldenBall(''); setExtraTopScorer(''); setExtraChampionOptions([]); }
  }, [selectedCompetition]);

  useEffect(() => { if (competitions.length > 0) computeFinalizeReady(); }, [competitions]);

  const computeFinalizeReady = async () => {
    const result: Record<string, boolean> = {};
    const compIds = competitions.map(c => c.id);
    if (compIds.length === 0) { setFinalizeReady({}); return; }
    const [phasesRes, boloesRes, extrasRes] = await Promise.all([
      (supabase as any).from('phases').select('id, competition_id, number').in('competition_id', compIds),
      (supabase as any).from('boloes').select('id, competition_id, extra_champion_enabled, extra_golden_ball_enabled, extra_top_scorer_enabled').in('competition_id', compIds),
      (supabase as any).from('competition_extra_results').select('competition_id, champion, golden_ball, top_scorer').in('competition_id', compIds),
    ]);
    const allPhases = phasesRes.data || [];
    const phaseIds = allPhases.map((p: any) => p.id);
    const matchesRes = phaseIds.length > 0
      ? await supabase.from('matches').select('phase_id, is_finished').in('phase_id', phaseIds)
      : { data: [] as any[] };
    const allMatches = matchesRes.data || [];
    for (const c of competitions) {
      const cPhases = allPhases.filter((p: any) => p.competition_id === c.id);
      if (cPhases.length === 0) { result[c.id] = false; continue; }
      const finalPhase = cPhases.reduce((a: any, b: any) => (a.number > b.number ? a : b));
      const finalMatches = allMatches.filter((m: any) => m.phase_id === finalPhase.id);
      const finalDone = finalMatches.length > 0 && finalMatches.every((m: any) => m.is_finished);
      const cBoloes = (boloesRes.data || []).filter((b: any) => b.competition_id === c.id);
      const champEnabled = cBoloes.some((b: any) => b.extra_champion_enabled);
      const gbEnabled = cBoloes.some((b: any) => b.extra_golden_ball_enabled);
      const tsEnabled = cBoloes.some((b: any) => b.extra_top_scorer_enabled);
      const er = (extrasRes.data || []).find((e: any) => e.competition_id === c.id);
      const extrasOk =
        (!champEnabled || (er?.champion && String(er.champion).trim())) &&
        (!gbEnabled || (er?.golden_ball && String(er.golden_ball).trim())) &&
        (!tsEnabled || (er?.top_scorer && String(er.top_scorer).trim()));
      result[c.id] = finalDone && !!extrasOk;
    }
    setFinalizeReady(result);
  };

  const fetchExtraResults = async () => {
    if (!selectedCompetition) return;
    // Champion options from group phase (number=1)
    const { data: groupPhase } = await (supabase as any).from('phases').select('id').eq('competition_id', selectedCompetition).eq('number', 1).maybeSingle();
    if (groupPhase) {
      const { data: gm } = await supabase.from('matches').select('team_a, team_b').eq('phase_id', groupPhase.id);
      const teams = new Set<string>();
      (gm || []).forEach((m: any) => { if (m.team_a) teams.add(m.team_a); if (m.team_b) teams.add(m.team_b); });
      setExtraChampionOptions(Array.from(teams).sort());
    } else { setExtraChampionOptions([]); }
    const { data: existing } = await (supabase as any).from('competition_extra_results').select('*').eq('competition_id', selectedCompetition).maybeSingle();
    if (existing) {
      setExtraChampion(existing.champion || '');
      setExtraGoldenBall(existing.golden_ball || '');
      setExtraTopScorer(existing.top_scorer || '');
    } else {
      setExtraChampion(''); setExtraGoldenBall(''); setExtraTopScorer('');
    }
  };

  const saveExtraField = async (field: 'champion' | 'golden_ball' | 'top_scorer', value: string) => {
    if (!selectedCompetition) return;
    setExtraSavingField(field);
    try {
      const cleaned = field === 'champion' ? value : value.toUpperCase().trim();
      const { data: existing } = await (supabase as any).from('competition_extra_results').select('id').eq('competition_id', selectedCompetition).maybeSingle();
      if (existing) {
        const { error } = await (supabase as any).from('competition_extra_results').update({ [field]: cleaned || null }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('competition_extra_results').insert({ competition_id: selectedCompetition, [field]: cleaned || null });
        if (error) throw error;
      }
      const { error: rpcError } = await (supabase as any).rpc('process_extra_question', { p_competition_id: selectedCompetition, p_field: field });
      if (rpcError) throw rpcError;
      toast.success(t('admin.extraSaved'));
    } catch (e) {
      toast.error(t('admin.extraError'));
    } finally { setExtraSavingField(null); }
  };


  const fetchCompetitions = async () => {
    const { data } = await (supabase as any).from('competitions').select('*').order('year', { ascending: false });
    if (data) {
      setCompetitions(data);
      // Pre-select if only one active/waiting competition
      if (!selectedCompetition) {
        const activeOrWaiting = data.filter((c: Competition) => {
          const startDate = c.start_date ? new Date(c.start_date) : null;
          const endDate = c.end_date ? new Date(c.end_date) : null;
          const now = new Date();
          // "active" = started and not ended, "waiting" = not started yet or no dates
          if (endDate && endDate < now) return false;
          return true;
        });
        if (activeOrWaiting.length === 1) {
          setSelectedCompetition(activeOrWaiting[0].id);
        }
      }
    }
  };

  const fetchPhasesAndMatches = async () => {
    const [phasesRes, matchesRes] = await Promise.all([
      (supabase as any).from('phases').select('*').eq('competition_id', selectedCompetition).order('number'),
      supabase.from('matches').select('*').order('match_date', { ascending: true }),
    ]);
    if (phasesRes.data) { setPhases(phasesRes.data); if (!selectedPhase || !phasesRes.data.find((p: Phase) => p.id === selectedPhase)) { if (phasesRes.data.length > 0) setSelectedPhase(phasesRes.data[0].id); else setSelectedPhase(''); } }
    if (matchesRes.data) setMatches(matchesRes.data);
  };

  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (data) setMessages(data);
  };

  const fetchMessageBoloes = async () => {
    const { data } = await (supabase as any).from('boloes').select('id, nickname').order('nickname');
    if (data) setMessageBoloes(data);
  };

  const addCompetition = async () => {
    if (!newCompName.trim() || !newCompYear) { toast.error(t('admin.fillNameYear')); return; }
    await (supabase as any).from('competitions').insert({ name: newCompName.trim(), year: parseInt(newCompYear), start_date: newCompStart || null, end_date: newCompEnd || null, total_clubs: parseInt(newCompClubs) || 32, format: newCompFormat, fee: parseFloat(newCompFee) || 0 });
    setNewCompName(''); setNewCompYear(''); setNewCompStart(''); setNewCompEnd(''); setNewCompClubs('32'); setNewCompFormat('Grupo + Mata-mata'); setNewCompFee('0');
    toast.success(t('admin.compCreated')); fetchCompetitions();
  };

  const finalizeCompetition = async (competitionId: string) => {
    if (!confirm(t('admin.confirmFinalize'))) return;
    // Mark all bolões using this competition as finished
    await (supabase as any).from('boloes').update({ status: 'finished' }).eq('competition_id', competitionId);
    // Deactivate all phases
    await (supabase as any).from('phases').update({ is_active: false }).eq('competition_id', competitionId);
    toast.success(t('admin.competitionFinalized'));
    fetchCompetitions();
    if (selectedCompetition === competitionId) fetchPhasesAndMatches();
  };

  const canFinalize = (competitionId: string): boolean => {
    // Need to check matches/extras synchronously from state — only works if user selected the comp
    // We allow click anytime; the criteria are evaluated via finalizeReady map below
    return finalizeReady[competitionId] === true;
  };

  const deleteCompetition = async (id: string) => {
    if (!confirm(t('admin.deleteComp'))) return;
    const { data: compPhases } = await (supabase as any).from('phases').select('id').eq('competition_id', id);
    if (compPhases && compPhases.length > 0) {
      const phaseIds = compPhases.map((p: any) => p.id);
      await supabase.from('predictions').delete().in('match_id', (await supabase.from('matches').select('id').in('phase_id', phaseIds)).data?.map((m: any) => m.id) || []);
      await supabase.from('matches').delete().in('phase_id', phaseIds);
      await (supabase as any).from('phases').delete().eq('competition_id', id);
    }
    await (supabase as any).from('competitions').delete().eq('id', id);
    if (selectedCompetition === id) setSelectedCompetition('');
    toast.success(t('admin.compRemoved')); fetchCompetitions();
  };

  const togglePhase = async (phaseId: string, isActive: boolean) => {
    if (isActive) {
      // Deactivate all other phases first
      const otherActive = phases.filter(p => p.is_active && p.id !== phaseId);
      for (const p of otherActive) {
        await supabase.from('phases').update({ is_active: false }).eq('id', p.id);
      }
    }
    await supabase.from('phases').update({ is_active: isActive }).eq('id', phaseId);
    toast.success(isActive ? t('admin.phaseActivated') : t('admin.phaseDeactivated'));
    fetchPhasesAndMatches();
  };

  const addMatch = async () => {
    if (!selectedPhase || !newTeamA || !newTeamB) { toast.error(t('admin.fillTeams')); return; }
    let matchDate = null;
    if (newMatchDate && newMatchTime) matchDate = new Date(`${newMatchDate}T${newMatchTime}:00`).toISOString();
    await supabase.from('matches').insert({ phase_id: selectedPhase, team_a: newTeamA, team_b: newTeamB, match_date: matchDate, location: newLocation, group_name: newGroup || null });
    setNewTeamA(''); setNewTeamB(''); setNewMatchDate(''); setNewMatchTime(''); setNewLocation(''); setNewGroup('');
    toast.success(t('admin.matchAdded')); fetchPhasesAndMatches();
  };

  const deleteMatch = async (id: string) => { await supabase.from('matches').delete().eq('id', id); toast.success(t('admin.matchRemoved')); fetchPhasesAndMatches(); };

  const deleteAllMatches = async () => {
    if (!confirm(t('admin.confirmDeleteAllMatches'))) return;
    const phaseIds = phases.map(p => p.id);
    if (phaseIds.length === 0) return;
    const matchIds = matches.filter(m => phaseIds.includes(m.phase_id)).map(m => m.id);
    if (matchIds.length > 0) { await supabase.from('predictions').delete().in('match_id', matchIds); await supabase.from('matches').delete().in('id', matchIds); }
    toast.success(t('admin.allMatchesRemoved')); fetchPhasesAndMatches();
  };

  const submitResult = async (matchId: string) => {
    const sA = parseInt(resultScoreA[matchId] ?? ''); const sB = parseInt(resultScoreB[matchId] ?? '');
    if (isNaN(sA) || isNaN(sB)) { toast.error(t('admin.enterScore')); return; }
    await supabase.from('matches').update({ score_a: sA, score_b: sB, is_finished: true }).eq('id', matchId);
    await supabase.rpc('process_match_result', { p_match_id: matchId });
    toast.success(t('admin.resultSubmitted')); fetchPhasesAndMatches();
  };

  const revertResult = async (matchId: string) => { await supabase.rpc('revert_match_result', { p_match_id: matchId }); toast.success(t('admin.resultReverted')); fetchPhasesAndMatches(); };

  const revertAllResults = async () => {
    if (!confirm(t('admin.confirmRevertAll'))) return;
    const finished = phaseMatches.filter(m => m.is_finished);
    for (const m of finished) await supabase.rpc('revert_match_result', { p_match_id: m.id });
    toast.success(t('admin.allReverted')); fetchPhasesAndMatches();
  };

  const addMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const insertData: any = { content: newMessage, created_by: user.id, source: 'admin', tipo: 'A' };
    if (messageBolaoId !== 'all') insertData.bolao_id = messageBolaoId;
    await (supabase as any).from('messages').insert(insertData);
    setNewMessage(''); toast.success(t('admin.messageSent')); fetchMessages();
  };

  const deleteMessage = async (id: string) => { await supabase.from('messages').delete().eq('id', id); toast.success(t('admin.messageRemoved')); fetchMessages(); };

  const fetchLockMinutes = async () => {
    const { data } = await supabase.from('settings').select('*').eq('key', 'lock_minutes_before_match').maybeSingle();
    if (data) setLockMinutes(data.value);
  };

  const saveLockMinutes = async () => {
    const val = parseInt(lockMinutes);
    if (isNaN(val) || val < 0) { toast.error(t('admin.prefInvalidMinutes')); return; }
    setLockMinutesLoading(true);
    const { data: existing } = await supabase.from('settings').select('id').eq('key', 'lock_minutes_before_match').maybeSingle();
    if (existing) {
      await supabase.from('settings').update({ value: String(val) }).eq('id', existing.id);
    } else {
      await supabase.from('settings').insert({ key: 'lock_minutes_before_match', value: String(val) });
    }
    toast.success(t('admin.prefSaved'));
    setLockMinutesLoading(false);
  };

  const phaseIds = phases.map(p => p.id);
  const competitionMatches = matches.filter(m => phaseIds.includes(m.phase_id));
  const phaseMatches = competitionMatches.filter(m => m.phase_id === selectedPhase);
  const selectedComp = competitions.find(c => c.id === selectedCompetition);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')}><ArrowLeft className="w-4 h-4" /></Button>
            <img src={trophyImg} alt="Troféu" className="w-6 h-6 object-contain" />
            <h1 className="font-display text-lg tracking-wider text-primary font-bold">{t('admin.title')}</h1>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="hidden md:grid w-full grid-cols-6">
            <TabsTrigger value="boloes" className="font-display text-xs tracking-wider">{t('admin.boloes')}</TabsTrigger>
            <TabsTrigger value="competitions" className="font-display text-xs tracking-wider">{t('admin.competitions')}</TabsTrigger>
            <TabsTrigger value="phases" className="font-display text-xs tracking-wider">{t('admin.phases')}</TabsTrigger>
            <TabsTrigger value="results" className="font-display text-xs tracking-wider">{t('admin.results')}</TabsTrigger>
            <TabsTrigger value="messages" className="font-display text-xs tracking-wider">{t('admin.messages')}</TabsTrigger>
            <TabsTrigger value="preferences" className="font-display text-xs tracking-wider uppercase">{t('admin.preferences')}</TabsTrigger>
          </TabsList>
          <div className="md:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="font-display tracking-wider"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="boloes">{t('admin.boloes')}</SelectItem>
                <SelectItem value="competitions">{t('admin.competitions')}</SelectItem>
                <SelectItem value="phases">{t('admin.phases')}</SelectItem>
                <SelectItem value="results">{t('admin.results')}</SelectItem>
                <SelectItem value="messages">{t('admin.messages')}</SelectItem>
                <SelectItem value="preferences">{t('admin.preferences')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="boloes" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm tracking-wider">{t('admin.boloesTitle')}</CardTitle></CardHeader>
              <CardContent>
                {allBoloes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t('admin.noBoloes')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-2 font-display text-xs tracking-wider text-muted-foreground">{t('admin.colCreatedAt')}</th>
                          <th className="text-left p-2 font-display text-xs tracking-wider text-muted-foreground">{t('admin.colCompetition')}</th>
                          <th className="text-left p-2 font-display text-xs tracking-wider text-muted-foreground">{t('admin.colPoolName')}</th>
                          <th className="text-left p-2 font-display text-xs tracking-wider text-muted-foreground">{t('admin.colCreator')}</th>
                          <th className="text-left p-2 font-display text-xs tracking-wider text-muted-foreground">{t('admin.colEmail')}</th>
                          <th className="text-left p-2 font-display text-xs tracking-wider text-muted-foreground">{t('admin.colCity')}</th>
                          <th className="text-left p-2 font-display text-xs tracking-wider text-muted-foreground">{t('admin.colCountry')}</th>
                          <th className="text-right p-2 font-display text-xs tracking-wider text-muted-foreground">{t('admin.colBetValue')}</th>
                          <th className="text-center p-2 font-display text-xs tracking-wider text-muted-foreground">{t('admin.colPaidParticipants')}</th>
                          <th className="text-right p-2 font-display text-xs tracking-wider text-muted-foreground">{t('admin.colTotalCollected')}</th>
                          <th className="text-left p-2 font-display text-xs tracking-wider text-muted-foreground">{t('admin.colWinner')}</th>
                          <th className="text-center p-2 font-display text-xs tracking-wider text-muted-foreground">{t('admin.colStatus')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allBoloes.map(b => (
                          <tr key={b.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="p-2 text-xs">{format(new Date(b.created_at), "dd MMM yyyy", { locale: dateLocale })}</td>
                            <td className="p-2">{b.competitionName}</td>
                            <td className="p-2 font-medium">{b.nickname}</td>
                            <td className="p-2">{b.creatorName}</td>
                            <td className="p-2 text-xs">{b.creatorEmail}</td>
                            <td className="p-2">{b.creatorCity}</td>
                            <td className="p-2">{b.creatorCountry}</td>
                            <td className="p-2 text-right font-medium">$ {Number(b.bet_value || 0).toFixed(2)}</td>
                            <td className="p-2 text-center font-medium">{b.paidCount}</td>
                            <td className="p-2 text-right font-medium">$ {b.totalCollected.toFixed(2)}</td>
                            <td className="p-2">{b.winnerName}</td>
                            <td className="p-2 text-center"><Badge variant="outline">{t(`status.${b.status}` as any)}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="competitions" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm tracking-wider">{t('admin.createCompetition')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder={t('admin.compName')} value={newCompName} onChange={e => setNewCompName(e.target.value)} />
                  <Input type="number" placeholder={t('admin.compYear')} value={newCompYear} onChange={e => setNewCompYear(e.target.value)} />
                  <Input type="date" placeholder={t('admin.compStart')} value={newCompStart} onChange={e => setNewCompStart(e.target.value)} />
                  <Input type="date" placeholder={t('admin.compEnd')} value={newCompEnd} onChange={e => setNewCompEnd(e.target.value)} />
                  <Input type="number" placeholder={t('admin.compClubs')} value={newCompClubs} onChange={e => setNewCompClubs(e.target.value)} />
                  <Select value={newCompFormat} onValueChange={setNewCompFormat}>
                    <SelectTrigger><SelectValue placeholder={t('admin.compFormat')} /></SelectTrigger>
                    <SelectContent>{COMPETITION_FORMATS.map(f => (<SelectItem key={f} value={f}>{f}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <Button onClick={addCompetition} className="gap-2"><Plus className="w-4 h-4" /> {t('admin.createComp')}</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-display text-sm tracking-wider">{t('admin.compRegistered')}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[40vh] min-h-[18rem] overflow-y-auto pr-2">
                  <div className="space-y-2">
                    {competitions.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div>
                          <p className="text-sm font-medium">{c.name} ({c.year})</p>
                          <p className="text-xs text-muted-foreground">{c.start_date || '—'} a {c.end_date || '—'} • {c.total_clubs || '—'} clubes • {c.format || '—'}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteCompetition(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    ))}
                    {competitions.length === 0 && <p className="text-center text-muted-foreground py-8">{t('admin.noCompetitions')}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="phases" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm tracking-wider">{t('admin.selectCompetition')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
                  <SelectTrigger><SelectValue placeholder={t('admin.selectCompPlaceholder')} /></SelectTrigger>
                  <SelectContent>{competitions.map(c => (<SelectItem key={c.id} value={c.id}>{c.name} ({c.year})</SelectItem>))}</SelectContent>
                </Select>
                {selectedComp && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="p-2 bg-muted/30 rounded-lg text-center"><p className="text-xs text-muted-foreground">{t('home.year')}</p><p className="font-bold">{selectedComp.year}</p></div>
                    <div className="p-2 bg-muted/30 rounded-lg text-center"><p className="text-xs text-muted-foreground">{t('home.start')}</p><p className="font-bold">{selectedComp.start_date || '—'}</p></div>
                    <div className="p-2 bg-muted/30 rounded-lg text-center"><p className="text-xs text-muted-foreground">{t('home.end')}</p><p className="font-bold">{selectedComp.end_date || '—'}</p></div>
                    <div className="p-2 bg-muted/30 rounded-lg text-center"><p className="text-xs text-muted-foreground">{t('admin.compClubs')}</p><p className="font-bold">{selectedComp.total_clubs || '—'}</p></div>
                    <div className="col-span-2 sm:col-span-4 p-2 bg-muted/30 rounded-lg text-center"><p className="text-xs text-muted-foreground">{t('admin.compFormat')}</p><p className="font-bold">{selectedComp.format || '—'}</p></div>
                  </div>
                )}
              </CardContent>
            </Card>

            {!selectedCompetition ? (
              <Card><CardContent className="py-8"><p className="text-center text-muted-foreground">{t('admin.selectCompForPhases')}</p></CardContent></Card>
            ) : (
              <>
                <Card>
                  <CardHeader><CardTitle className="font-display text-sm tracking-wider">{t('admin.activatePhases')}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {phases.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                          <span className="text-sm font-medium">{p.name}</span>
                          <Switch checked={p.is_active} onCheckedChange={v => togglePhase(p.id, v)} />
                        </div>
                      ))}
                      {phases.length === 0 && <p className="text-muted-foreground col-span-full text-center py-4">{t('admin.noPhases')}</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="font-display text-sm tracking-wider">{t('admin.configMatches')}</CardTitle>
                    <Button variant="destructive" size="sm" className="gap-1" onClick={deleteAllMatches}><AlertTriangle className="w-3 h-3" /> {t('admin.resetAllMatches')}</Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                      <SelectTrigger><SelectValue placeholder={t('admin.selectPhase')} /></SelectTrigger>
                      <SelectContent>{phases.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder={t('admin.teamA')} value={newTeamA} onChange={e => setNewTeamA(e.target.value)} />
                      <Input placeholder={t('admin.teamB')} value={newTeamB} onChange={e => setNewTeamB(e.target.value)} />
                      <Input type="date" value={newMatchDate} onChange={e => setNewMatchDate(e.target.value)} />
                      <Input type="time" value={newMatchTime} onChange={e => setNewMatchTime(e.target.value)} />
                      <Input placeholder={t('admin.location')} value={newLocation} onChange={e => setNewLocation(e.target.value)} />
                      <Input placeholder={t('admin.group')} value={newGroup} onChange={e => setNewGroup(e.target.value)} />
                    </div>
                    <Button onClick={addMatch} className="gap-2" disabled={!selectedPhase}><Plus className="w-4 h-4" /> {t('admin.addMatch')}</Button>
                    <div className="h-80 overflow-y-auto pr-2">
                      <div className="space-y-2">
                        {phaseMatches.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                            <div>
                              <p className="text-sm font-medium">
                                <TeamName name={m.team_a} side="left" /> vs <TeamName name={m.team_b} side="right" />
                                {m.group_name && <span className="text-muted-foreground"> ({t('admin.group_prefix')} {m.group_name})</span>}
                              </p>
                              {m.match_date && (
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(m.match_date), "dd MMM HH:mm", { locale: dateLocale })}
                                  {m.location && ` • ${m.location}`}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {m.is_finished && <CheckCircle className="w-4 h-4 text-primary" />}
                              <Button variant="ghost" size="icon" onClick={() => { setEditMatch(m); setEditOpen(true); }}><Pencil className="w-4 h-4 text-muted-foreground" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteMatch(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm tracking-wider">{t('admin.selectCompetition')}</CardTitle></CardHeader>
              <CardContent>
                <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
                  <SelectTrigger><SelectValue placeholder={t('admin.selectCompPlaceholder')} /></SelectTrigger>
                  <SelectContent>{competitions.map(c => (<SelectItem key={c.id} value={c.id}>{c.name} ({c.year})</SelectItem>))}</SelectContent>
                </Select>
              </CardContent>
            </Card>
            {!selectedCompetition ? (
              <Card><CardContent className="py-8"><p className="text-center text-muted-foreground">{t('admin.selectCompForResults')}</p></CardContent></Card>
            ) : (
              <>
                <Card>
                  <CardHeader><CardTitle className="font-display text-sm tracking-wider">{t('admin.launchResults')}</CardTitle></CardHeader>
                  <CardContent>
                    <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                      <SelectTrigger className="mb-4"><SelectValue placeholder={t('admin.selectPhase')} /></SelectTrigger>
                      <SelectContent>{phases.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                    </Select>
                    <div className="h-[40vh] min-h-[18rem] overflow-y-auto pr-2">
                      <div className="space-y-3">
                        {phaseMatches.filter(m => !m.is_finished).map(m => (
                          <div key={m.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                            <p className="text-sm font-medium text-center"><TeamName name={m.team_a} side="left" /> vs <TeamName name={m.team_b} side="right" /></p>
                            {m.match_date && <p className="text-xs text-muted-foreground text-center">{format(new Date(m.match_date), "dd MMM, HH:mm", { locale: dateLocale })}</p>}
                            <div className="flex items-center justify-center gap-3">
                              <Input type="number" min="0" className="w-16 text-center font-display font-bold" value={resultScoreA[m.id] ?? ''} onChange={e => setResultScoreA(p => ({ ...p, [m.id]: e.target.value }))} />
                              <span className="font-display text-lg text-muted-foreground">×</span>
                              <Input type="number" min="0" className="w-16 text-center font-display font-bold" value={resultScoreB[m.id] ?? ''} onChange={e => setResultScoreB(p => ({ ...p, [m.id]: e.target.value }))} />
                            </div>
                            <Button onClick={() => submitResult(m.id)} className="w-full gap-2" size="sm"><Save className="w-4 h-4" /> {t('admin.launchResult')}</Button>
                          </div>
                        ))}
                        {phaseMatches.filter(m => !m.is_finished).length === 0 && <p className="text-center text-muted-foreground py-8">{t('admin.allFinished')}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="font-display text-sm tracking-wider">{t('admin.resultsLaunched')}</CardTitle>
                    {phaseMatches.filter(m => m.is_finished).length > 0 && (
                      <Button variant="destructive" size="sm" className="gap-1" onClick={revertAllResults}><Trash2 className="w-3 h-3" /> {t('admin.revertAll')}</Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="h-[40vh] min-h-[18rem] overflow-y-auto pr-2">
                      <div className="space-y-2">
                        {phaseMatches.filter(m => m.is_finished).map(m => (
                          <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                            <div>
                              <p className="text-sm font-medium">
                                <TeamName name={m.team_a} side="left" /> <span className="font-display font-bold text-primary">{m.score_a}</span>
                                {' × '}
                                <span className="font-display font-bold text-primary">{m.score_b}</span> <TeamName name={m.team_b} side="right" />
                              </p>
                              {m.match_date && <p className="text-xs text-muted-foreground">{format(new Date(m.match_date), "dd MMM HH:mm", { locale: dateLocale })}</p>}
                            </div>
                            <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => revertResult(m.id)}>
                              <Trash2 className="w-3 h-3" /> {t('admin.revert')}
                            </Button>
                          </div>
                        ))}
                        {phaseMatches.filter(m => m.is_finished).length === 0 && <p className="text-center text-muted-foreground py-8">{t('admin.noResults')}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="font-display text-sm tracking-wider">{t('admin.extrasTitle')}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium">{t('admin.extraChampion')}</label>
                      <div className="flex gap-2">
                        <Select value={extraChampion} onValueChange={setExtraChampion}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder={t('admin.extraSelectChampion')} /></SelectTrigger>
                          <SelectContent>{extraChampionOptions.map(team => (<SelectItem key={team} value={team}>{team}</SelectItem>))}</SelectContent>
                        </Select>
                        <Button onClick={() => saveExtraField('champion', extraChampion)} disabled={extraSavingField === 'champion'} className="gap-2"><Save className="w-4 h-4" /> {t('admin.extraSaveCalc')}</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">{t('admin.extraGoldenBall')}</label>
                      <div className="flex gap-2">
                        <Input className="uppercase flex-1" placeholder={t('admin.extraPlayerPlaceholder')} value={extraGoldenBall} onChange={e => setExtraGoldenBall(e.target.value.toUpperCase())} />
                        <Button onClick={() => saveExtraField('golden_ball', extraGoldenBall)} disabled={extraSavingField === 'golden_ball'} className="gap-2"><Save className="w-4 h-4" /> {t('admin.extraSaveCalc')}</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">{t('admin.extraTopScorer')}</label>
                      <div className="flex gap-2">
                        <Input className="uppercase flex-1" placeholder={t('admin.extraPlayerPlaceholder')} value={extraTopScorer} onChange={e => setExtraTopScorer(e.target.value.toUpperCase())} />
                        <Button onClick={() => saveExtraField('top_scorer', extraTopScorer)} disabled={extraSavingField === 'top_scorer'} className="gap-2"><Save className="w-4 h-4" /> {t('admin.extraSaveCalc')}</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm tracking-wider">{t('admin.messages')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Select value={messageBolaoId} onValueChange={setMessageBolaoId}>
                  <SelectTrigger><SelectValue placeholder={t('admin.messageDestination')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.allPools')}</SelectItem>
                    {messageBoloes.map(b => (<SelectItem key={b.id} value={b.id}>{b.nickname}</SelectItem>))}
                  </SelectContent>
                </Select>
                <div className="flex gap-3">
                  <Textarea placeholder={t('admin.writeMessage')} value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1" />
                  <Button onClick={addMessage} className="self-end">{t('admin.send')}</Button>
                </div>
                <div className="h-96 overflow-y-auto pr-2">
                  <div className="space-y-2">
                    {messages.map(msg => (
                      <div key={msg.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div>
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(msg.created_at), "dd MMM, HH:mm", { locale: dateLocale })}
                            {msg.bolao_id ? ` • ${messageBoloes.find(b => b.id === msg.bolao_id)?.nickname || 'Bolão'}` : ` • ${t('admin.global')}`}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteMessage(msg.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-display text-sm tracking-wider">{t('admin.prefTitle')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium whitespace-nowrap">{t('admin.prefLockBefore')}</label>
                  <Input type="number" min="0" className="w-24 text-center" value={lockMinutes} onChange={e => setLockMinutes(e.target.value)} />
                  <span className="text-sm text-muted-foreground">{t('admin.prefMinutes')}</span>
                </div>
                <Button onClick={saveLockMinutes} disabled={lockMinutesLoading} className="gap-2"><Save className="w-4 h-4" /> {t('admin.prefSaveBtn')}</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <EditMatchModal open={editOpen} onOpenChange={setEditOpen} match={editMatch} onSaved={fetchPhasesAndMatches} />
    </div>
  );
};

export default Admin;
