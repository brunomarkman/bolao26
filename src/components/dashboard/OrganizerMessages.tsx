import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, CalendarDays, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import TeamName from '@/components/TeamName';
import { toast } from 'sonner';

type Message = Tables<'messages'>;
type Match = Tables<'matches'>;
type Profile = Tables<'profiles'>;

interface OrganizerMessagesProps {
  bolaoId?: string;
}

const OrganizerMessages = ({ bolaoId }: OrganizerMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const { t, language } = useLanguage();
  const { user } = useAuth();

  // Load bolao info (creator + competition_id)
  useEffect(() => {
    if (!bolaoId) return;
    (async () => {
      const { data } = await (supabase as any).from('boloes').select('created_by,competition_id').eq('id', bolaoId).single();
      if (data) { setCreatorId(data.created_by); setCompetitionId(data.competition_id); }
    })();
  }, [bolaoId]);

  // Profiles
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (data) {
        const map: Record<string, Profile> = {};
        data.forEach((p: Profile) => { map[p.user_id] = p; });
        setProfilesMap(map);
      }
    })();
  }, []);

  // Messages with realtime
  useEffect(() => {
    if (!bolaoId) return;
    const fetchMessages = async () => {
      const { data } = await (supabase as any)
        .from('messages').select('*').or(`bolao_id.eq.${bolaoId},bolao_id.is.null`).order('created_at', { ascending: false });
      if (data) setMessages(data);
    };
    fetchMessages();
    const channel = supabase.channel(`messages-${bolaoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bolaoId]);

  // Today's & past matches for the competition (with realtime updates)
  useEffect(() => {
    if (!competitionId) return;
    const fetchMatches = async () => {
      const { data: phases } = await (supabase as any).from('phases').select('id').eq('competition_id', competitionId);
      if (!phases || phases.length === 0) { setMatches([]); return; }
      const phaseIds = phases.map((p: any) => p.id);
      const today = new Date(); today.setHours(23, 59, 59, 999);
      const { data } = await supabase
        .from('matches')
        .select('*')
        .in('phase_id', phaseIds)
        .not('match_date', 'is', null)
        .lte('match_date', today.toISOString())
        .order('match_date', { ascending: false });
      if (data) setMatches(data);
    };
    fetchMatches();
    const channel = supabase.channel(`matches-today-${competitionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchMatches())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [competitionId]);

  const dateLocale = language === 'en' ? enUS : ptBR;

  const sendMessage = async () => {
    const content = newMsg.trim();
    if (!content || !user || !bolaoId) return;
    setSending(true);
    const { error } = await (supabase as any).from('messages').insert({
      bolao_id: bolaoId,
      content,
      created_by: user.id,
    });
    setSending(false);
    if (error) { toast.error(t('messages.errorSend')); return; }
    setNewMsg('');
    toast.success(t('messages.sent'));
  };

  const getMsgBg = (msg: Message) => {
    const author = profilesMap[msg.created_by];
    if (author?.is_admin) return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300/50';
    if (msg.created_by === creatorId) return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300/50';
    return 'bg-muted/50 border-border/50';
  };

  return (
    <Card className="h-full border-primary/10 flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-sm font-display tracking-wider flex items-center gap-2 text-primary">
          <MessageSquare className="w-4 h-4" /> {t('messages.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 flex flex-col min-h-0">
        {/* Today's matches: 25% */}
        <div className="h-[25%] min-h-0 flex flex-col mb-3">
          <div className="flex items-center gap-1.5 text-xs font-display tracking-wider text-primary/80 mb-1.5 shrink-0">
            <CalendarDays className="w-3.5 h-3.5" /> {t('messages.todayMatches')}
          </div>
          <div className="flex-1 overflow-y-auto pr-2 border rounded-md bg-muted/20">
            {matches.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">{t('messages.noMatches')}</p>
            ) : (
              <div className="divide-y divide-border/40">
                {matches.map(m => (
                  <div key={m.id} className="px-2 py-1.5 text-xs flex items-center justify-between gap-2">
                    <TeamName name={m.team_a || '???'} side="left" className="text-xs flex-1 min-w-0 truncate justify-end" />
                    <span className="font-display font-bold text-primary whitespace-nowrap">
                      {m.score_a ?? '-'} × {m.score_b ?? '-'}
                    </span>
                    <TeamName name={m.team_b || '???'} side="right" className="text-xs flex-1 min-w-0 truncate" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages: 75% */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto pr-2 min-h-0">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('messages.none')}</p>
            ) : (
              <div className="space-y-2 pb-2">
                {messages.map(msg => {
                  const author = profilesMap[msg.created_by];
                  return (
                    <div key={msg.id} className={`p-2.5 rounded-lg border ${getMsgBg(msg)}`}>
                      <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        <span className="font-medium">{author?.name || '—'}</span>
                        {' · '}
                        {format(new Date(msg.created_at), "dd MMM, HH:mm", { locale: dateLocale })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 pt-2 shrink-0">
            <Input
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }}
              placeholder={t('messages.placeholder')}
              className="h-9"
              disabled={sending}
            />
            <Button size="sm" onClick={sendMessage} disabled={sending || !newMsg.trim()} className="h-9 gap-1">
              <Send className="w-3.5 h-3.5" /> {t('messages.send')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrganizerMessages;
