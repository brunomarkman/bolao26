import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import trophyImg from '@/assets/trophy.png';
import LanguageSelector from '@/components/LanguageSelector';
import { useLanguage } from '@/i18n/LanguageContext';

const ResetPassword = () => {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('type') === 'recovery') {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t('reset.mismatch'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('reset.minLength'));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t('reset.success'));
      await supabase.auth.signOut();
      navigate('/');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-primary/20 shadow-2xl bg-card/95 backdrop-blur-sm">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-end mb-4"><LanguageSelector /></div>
            <p className="text-muted-foreground">{t('reset.invalid')}</p>
            <Button className="mt-4" onClick={() => navigate('/')}>{t('reset.backToLogin')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 20% 50%, hsl(150 60% 25% / 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, hsl(45 100% 50% / 0.1) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 80%, hsl(220 60% 20% / 0.3) 0%, transparent 50%)
        `,
      }}
    >
      <Card className="w-full max-w-md border-primary/20 shadow-2xl bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-end"><LanguageSelector /></div>
          <div className="mx-auto w-16 h-16">
            <img src={trophyImg} alt="Troféu" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="text-2xl font-display tracking-wider text-primary">
            {t('reset.title')}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('reset.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="password" placeholder={t('reset.newPassword')} value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required minLength={6} />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="password" placeholder={t('reset.confirmPassword')} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10" required minLength={6} />
            </div>
            <Button type="submit" className="w-full font-display tracking-wider" disabled={loading}>
              {loading ? t('reset.loading') : t('reset.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
