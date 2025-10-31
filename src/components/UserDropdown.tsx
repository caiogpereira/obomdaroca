import { Settings, Key, LogOut } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface UserDropdownProps {
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenPasswordChange: () => void;
}

export const UserDropdown = ({ onClose, onOpenSettings, onOpenPasswordChange }: UserDropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const menuItems = [
    {
      icon: Settings,
      label: 'Configurações da Conta',
      onClick: () => {
        onOpenSettings();
        onClose();
      },
    },
    {
      icon: Key,
      label: 'Alterar Senha',
      onClick: () => {
        onOpenPasswordChange();
        onClose();
      },
    },
    {
      icon: LogOut,
      label: 'Sair',
      onClick: () => {
        console.log('Logout');
        onClose();
      },
      className: 'text-red-600 hover:bg-red-50',
    },
  ];

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-fadeIn"
    >
      <div className="px-4 py-3 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-900">Admin</p>
        <p className="text-xs text-gray-500">admin@obomdaroca.com</p>
      </div>

      <div className="py-2">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              item.className || 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
