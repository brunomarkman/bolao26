import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const InvitePage = () => {
  const { code } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Save code and redirect to login
      if (code) localStorage.setItem('pending_invite_code', code);
      navigate('/');
      return;
    }

    // User is logged in, join the bolão
    const joinBolao = async () => {
      const { data: bolao } = await (supabase as any)
        .from('boloes')
        .select('*')
        .eq('invite_code', code?.toUpperCase())
        .single();

      if (!bolao) {
        toast.error('Bolão não encontrado');
        navigate('/home');
        return;
      }

      if (bolao.status === 'cancelled') {
        toast.error('Este bolão foi cancelado');
        navigate('/home');
        return;
      }

      const { error } = await (supabase as any)
        .from('bolao_participants')
        .insert({ bolao_id: bolao.id, user_id: user.id });

      if (error?.code === '23505') {
        toast.info('Você já participa deste bolão');
      } else if (error) {
        toast.error('Erro ao ingressar');
      } else {
        toast.success(`Você entrou no bolão "${bolao.nickname}"!`);
      }

      navigate('/home');
    };

    joinBolao();
  }, [user, loading, code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-display text-primary tracking-wider">ENTRANDO NO BOLÃO...</p>
      </div>
    </div>
  );
};

export default InvitePage;
