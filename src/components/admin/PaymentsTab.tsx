import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, DollarSign, Save } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface Payment {
  id: string;
  user_id: string;
  received_by: string;
  created_at: string;
}

const PaymentsTab = () => {
  const [betValue, setBetValue] = useState('');
  const [savedBetValue, setSavedBetValue] = useState('0');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [receivedBy, setReceivedBy] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [settingsRes, profilesRes, paymentsRes] = await Promise.all([
      supabase.from('settings').select('*').eq('key', 'bet_value').single(),
      supabase.from('profiles').select('*').order('name'),
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
    ]);
    if (settingsRes.data) {
      setSavedBetValue(settingsRes.data.value);
      setBetValue(settingsRes.data.value);
    }
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (paymentsRes.data) setPayments(paymentsRes.data as Payment[]);
  };

  const saveBetValue = async () => {
    const { error } = await supabase
      .from('settings')
      .update({ value: betValue, updated_at: new Date().toISOString() })
      .eq('key', 'bet_value');
    if (error) {
      toast.error('Erro ao salvar valor');
      return;
    }
    setSavedBetValue(betValue);
    toast.success('Valor da aposta atualizado');
  };

  const addPayment = async () => {
    if (!selectedUser || !receivedBy.trim()) {
      toast.error('Selecione o competidor e informe quem recebeu');
      return;
    }
    const { error } = await supabase.from('payments').insert({
      user_id: selectedUser,
      received_by: receivedBy.trim(),
    });
    if (error) {
      toast.error('Erro ao registrar pagamento');
      return;
    }
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

  const getProfileName = (userId: string) => {
    return profiles.find(p => p.user_id === userId)?.name ?? 'Desconhecido';
  };

  // Filter out users who already paid
  const paidUserIds = new Set(payments.map(p => p.user_id));
  const unpaidProfiles = profiles.filter(p => !paidUserIds.has(p.user_id));

  return (
    <div className="space-y-6">
      {/* Bet Value */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-sm tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            VALOR DA APOSTA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">R$</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={betValue}
              onChange={e => setBetValue(e.target.value)}
              className="w-32"
            />
            <Button onClick={saveBetValue} size="sm" className="gap-1">
              <Save className="w-4 h-4" /> Salvar
            </Button>
            {savedBetValue !== '0' && (
              <span className="text-sm text-muted-foreground">
                Valor atual: <span className="font-bold text-foreground">R$ {parseFloat(savedBetValue).toFixed(2)}</span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Register Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-sm tracking-wider">REGISTRAR PAGAMENTO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o competidor" />
              </SelectTrigger>
              <SelectContent>
                {unpaidProfiles.map(p => (
                  <SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Recebido por"
              value={receivedBy}
              onChange={e => setReceivedBy(e.target.value)}
            />
          </div>
          <Button onClick={addPayment} className="gap-2">
            <DollarSign className="w-4 h-4" /> Registrar Pagamento
          </Button>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-sm tracking-wider">
            PAGAMENTOS REGISTRADOS ({payments.length}/{profiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[40vh]">
            <div className="space-y-2">
              {payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum pagamento registrado</p>
              ) : (
                payments.map(pay => (
                  <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div>
                      <p className="text-sm font-medium">{getProfileName(pay.user_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        Recebido por: <span className="font-medium">{pay.received_by}</span>
                        {' • '}
                        {format(new Date(pay.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deletePayment(pay.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsTab;
