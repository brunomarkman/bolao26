import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'>;

const OrganizerMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setMessages(data);
    };
    fetch();

    const channel = supabase
      .channel('messages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Card className="h-full border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display tracking-wider flex items-center gap-2 text-primary">
          <MessageSquare className="w-4 h-4" />
          MENSAGENS
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-16rem)] px-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem</p>
          ) : (
            <div className="space-y-3 pb-4">
              {messages.map(msg => (
                <div key={msg.id} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(msg.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default OrganizerMessages;
