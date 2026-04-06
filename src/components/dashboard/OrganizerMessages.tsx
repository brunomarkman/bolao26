import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import { useLanguage } from '@/i18n/LanguageContext';

type Message = Tables<'messages'>;

interface OrganizerMessagesProps {
  bolaoId?: string;
}

const OrganizerMessages = ({ bolaoId }: OrganizerMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const { t, language } = useLanguage();

  useEffect(() => {
    if (!bolaoId) return;
    const fetchMessages = async () => {
      const { data } = await (supabase as any)
        .from('messages').select('*').or(`bolao_id.eq.${bolaoId},bolao_id.is.null`).order('created_at', { ascending: false });
      if (data) setMessages(data);
    };
    fetchMessages();
    const channel = supabase.channel('messages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bolaoId]);

  const dateLocale = language === 'en' ? enUS : ptBR;

  return (
    <Card className="h-full border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display tracking-wider flex items-center gap-2 text-primary">
          <MessageSquare className="w-4 h-4" /> {t('messages.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="h-[calc(100vh-16rem)] overflow-y-auto pr-2">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('messages.none')}</p>
          ) : (
            <div className="space-y-3 pb-4">
              {messages.map(msg => (
                <div key={msg.id} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(msg.created_at), "dd MMM, HH:mm", { locale: dateLocale })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrganizerMessages;
