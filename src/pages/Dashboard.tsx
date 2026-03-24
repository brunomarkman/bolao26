import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trophy, LogOut, Shield } from 'lucide-react';
import OrganizerMessages from '@/components/dashboard/OrganizerMessages';
import Leaderboard from '@/components/dashboard/Leaderboard';
import MatchPredictions from '@/components/dashboard/MatchPredictions';
import PredictionModal from '@/components/dashboard/PredictionModal';

const Dashboard = () => {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [predictionOpen, setPredictionOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-primary" />
            <h1 className="font-display text-lg tracking-wider text-primary font-bold">
              BOLÃO COPA 2026
            </h1>
          </div>
          <div className="flex items-center gap-3">
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
