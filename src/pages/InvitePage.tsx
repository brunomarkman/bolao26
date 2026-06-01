import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Calendar, UserPlus, LogIn, UserCheck } from 'lucide-react';
import trophyImg from '@/assets/trophy.png';
import LanguageSelector from '@/components/LanguageSelector';
import { useLanguage } from '@/i18n/LanguageContext';

interface BolaoInfo {
  id: string; nickname: string; bet_value: number; status: string; invite_code: string;
  competition?: { name: string; year: number; start_date: string | null; end_date: string | null; total_clubs: number | null; format: string | null; };
  managerName: string; participantCount: number;
}

const InvitePage = () => {
  const { code } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [bolaoInfo, setBolaoInfo] = useState<BolaoInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [joining, setJoining] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchBolaoInfo = async () => {
      if (!code) { setNotFound(true); setLoadingInfo(false); return; }
      const { data: bolao } = await (supabase as any).from('boloes').select('*').eq('invite_code', code.toUpperCase()).single();
      if (!bolao) { setNotFound(true); setLoadingInfo(false); return; }
      let competition;
      if (bolao.competition_id) {
        const { data: comp } = await (supabase as any).from('competitions').select('*').eq('id', bolao.competition_id).single();
        competition = comp;
      }
      const { data: managerProfile } = await supabase.from('profiles').select('name').eq('user_id', bolao.created_by).single();
      const { count } = await (supabase as any).from('bolao_participants').select('*', { count: 'exact', head: true }).eq('bolao_id', bolao.id);
      setBolaoInfo({ id: bolao.id, nickname: bolao.nickname, bet_value: Number(bolao.bet_value), status: bolao.status, invite_code: bolao.invite_code, competition, managerName: managerProfile?.name || t('home.unknown'), participantCount: count || 0 });
      setLoadingInfo(false);
    };
    fetchBolaoInfo();
  }, [code]);

  const handleJoin = async () => {
    if (!user || !bolaoInfo) return;
    setJoining(true);

    // Block join once first group-stage match has started
    const { data: bolaoRow } = await (supabase as any).from('boloes').select('competition_id').eq('id', bolaoInfo.id).single();
    if (bolaoRow?.competition_id) {
      const { data: phases } = await (supabase as any).from('phases').select('id').eq('competition_id', bolaoRow.competition_id).eq('number', 1);
      const phaseIds = (phases || []).map((p: any) => p.id);
      if (phaseIds.length > 0) {
        const { data: firstMatch } = await (supabase as any).from('matches').select('match_date').in('phase_id', phaseIds).not('match_date', 'is', null).order('match_date', { ascending: true }).limit(1).maybeSingle();
        if (firstMatch?.match_date && new Date(firstMatch.match_date).getTime() <= Date.now()) {
          toast.error(t('invite.alreadyStarted'));
          setJoining(false); return;
        }
      }
    }

    const { error } = await (supabase as any).from('bolao_participants').insert({ bolao_id: bolaoInfo.id, user_id: user.id });
    if (error?.code === '23505') toast.info(t('invite.alreadyIn'));
    else if (error) toast.error(t('invite.joinError'));
    else toast.success(`${t('invite.joinedSuccess')} "${bolaoInfo.nickname}"!`);
    setJoining(false);
    navigate('/home');
  };

  const handleGoToLogin = () => {
    if (code) localStorage.setItem('pending_invite_code', code);
    navigate('/');
  };

  const handleGoToSignup = () => {
    if (code) localStorage.setItem('pending_invite_code', code);
    navigate('/?signup=1');
  };


  if (authLoading || loadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-display text-primary tracking-wider">{t('invite.loading')}</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/30 bg-card/95 backdrop-blur-sm">
          <CardContent className="text-center py-10 space-y-4">
            <div className="flex justify-end mb-2"><LanguageSelector /></div>
            <div className="text-4xl">❌</div>
            <h2 className="font-display text-xl tracking-wider text-destructive">{t('invite.invalid')}</h2>
            <p className="text-muted-foreground text-sm">{t('invite.invalidDesc')}</p>
            <Button onClick={() => navigate('/')} variant="outline" className="font-display tracking-wider">{t('invite.goHome')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bolaoInfo?.status === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/30 bg-card/95 backdrop-blur-sm">
          <CardContent className="text-center py-10 space-y-4">
            <div className="flex justify-end mb-2"><LanguageSelector /></div>
            <div className="text-4xl">🚫</div>
            <h2 className="font-display text-xl tracking-wider text-destructive">{t('invite.cancelled')}</h2>
            <p className="text-muted-foreground text-sm">{t('invite.cancelledDesc')}</p>
            <Button onClick={() => navigate('/')} variant="outline" className="font-display tracking-wider">{t('invite.goHome')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-primary/20 shadow-2xl bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-end"><LanguageSelector /></div>
          <div className="mx-auto w-16 h-16"><img src={trophyImg} alt="Troféu" className="w-full h-full object-contain" /></div>
          <CardTitle className="text-2xl font-display tracking-wider text-primary">{t('invite.title')}</CardTitle>
          <CardDescription className="text-muted-foreground">{t('invite.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('invite.pool')}</span>
              <span className="font-display font-bold text-primary text-lg">{bolaoInfo?.nickname}</span>
            </div>
            {bolaoInfo?.competition && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1"><Trophy className="w-3 h-3" /> {t('invite.competition')}</span>
                  <span className="font-medium">{bolaoInfo.competition.name} {bolaoInfo.competition.year}</span>
                </div>
                {bolaoInfo.competition.format && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('invite.format')}</span>
                    <span className="text-sm">{bolaoInfo.competition.format}</span>
                  </div>
                )}
                {bolaoInfo.competition.total_clubs && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('invite.teams')}</span>
                    <span className="text-sm">{bolaoInfo.competition.total_clubs} {t('invite.selections')}</span>
                  </div>
                )}
                {bolaoInfo.competition.start_date && bolaoInfo.competition.end_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {t('invite.period')}</span>
                    <span className="text-sm">{bolaoInfo.competition.start_date} a {bolaoInfo.competition.end_date}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('invite.manager')}</span>
              <span className="text-sm">{bolaoInfo?.managerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> {t('invite.participants')}</span>
              <span className="font-medium">{bolaoInfo?.participantCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('invite.betValue')}</span>
              <Badge variant="secondary" className="font-display">$ {bolaoInfo?.bet_value.toFixed(2)}</Badge>
            </div>
          </div>

          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                <UserCheck className="w-4 h-4 text-primary shrink-0" />
                <span>{t('invite.loggedAs')} <span className="font-medium text-foreground">{user.email}</span></span>
              </div>
              <Button onClick={handleJoin} disabled={joining} className="w-full font-display tracking-wider text-lg h-12 gap-2">
                <UserPlus className="w-5 h-5" /> {joining ? t('invite.joining') : t('invite.join')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                <h3 className="font-display text-sm tracking-wider text-primary font-bold">{t('invite.howTo')}</h3>
                <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>{t('invite.step1')} <strong>{t('invite.step1Bold')}</strong> {t('invite.step1After')}</li>
                  <li>{t('invite.step2')} <strong>{t('invite.step2Bold')}</strong></li>
                  <li>{t('invite.step3')} <strong>{t('invite.step3Bold')}</strong> {t('invite.step3After')}</li>
                  <li>{t('invite.step4')} <strong>{t('invite.step4Bold')}</strong> {t('invite.step4After')}
                    <span className="font-display font-bold text-primary ml-1 tracking-widest">{code?.toUpperCase()}</span>
                  </li>
                </ol>
              </div>
              <Button onClick={handleGoToLogin} className="w-full font-display tracking-wider text-lg h-12 gap-2">
                <LogIn className="w-5 h-5" /> {t('invite.loginBtn')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitePage;
