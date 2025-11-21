import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { authService } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Users, 
  Key, 
  Activity,
  Settings,
  LogOut 
} from 'lucide-react';

// ===========================================
// ADMIN CONSOLE MVP - PAGE PRINCIPALE
// ===========================================

export default function AdminConsolePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Affichage loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Affichage login si non authentifié
  if (!user) {
    return <LoginForm />;
  }

  // Dashboard principal
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                SylionTech Assistant
              </h1>
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                Admin Console
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => authService.signOut()}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <NavItem
              icon={<BarChart className="w-5 h-5" />}
              label="Dashboard"
              active
            />
            <NavItem
              icon={<Users className="w-5 h-5" />}
              label="Tenants"
            />
            <NavItem
              icon={<Key className="w-5 h-5" />}
              label="API Keys"
            />
            <NavItem
              icon={<Activity className="w-5 h-5" />}
              label="Métriques"
            />
            <NavItem
              icon={<Settings className="w-5 h-5" />}
              label="Paramètres"
            />
          </div>
        </div>
      </nav>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <DashboardContent />
        </div>
      </main>
    </div>
  );
}

// ===========================================
// COMPOSANTS
// ===========================================

function LoginForm() {
  const [email, setEmail] = useState('admin@syliontech.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.signIn(email, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            SylionTech Assistant
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Console d'administration
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Email"
              />
            </div>
            <div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Mot de passe"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="group relative w-full flex justify-center"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              Mode MVP - Utilisez les identifiants de développement
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function NavItem({ 
  icon, 
  label, 
  active = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
}) {
  return (
    <a
      href="#"
      className={`${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Stats principales */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Tenants Actifs"
          value="3"
          icon={<Users className="w-6 h-6" />}
          change="+2 ce mois"
        />
        <StatsCard
          title="API Keys"
          value="8"
          icon={<Key className="w-6 h-6" />}
          change="5 actives"
        />
        <StatsCard
          title="Requêtes (24h)"
          value="247"
          icon={<Activity className="w-6 h-6" />}
          change="+12% vs hier"
        />
        <StatsCard
          title="Total Requêtes"
          value="15.3K"
          icon={<BarChart className="w-6 h-6" />}
          change="+8% ce mois"
        />
      </div>

      {/* Section tenants récents */}
      <Card>
        <CardHeader>
          <CardTitle>Tenants Récents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">
            Fonctionnalité en cours de développement...
            <br />
            L'interface complète de gestion des tenants sera bientôt disponible.
          </div>
        </CardContent>
      </Card>

      {/* Section métriques */}
      <Card>
        <CardHeader>
          <CardTitle>Activité Récente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">
            Dashboard de métriques détaillées en cours de développement...
            <br />
            Graphiques et statistiques d'usage seront affichés ici.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon,
  change
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  change: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="p-3 bg-primary/10 rounded-lg">
              {icon}
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-semibold text-gray-900">
                {value}
              </dd>
            </dl>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm text-gray-500">
            {change}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}