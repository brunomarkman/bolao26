import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: () => void;
}

const JoinBolaoModal = ({ open, onOpenChange, onJoined }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!user || !code.trim()) { toast.error(t('join.enterCode')); return; }
    setLoading(true);
    const { data: bolao } = await (supabase as any).from('boloes').select('*').eq('invite_code', code.trim().toUpperCase()).single();
    if (!bolao) { toast.error(t('join.notFound')); setLoading(false); return; }
    if (bolao.status === 'cancelled') { toast.error(t('join.cancelled')); setLoading(false); return; }
    const { error } = await (supabase as any).from('bolao_participants').insert({ bolao_id: bolao.id, user_id: user.id });
    if (error) {
      if (error.code === '23505') toast.info(t('join.alreadyIn'));
      else toast.error(t('join.error'));
      setLoading(false); return;
    }
    toast.success(`${t('invite.joinedSuccess')} "${bolao.nickname}"!`);
    setCode(''); setLoading(false); onOpenChange(false); onJoined();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider text-primary">{t('join.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('join.code')}</Label>
            <Input placeholder={t('join.codePlaceholder')} value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={8} className="font-display text-center text-lg tracking-widest" />
            <p className="text-xs text-muted-foreground">{t('join.codeHelp')}</p>
          </div>
          <Button onClick={handleJoin} disabled={loading} className="w-full font-display tracking-wider">
            {loading ? t('join.loading') : t('join.submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinBolaoModal;
