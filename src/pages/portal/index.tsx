import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { usePortalAuth } from '@/hooks/usePortalAuth';

export default function PortalIndex() {
  const { user, loading } = usePortalAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Redirect based on auth status
  if (user) {
    return <Navigate to="/portal/dashboard" replace />;
  } else {
    return <Navigate to="/portal/login" replace />;
  }
}