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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Trophy, Save, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import TeamName from '@/components/TeamName';

type Phase = Tables<'phases'>;
type Match = Tables<'matches'>;
type Message = Tables<'messages'>;

const Admin = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');

  // New match fields
  const [newTeamA, setNewTeamA] = useState('');
  const [newTeamB, setNewTeamB] = useState('');
  const [newMatchDate, setNewMatchDate] = useState('');
  const [newMatchTime, setNewMatchTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newGroup, setNewGroup] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    const [phasesRes, matchesRes, messagesRes] = await Promise.all([
      supabase.from('phases').select('*').order('number'),
      supabase.from('matches').select('*').order('match_date', { ascending: true }),
      supabase.from('messages').select('*').order('created_at', { ascending: false }),
    ]);
    if (phasesRes.data) {
      setPhases(phasesRes.data);
      if (!selectedPhase && phasesRes.data.length > 0) setSelectedPhase(phasesRes.data[0].id);
    }
    if (matchesRes.data) setMatches(matchesRes.data);
    if (messagesRes.data) setMessages(messagesRes.data);
  };

  const togglePhase = async (phaseId: string, isActive: boolean) => {
    await supabase.from('phases').update({ is_active: isActive }).eq('id', phaseId);
    toast.success(`Fase ${isActive ? 'ativada' : 'desativada'}`);
    fetchAll();
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
      phase_id: selectedPhase,
      team_a: newTeamA,
      team_b: newTeamB,
      match_date: matchDate,
      location: newLocation,
      group_name: newGroup || null,
    });
    setNewTeamA(''); setNewTeamB(''); setNewMatchDate(''); setNewMatchTime(''); setNewLocation(''); setNewGroup('');
    toast.success('Jogo adicionado');
    fetchAll();
  };

  const deleteMatch = async (id: string) => {
    await supabase.from('matches').delete().eq('id', id);
    toast.success('Jogo removido');
    fetchAll();
  };

  const [resultScoreA, setResultScoreA] = useState<Record<string, string>>({});
  const [resultScoreB, setResultScoreB] = useState<Record<string, string>>({});

  const submitResult = async (matchId: string) => {
    const sA = parseInt(resultScoreA[matchId] ?? '');
    const sB = parseInt(resultScoreB[matchId] ?? '');
    if (isNaN(sA) || isNaN(sB)) {
      toast.error('Informe o placar corretamente');
      return;
    }
    await supabase.from('matches').update({
      score_a: sA,
      score_b: sB,
      is_finished: true,
    }).eq('id', matchId);

    // Process results
    await supabase.rpc('process_match_result', { p_match_id: matchId });

    toast.success('Resultado lançado e pontuação calculada!');
    fetchAll();
  };

  const revertResult = async (matchId: string) => {
    await supabase.rpc('revert_match_result', { p_match_id: matchId });
    toast.success('Resultado revertido e pontuação recalculada!');
    fetchAll();
  };

  const addMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await supabase.from('messages').insert({ content: newMessage, created_by: user.id });
    setNewMessage('');
    toast.success('Mensagem enviada');
    fetchAll();
  };

  const deleteMessage = async (id: string) => {
    await supabase.from('messages').delete().eq('id', id);
    toast.success('Mensagem removida');
    fetchAll();
  };

  const phaseMatches = matches.filter(m => m.phase_id === selectedPhase);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Trophy className="w-5 h-5 text-primary" />
          <h1 className="font-display text-lg tracking-wider text-primary font-bold">PAINEL ADMIN</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="phases" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="phases" className="font-display text-xs tracking-wider">FASES</TabsTrigger>
            <TabsTrigger value="results" className="font-display text-xs tracking-wider">RESULTADOS</TabsTrigger>
            <TabsTrigger value="messages" className="font-display text-xs tracking-wider">MENSAGENS</TabsTrigger>
          </TabsList>

          {/* Phases & Matches Tab */}
          <TabsContent value="phases" className="space-y-6">
            {/* Phase activation */}
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
                </div>
              </CardContent>
            </Card>

            {/* Add match */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-sm tracking-wider">CONFIGURAR JOGOS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                  <SelectTrigger><SelectValue placeholder="Selecione a fase" /></SelectTrigger>
                  <SelectContent>
                    {phases.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
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

                <Button onClick={addMatch} className="gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Jogo
                </Button>

                {/* List matches */}
                <ScrollArea className="max-h-80">
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
                        <div className="flex items-center gap-2">
                          {m.is_finished && <CheckCircle className="w-4 h-4 text-primary" />}
                          <Button variant="ghost" size="icon" onClick={() => deleteMatch(m.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-sm tracking-wider">LANÇAR RESULTADOS</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                  <SelectTrigger className="mb-4"><SelectValue placeholder="Selecione a fase" /></SelectTrigger>
                  <SelectContent>
                    {phases.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <ScrollArea className="max-h-[40vh]">
                  <div className="space-y-3">
                    {phaseMatches.filter(m => !m.is_finished).map(m => (
                      <div key={m.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                        <p className="text-sm font-medium text-center"><TeamName name={m.team_a} side="left" /> vs <TeamName name={m.team_b} side="right" /></p>
                        <div className="flex items-center justify-center gap-3">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1"><TeamName name={m.team_a} side="left" /></p>
                            <Input
                              type="number" min="0" className="w-16 text-center font-display font-bold"
                              value={resultScoreA[m.id] ?? ''}
                              onChange={e => setResultScoreA(p => ({ ...p, [m.id]: e.target.value }))}
                            />
                          </div>
                          <span className="font-display text-lg text-muted-foreground pt-4">×</span>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1"><TeamName name={m.team_b} side="right" /></p>
                            <Input
                              type="number" min="0" className="w-16 text-center font-display font-bold"
                              value={resultScoreB[m.id] ?? ''}
                              onChange={e => setResultScoreB(p => ({ ...p, [m.id]: e.target.value }))}
                            />
                          </div>
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
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Finished matches */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-sm tracking-wider">RESULTADOS LANÇADOS</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[40vh]">
                  <div className="space-y-2">
                    {phaseMatches.filter(m => m.is_finished).map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div>
                          <p className="text-sm font-medium">
                            <TeamName name={m.team_a} side="left" /> <span className="font-display font-bold text-primary">{m.score_a}</span>
                            {' × '}
                            <span className="font-display font-bold text-primary">{m.score_b}</span> <TeamName name={m.team_b} side="right" />
                          </p>
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
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-sm tracking-wider">MENSAGENS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Textarea
                    placeholder="Escreva uma mensagem para os competidores..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={addMessage} className="self-end">Enviar</Button>
                </div>

                <ScrollArea className="max-h-96">
                  <div className="space-y-2">
                    {messages.map(msg => (
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
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
