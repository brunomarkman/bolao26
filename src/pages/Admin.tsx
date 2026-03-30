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
import PaymentsTab from '@/components/admin/PaymentsTab';
import EditMatchModal from '@/components/admin/EditMatchModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import TeamName from '@/components/TeamName';
import trophyImg from '@/assets/trophy.png';
import { COMPETITION_FORMATS } from '@/types/bolao';
import type { Competition } from '@/types/bolao';

type Phase = Tables<'phases'>;
type Match = Tables<'matches'>;
type Message = Tables<'messages'>;

const Admin = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Competition state
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [newCompName, setNewCompName] = useState('');
  const [newCompYear, setNewCompYear] = useState('');
  const [newCompStart, setNewCompStart] = useState('');
  const [newCompEnd, setNewCompEnd] = useState('');
  const [newCompClubs, setNewCompClubs] = useState('32');
  const [newCompFormat, setNewCompFormat] = useState<string>('Grupo + Mata-mata');

  // Phases & matches state
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

  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageBolaoId, setMessageBolaoId] = useState<string>('all');
  const [messageBoloes, setMessageBoloes] = useState<{ id: string; nickname: string }[]>([]);

  // Results state
  const [resultScoreA, setResultScoreA] = useState<Record<string, string>>({});
  const [resultScoreB, setResultScoreB] = useState<Record<string, string>>({});

  const isSiteAdmin = profile?.email === 'brunomarkman@gmail.com';

  useEffect(() => {
    if (!isSiteAdmin) { navigate('/'); return; }
    fetchCompetitions();
    fetchMessages();
    fetchMessageBoloes();
  }, [isSiteAdmin]);

  // When competition changes, fetch phases & matches for it
  useEffect(() => {
    if (selectedCompetition) {
      fetchPhasesAndMatches();
    } else {
      setPhases([]);
      setMatches([]);
      setSelectedPhase('');
    }
  }, [selectedCompetition]);

  const fetchCompetitions = async () => {
    const { data } = await (supabase as any).from('competitions').select('*').order('year', { ascending: false });
    if (data) setCompetitions(data);
  };

  const fetchPhasesAndMatches = async () => {
    const [phasesRes, matchesRes] = await Promise.all([
      (supabase as any).from('phases').select('*').eq('competition_id', selectedCompetition).order('number'),
      supabase.from('matches').select('*').order('match_date', { ascending: true }),
    ]);
    if (phasesRes.data) {
      setPhases(phasesRes.data);
      if (phasesRes.data.length > 0) setSelectedPhase(phasesRes.data[0].id);
      else setSelectedPhase('');
    }
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

  // --- Competition CRUD ---
  const addCompetition = async () => {
    if (!newCompName.trim() || !newCompYear) {
      toast.error('Informe nome e ano da competição');
      return;
    }
    await (supabase as any).from('competitions').insert({
      name: newCompName.trim(),
      year: parseInt(newCompYear),
      start_date: newCompStart || null,
      end_date: newCompEnd || null,
      total_clubs: parseInt(newCompClubs) || 32,
      format: newCompFormat,
    });
    setNewCompName(''); setNewCompYear(''); setNewCompStart(''); setNewCompEnd(''); setNewCompClubs('32'); setNewCompFormat('Grupo + Mata-mata');
    toast.success('Competição criada');
    fetchCompetitions();
  };

  const deleteCompetition = async (id: string) => {
    if (!confirm('Deseja deletar esta competição? Isso removerá fases e jogos vinculados.')) return;
    // Delete matches of phases, then phases, then competition
    const { data: compPhases } = await (supabase as any).from('phases').select('id').eq('competition_id', id);
    if (compPhases && compPhases.length > 0) {
      const phaseIds = compPhases.map((p: any) => p.id);
      await supabase.from('predictions').delete().in('match_id',
        (await supabase.from('matches').select('id').in('phase_id', phaseIds)).data?.map((m: any) => m.id) || []
      );
      await supabase.from('matches').delete().in('phase_id', phaseIds);
      await (supabase as any).from('phases').delete().eq('competition_id', id);
    }
    await (supabase as any).from('competitions').delete().eq('id', id);
    if (selectedCompetition === id) setSelectedCompetition('');
    toast.success('Competição removida');
    fetchCompetitions();
  };

  // --- Phase/Match operations ---
  const togglePhase = async (phaseId: string, isActive: boolean) => {
    await supabase.from('phases').update({ is_active: isActive }).eq('id', phaseId);
    toast.success(`Fase ${isActive ? 'ativada' : 'desativada'}`);
    fetchPhasesAndMatches();
  };

  const addMatch = async () => {
    if (!selectedPhase || !newTeamA || !newTeamB) {
      toast.error('Preencha pelo menos os times');
      return;
    }
    let matchDate = null;
    if (newMatchDate && newMatchTime) {
      matchDate = new Date(`${newMatchDate}T${newMatchTime}:00`).toISOString();
    }
    await supabase.from('matches').insert({
      phase_id: selectedPhase, team_a: newTeamA, team_b: newTeamB,
      match_date: matchDate, location: newLocation, group_name: newGroup || null,
    });
    setNewTeamA(''); setNewTeamB(''); setNewMatchDate(''); setNewMatchTime(''); setNewLocation(''); setNewGroup('');
    toast.success('Jogo adicionado');
    fetchPhasesAndMatches();
  };

  const deleteMatch = async (id: string) => {
    await supabase.from('matches').delete().eq('id', id);
    toast.success('Jogo removido');
    fetchPhasesAndMatches();
  };

  const deleteAllMatches = async () => {
    if (!confirm('⚠️ ATENÇÃO: Isso irá deletar TODOS os jogos desta competição. Deseja continuar?')) return;
    const phaseIds = phases.map(p => p.id);
    if (phaseIds.length === 0) return;
    const matchIds = matches.filter(m => phaseIds.includes(m.phase_id)).map(m => m.id);
    if (matchIds.length > 0) {
      await supabase.from('predictions').delete().in('match_id', matchIds);
      await supabase.from('matches').delete().in('id', matchIds);
    }
    toast.success('Todos os jogos desta competição foram removidos');
    fetchPhasesAndMatches();
  };

  const submitResult = async (matchId: string) => {
    const sA = parseInt(resultScoreA[matchId] ?? '');
    const sB = parseInt(resultScoreB[matchId] ?? '');
    if (isNaN(sA) || isNaN(sB)) { toast.error('Informe o placar corretamente'); return; }
    await supabase.from('matches').update({ score_a: sA, score_b: sB, is_finished: true }).eq('id', matchId);
    await supabase.rpc('process_match_result', { p_match_id: matchId });
    toast.success('Resultado lançado e pontuação calculada!');
    fetchPhasesAndMatches();
  };

  const revertResult = async (matchId: string) => {
    await supabase.rpc('revert_match_result', { p_match_id: matchId });
    toast.success('Resultado revertido e pontuação recalculada!');
    fetchPhasesAndMatches();
  };

  const revertAllResults = async () => {
    if (!confirm('⚠️ Reverter TODOS os resultados desta fase?')) return;
    const finished = phaseMatches.filter(m => m.is_finished);
    for (const m of finished) {
      await supabase.rpc('revert_match_result', { p_match_id: m.id });
    }
    toast.success('Todos os resultados da fase foram revertidos');
    fetchPhasesAndMatches();
  };

  const addMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const insertData: any = { content: newMessage, created_by: user.id };
    if (messageBolaoId !== 'all') insertData.bolao_id = messageBolaoId;
    await supabase.from('messages').insert(insertData);
    setNewMessage('');
    toast.success('Mensagem enviada');
    fetchMessages();
  };

  const deleteMessage = async (id: string) => {
    await supabase.from('messages').delete().eq('id', id);
    toast.success('Mensagem removida');
    fetchMessages();
  };

  const phaseIds = phases.map(p => p.id);
  const competitionMatches = matches.filter(m => phaseIds.includes(m.phase_id));
  const phaseMatches = competitionMatches.filter(m => m.phase_id === selectedPhase);

  const selectedComp = competitions.find(c => c.id === selectedCompetition);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img src={trophyImg} alt="Troféu" className="w-6 h-6 object-contain" />
          <h1 className="font-display text-lg tracking-wider text-primary font-bold">ÁREA DE ADMINISTRAÇÃO DO SITE</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="competitions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="competitions" className="font-display text-xs tracking-wider">COMPETIÇÕES</TabsTrigger>
            <TabsTrigger value="phases" className="font-display text-xs tracking-wider">FASES</TabsTrigger>
            <TabsTrigger value="results" className="font-display text-xs tracking-wider">RESULTADOS</TabsTrigger>
            <TabsTrigger value="messages" className="font-display text-xs tracking-wider">MENSAGENS</TabsTrigger>
            <TabsTrigger value="payments" className="font-display text-xs tracking-wider">PAGAMENTOS</TabsTrigger>
          </TabsList>

          {/* Competitions Tab */}
          <TabsContent value="competitions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-sm tracking-wider">CRIAR NOVA COMPETIÇÃO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Nome da Competição" value={newCompName} onChange={e => setNewCompName(e.target.value)} />
                  <Input type="number" placeholder="Ano" value={newCompYear} onChange={e => setNewCompYear(e.target.value)} />
                  <Input type="date" placeholder="Data Início" value={newCompStart} onChange={e => setNewCompStart(e.target.value)} />
                  <Input type="date" placeholder="Data Final" value={newCompEnd} onChange={e => setNewCompEnd(e.target.value)} />
                  <Input type="number" placeholder="Total de Clubes" value={newCompClubs} onChange={e => setNewCompClubs(e.target.value)} />
                  <Select value={newCompFormat} onValueChange={setNewCompFormat}>
                    <SelectTrigger><SelectValue placeholder="Formato" /></SelectTrigger>
                    <SelectContent>
                      {COMPETITION_FORMATS.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addCompetition} className="gap-2">
                  <Plus className="w-4 h-4" /> Criar Competição
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-sm tracking-wider">COMPETIÇÕES CADASTRADAS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[40vh] min-h-[18rem] overflow-y-auto pr-2">
                  <div className="space-y-2">
                    {competitions.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div>
                          <p className="text-sm font-medium">{c.name} ({c.year})</p>
                          <p className="text-xs text-muted-foreground">
                            {c.start_date || '—'} a {c.end_date || '—'} • {c.total_clubs || '—'} clubes • {c.format || '—'}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteCompetition(c.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {competitions.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">Nenhuma competição cadastrada</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phases & Matches Tab */}
          <TabsContent value="phases" className="space-y-6">
            {/* Competition Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-sm tracking-wider">SELECIONE A COMPETIÇÃO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
                  <SelectTrigger><SelectValue placeholder="Selecione a competição" /></SelectTrigger>
                  <SelectContent>
                    {competitions.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.year})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedComp && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="p-2 bg-muted/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Ano</p>
                      <p className="font-bold">{selectedComp.year}</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Início</p>
                      <p className="font-bold">{selectedComp.start_date || '—'}</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Final</p>
                      <p className="font-bold">{selectedComp.end_date || '—'}</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Clubes</p>
                      <p className="font-bold">{selectedComp.total_clubs || '—'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-4 p-2 bg-muted/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Formato</p>
                      <p className="font-bold">{selectedComp.format || '—'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {!selectedCompetition ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">Selecione uma competição para gerenciar fases e jogos</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-sm tracking-wider">ATIVAR/DESATIVAR FASES</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {phases.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                          <span className="text-sm font-medium">{p.name}</span>
                          <Switch checked={p.is_active} onCheckedChange={v => togglePhase(p.id, v)} />
                        </div>
                      ))}
                      {phases.length === 0 && (
                        <p className="text-muted-foreground col-span-full text-center py-4">Nenhuma fase cadastrada para esta competição</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="font-display text-sm tracking-wider">CONFIGURAR JOGOS</CardTitle>
                    <Button variant="destructive" size="sm" className="gap-1" onClick={deleteAllMatches}>
                      <AlertTriangle className="w-3 h-3" /> Reset Todos Jogos
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                      <SelectTrigger><SelectValue placeholder="Selecione a fase" /></SelectTrigger>
                      <SelectContent>
                        {phases.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                      </SelectContent>
                    </Select>

                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Time A" value={newTeamA} onChange={e => setNewTeamA(e.target.value)} />
                      <Input placeholder="Time B" value={newTeamB} onChange={e => setNewTeamB(e.target.value)} />
                      <Input type="date" value={newMatchDate} onChange={e => setNewMatchDate(e.target.value)} />
                      <Input type="time" value={newMatchTime} onChange={e => setNewMatchTime(e.target.value)} />
                      <Input placeholder="Local" value={newLocation} onChange={e => setNewLocation(e.target.value)} />
                      <Input placeholder="Grupo (ex: A)" value={newGroup} onChange={e => setNewGroup(e.target.value)} />
                    </div>

                    <Button onClick={addMatch} className="gap-2" disabled={!selectedPhase}>
                      <Plus className="w-4 h-4" /> Adicionar Jogo
                    </Button>

                    <div className="h-80 overflow-y-auto pr-2">
                      <div className="space-y-2">
                        {phaseMatches.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                            <div>
                              <p className="text-sm font-medium">
                                <TeamName name={m.team_a} side="left" /> vs <TeamName name={m.team_b} side="right" />
                                {m.group_name && <span className="text-muted-foreground"> (Grupo {m.group_name})</span>}
                              </p>
                              {m.match_date && (
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(m.match_date), "dd MMM HH:mm", { locale: ptBR })}
                                  {m.location && ` • ${m.location}`}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {m.is_finished && <CheckCircle className="w-4 h-4 text-primary" />}
                              <Button variant="ghost" size="icon" onClick={() => { setEditMatch(m); setEditOpen(true); }}>
                                <Pencil className="w-4 h-4 text-muted-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteMatch(m.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
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

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-sm tracking-wider">SELECIONE A COMPETIÇÃO</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
                  <SelectTrigger><SelectValue placeholder="Selecione a competição" /></SelectTrigger>
                  <SelectContent>
                    {competitions.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.year})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {!selectedCompetition ? (
              <Card><CardContent className="py-8"><p className="text-center text-muted-foreground">Selecione uma competição</p></CardContent></Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-sm tracking-wider">LANÇAR RESULTADOS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                      <SelectTrigger className="mb-4"><SelectValue placeholder="Selecione a fase" /></SelectTrigger>
                      <SelectContent>
                        {phases.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <div className="h-[40vh] min-h-[18rem] overflow-y-auto pr-2">
                      <div className="space-y-3">
                        {phaseMatches.filter(m => !m.is_finished).map(m => (
                          <div key={m.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                            <p className="text-sm font-medium text-center"><TeamName name={m.team_a} side="left" /> vs <TeamName name={m.team_b} side="right" /></p>
                            {m.match_date && (
                              <p className="text-xs text-muted-foreground text-center">
                                {format(new Date(m.match_date), "dd MMM, HH:mm", { locale: ptBR })}
                              </p>
                            )}
                            <div className="flex items-center justify-center gap-3">
                              <Input type="number" min="0" className="w-16 text-center font-display font-bold"
                                value={resultScoreA[m.id] ?? ''} onChange={e => setResultScoreA(p => ({ ...p, [m.id]: e.target.value }))} />
                              <span className="font-display text-lg text-muted-foreground">×</span>
                              <Input type="number" min="0" className="w-16 text-center font-display font-bold"
                                value={resultScoreB[m.id] ?? ''} onChange={e => setResultScoreB(p => ({ ...p, [m.id]: e.target.value }))} />
                            </div>
                            <Button onClick={() => submitResult(m.id)} className="w-full gap-2" size="sm">
                              <Save className="w-4 h-4" /> Lançar Resultado
                            </Button>
                          </div>
                        ))}
                        {phaseMatches.filter(m => !m.is_finished).length === 0 && (
                          <p className="text-center text-muted-foreground py-8">Todos os jogos desta fase já foram finalizados</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="font-display text-sm tracking-wider">RESULTADOS LANÇADOS</CardTitle>
                    {phaseMatches.filter(m => m.is_finished).length > 0 && (
                      <Button variant="destructive" size="sm" className="gap-1" onClick={revertAllResults}>
                        <Trash2 className="w-3 h-3" /> Reverter Todos
                      </Button>
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
                              {m.match_date && (
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(m.match_date), "dd MMM HH:mm", { locale: ptBR })}
                                </p>
                              )}
                            </div>
                            <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => revertResult(m.id)}>
                              <Trash2 className="w-3 h-3" /> Reverter
                            </Button>
                          </div>
                        ))}
                        {phaseMatches.filter(m => m.is_finished).length === 0 && (
                          <p className="text-center text-muted-foreground py-8">Nenhum resultado lançado nesta fase</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-sm tracking-wider">MENSAGENS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={messageBolaoId} onValueChange={setMessageBolaoId}>
                  <SelectTrigger><SelectValue placeholder="Destino da mensagem" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os bolões (global)</SelectItem>
                    {messageBoloes.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.nickname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-3">
                  <Textarea placeholder="Escreva uma mensagem..." value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1" />
                  <Button onClick={addMessage} className="self-end">Enviar</Button>
                </div>
                <div className="h-96 overflow-y-auto pr-2">
                  <div className="space-y-2">
                    {messages.map(msg => (
                      <div key={msg.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div>
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(msg.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                            {msg.bolao_id ? ` • ${messageBoloes.find(b => b.id === msg.bolao_id)?.nickname || 'Bolão'}` : ' • Global'}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteMessage(msg.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <PaymentsTab />
          </TabsContent>
        </Tabs>
      </main>

      <EditMatchModal
        open={editOpen}
        onOpenChange={setEditOpen}
        match={editMatch}
        onSaved={fetchPhasesAndMatches}
      />
    </div>
  );
};

export default Admin;
