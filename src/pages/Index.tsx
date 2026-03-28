import { useAuth } from '@/hooks/useAuth';
import Auth from './Auth';
import Home from './Home';

const Index = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-display text-primary tracking-wider">CARREGANDO...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Auth />;
  return <Home />;
};

export default Index;
