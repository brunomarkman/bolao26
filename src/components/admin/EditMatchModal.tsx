import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Match = Tables<'matches'>;

interface EditMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match | null;
  onSaved: () => void;
}

const EditMatchModal = ({ open, onOpenChange, match, onSaved }: EditMatchModalProps) => {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [location, setLocation] = useState('');
  const [group, setGroup] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (match && open) {
      setTeamA(match.team_a);
      setTeamB(match.team_b);
      setLocation(match.location || '');
      setGroup(match.group_name || '');
      if (match.match_date) {
        const d = new Date(match.match_date);
        setMatchDate(d.toISOString().split('T')[0]);
        setMatchTime(d.toTimeString().slice(0, 5));
      } else {
        setMatchDate('');
        setMatchTime('');
      }
    }
  }, [match, open]);

  const handleSave = async () => {
    if (!match) return;
    setLoading(true);
    let dateVal = null;
    if (matchDate && matchTime) {
      dateVal = new Date(`${matchDate}T${matchTime}:00`).toISOString();
    }
    const { error } = await supabase.from('matches').update({
      team_a: teamA,
      team_b: teamB,
      match_date: dateVal,
      location: location || null,
      group_name: group || null,
    }).eq('id', match.id);

    if (error) {
      toast.error('Erro ao salvar');
    } else {
      toast.success('Jogo atualizado');
      onSaved();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider text-primary">✏️ EDITAR JOGO</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Time A" value={teamA} onChange={e => setTeamA(e.target.value)} />
            <Input placeholder="Time B" value={teamB} onChange={e => setTeamB(e.target.value)} />
            <Input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} />
            <Input type="time" value={matchTime} onChange={e => setMatchTime(e.target.value)} />
            <Input placeholder="Local" value={location} onChange={e => setLocation(e.target.value)} />
            <Input placeholder="Grupo (ex: A)" value={group} onChange={e => setGroup(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={loading} className="w-full gap-2">
            <Save className="w-4 h-4" /> {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditMatchModal;
