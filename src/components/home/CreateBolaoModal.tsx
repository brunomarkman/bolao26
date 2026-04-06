import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { generateInviteCode } from '@/types/bolao';
import type { Competition } from '@/types/bolao';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const CreateBolaoModal = ({ open, onOpenChange, onCreated }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionId, setCompetitionId] = useState('');
  const [nickname, setNickname] = useState('');
  const [betValue, setBetValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchCompetitions = async () => {
      const { data } = await (supabase as any).from('competitions').select('*').order('year', { ascending: false });
      if (data) {
        const now = new Date();
        const filtered = data.filter((c: Competition) => {
          if (!c.start_date) return true;
          const start = new Date(c.start_date);
          return start.getTime() - now.getTime() > 24 * 60 * 60 * 1000;
        });
        setCompetitions(filtered.length > 0 ? filtered : data);
      }
    };
    fetchCompetitions();
  }, [open]);

  const handleCreate = async () => {
    if (!user || !competitionId || !nickname.trim()) { toast.error(t('create.fillRequired')); return; }
    setLoading(true);
    const code = generateInviteCode();
    const { error } = await (supabase as any).from('boloes').insert({
      nickname: nickname.trim(), competition_id: competitionId, created_by: user.id, bet_value: parseFloat(betValue) || 0, invite_code: code,
    });
    if (error) {
      if (error.code === '23505') {
        const { error: err2 } = await (supabase as any).from('boloes').insert({
          nickname: nickname.trim(), competition_id: competitionId, created_by: user.id, bet_value: parseFloat(betValue) || 0, invite_code: generateInviteCode(),
        });
        if (err2) { toast.error(t('create.error')); setLoading(false); return; }
      } else { toast.error(t('create.error')); setLoading(false); return; }
    }
    const { data: newBolao } = await (supabase as any).from('boloes').select('id').eq('created_by', user.id).eq('nickname', nickname.trim()).order('created_at', { ascending: false }).limit(1).single();
    if (newBolao) await (supabase as any).from('bolao_participants').insert({ bolao_id: newBolao.id, user_id: user.id });
    toast.success(t('create.success'));
    setNickname(''); setBetValue(''); setCompetitionId(''); setLoading(false);
    onOpenChange(false); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider text-primary">{t('create.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('create.competition')}</Label>
            <Select value={competitionId} onValueChange={setCompetitionId}>
              <SelectTrigger><SelectValue placeholder={t('create.selectCompetition')} /></SelectTrigger>
              <SelectContent>
                {competitions.map(c => (<SelectItem key={c.id} value={c.id}>{c.name} ({c.year})</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('create.nickname')}</Label>
            <Input placeholder={t('create.nicknamePlaceholder')} value={nickname} onChange={e => setNickname(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('create.betValue')}</Label>
            <Input type="number" min="0" step="0.01" placeholder="0,00" value={betValue} onChange={e => setBetValue(e.target.value)} />
          </div>
          <Button onClick={handleCreate} disabled={loading} className="w-full font-display tracking-wider">
            {loading ? t('create.loading') : t('create.submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBolaoModal;
