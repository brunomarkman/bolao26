import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, Shield, Users, DollarSign } from 'lucide-react';
import trophyImg from '@/assets/trophy.png';
import OrganizerMessages from '@/components/dashboard/OrganizerMessages';
import Leaderboard from '@/components/dashboard/Leaderboard';
import MatchPredictions from '@/components/dashboard/MatchPredictions';
import PredictionModal from '@/components/dashboard/PredictionModal';

const Dashboard = () => {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [predictionOpen, setPredictionOpen] = useState(false);
  const [paidCount, setPaidCount] = useState(0);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [betValue, setBetValue] = useState(0);

  useEffect(() => {
    const fetchPaymentStats = async () => {
      const [paymentsRes, profilesRes, settingsRes] = await Promise.all([
        supabase.from('payments').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('settings').select('value').eq('key', 'bet_value').single(),
      ]);
      setPaidCount(paymentsRes.count ?? 0);
      setTotalProfiles(profilesRes.count ?? 0);
      if (settingsRes.data) setBetValue(parseFloat(settingsRes.data.value) || 0);
    };
    fetchPaymentStats();
  }, []);

  const totalReceived = paidCount * betValue;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={trophyImg} alt="Troféu" className="w-7 h-7 object-contain" />
            <h1 className="font-display text-lg tracking-wider text-primary font-bold">
              BOLÃO COPA 2026
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="font-medium text-foreground">{paidCount}/{totalProfiles}</span>
              <span className="hidden sm:inline">pagos</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span className="font-medium text-foreground">R$ {totalReceived.toFixed(2)}</span>
            </div>
            <span className="text-sm text-muted-foreground hidden sm:block">
              Olá, <span className="font-medium text-foreground">{profile?.name}</span>
            </span>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
                className="gap-1"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Grid */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-7rem)]">
          <OrganizerMessages />
          <Leaderboard onOpenPredictions={() => setPredictionOpen(true)} />
          <MatchPredictions />
        </div>
      </main>

      <PredictionModal open={predictionOpen} onOpenChange={setPredictionOpen} />
    </div>
  );
};

export default Dashboard;
