import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Trophy, Mail, Lock, User } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Bem-vindo de volta!');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success('Conta criada! Verifique seu e-mail para confirmar.');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 20% 50%, hsl(350 80% 45% / 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, hsl(45 100% 50% / 0.1) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 80%, hsl(220 60% 20% / 0.3) 0%, transparent 50%)
        `,
      }}
    >
      <Card className="w-full max-w-md border-primary/20 shadow-2xl bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display tracking-wider text-primary">
            BOLÃO COPA 2026
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isLogin ? 'Entre na competição' : 'Crie sua conta e participe'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Seu nome"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="pl-10"
                  required={!isLogin}
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-10"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full font-display tracking-wider" disabled={loading}>
              {loading ? 'Aguarde...' : isLogin ? 'ENTRAR' : 'CRIAR CONTA'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
