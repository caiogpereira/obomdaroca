import { useState } from 'react';
import { User } from 'lucide-react';
import { UserDropdown } from './UserDropdown';
import { AccountSettingsModal } from './AccountSettingsModal';
import { PasswordChangeModal } from './PasswordChangeModal';

export const Header = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleSaveSettings = (data: { nome: string; email: string; foto?: string }) => {
    console.log('Salvar configurações:', data);
  };

  const handleSavePassword = (data: { senhaAtual: string; novaSenha: string }) => {
    console.log('Alterar senha:', data);
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img
                src="/obdr.png"
                alt="O Bom da Roça"
                className="w-12 h-12 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">O Bom da Roça</h1>
                <p className="text-xs text-gray-500">Dashboard de Vendas</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-4 cursor-pointer"
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900 hover:text-red-600 transition-colors">
                      Admin
                    </p>
                    <p className="text-xs text-gray-500">Online</p>
                  </div>
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors">
                    <User className="w-5 h-5 text-red-600" />
                  </div>
                </div>

                {showDropdown && (
                  <UserDropdown
                    onClose={() => setShowDropdown(false)}
                    onOpenSettings={() => setShowSettingsModal(true)}
                    onOpenPasswordChange={() => setShowPasswordModal(true)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {showSettingsModal && (
        <AccountSettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSaveSettings}
        />
      )}

      {showPasswordModal && (
        <PasswordChangeModal
          onClose={() => setShowPasswordModal(false)}
          onSave={handleSavePassword}
        />
      )}
    </>
  );
};
