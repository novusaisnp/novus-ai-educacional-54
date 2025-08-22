import { Navigate } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';

const Index = () => {
  const { user, loading } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return user ? <Navigate to="/app/dashboard" replace /> : <Navigate to="/auth/login" replace />;
};

export default Index;
