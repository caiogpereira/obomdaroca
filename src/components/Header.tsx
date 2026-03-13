import { useState } from 'react';
import { Menu, LogOut, Settings, Users, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserManagementModal } from './UserManagementModal';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

interface HeaderProps {
  onShowLogs?: () => void;
}

export const Header = ({ onShowLogs }: HeaderProps) => {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src="/obdr.png"
                alt="O Bom da Roça"
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">O Bom da Roça</h1>
                <p className="text-xs text-gray-500">Sistema de Gestão</p>
              </div>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-semibold text-sm">
                    {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">{profile?.full_name || 'Usuário'}</p>
                  <p className="text-xs text-gray-500">{isAdmin ? 'Administrador' : 'Funcionário'}</p>
                </div>
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                      <p className="text-xs text-gray-500">{profile?.email}</p>
                    </div>

                    {/* Link para Catálogo */}
                    <Link
                      to="/catalogo"
                      target="_blank"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Ver Catálogo
                    </Link>

                    {/* Logs do Sistema */}
                    {onShowLogs && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onShowLogs();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <ClipboardList className="w-4 h-4" />
                        Logs do Sistema
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowUserManagement(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        Gerenciar Usuários
                      </button>
                    )}

                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {showUserManagement && (
        <UserManagementModal
          isOpen={showUserManagement}
          onClose={() => setShowUserManagement(false)}
        />
      )}
    </>
  );
};
