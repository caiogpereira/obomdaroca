import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'employee';
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but no profile (edge case - profile not created yet)
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Acesso Pendente</h2>
          <p className="text-gray-600 mb-4">
            Seu perfil ainda não foi configurado. Entre em contato com o administrador do sistema.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  // Profile exists but user is deactivated
  if (!profile.is_active) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Acesso Desativado</h2>
          <p className="text-gray-600 mb-4">
            Sua conta foi desativada. Entre em contato com o administrador para mais informações.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  // Check role requirements
  if (requiredRole === 'admin' && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <h2 className="text-xl font-bold text-yellow-600 mb-4">Acesso Restrito</h2>
          <p className="text-gray-600 mb-4">
            Esta funcionalidade é exclusiva para administradores.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // All checks passed - render children
  return <>{children}</>;
};

// Export a hook for checking permissions in components
export const usePermissions = () => {
  const { profile, isAdmin } = useAuth();

  return {
    isAdmin,
    isEmployee: profile?.role === 'employee',
    isStaff: !!profile?.is_active,
    canDeleteProducts: isAdmin,
    canDeletePedidos: isAdmin,
    canManageUsers: isAdmin,
    canImportBulk: isAdmin,
    canAccessSettings: isAdmin,
    canViewActivityLogs: isAdmin,
  };
};
