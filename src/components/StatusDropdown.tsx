import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Pedido } from '../types';

interface StatusDropdownProps {
  currentStatus: Pedido['status'];
  pedidoId: string;
  onStatusChange: (pedidoId: string, newStatus: Pedido['status']) => void;
}

export const StatusDropdown = ({ currentStatus, pedidoId, onStatusChange }: StatusDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const statusOptions: { value: Pedido['status']; label: string; color: string }[] = [
    { value: 'Novo', label: 'Novo Pedido', color: 'bg-red-100 text-red-800 hover:bg-red-200' },
    { value: 'Em Atendimento', label: 'Em Atendimento', color: 'bg-orange-100 text-orange-800 hover:bg-orange-200' },
    { value: 'Finalizado', label: 'Finalizado', color: 'bg-green-100 text-green-800 hover:bg-green-200' },
  ];

  const currentOption = statusOptions.find(opt => opt.value === currentStatus);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleStatusClick = (newStatus: Pedido['status']) => {
    onStatusChange(pedidoId, newStatus);
    setIsOpen(false);
  };

  const getStatusColor = (status: Pedido['status']) => {
    switch (status) {
      case 'Novo':
        return 'bg-red-100 text-red-800';
      case 'Em Atendimento':
        return 'bg-orange-100 text-orange-800';
      case 'Finalizado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${getStatusColor(currentStatus)} hover:opacity-80`}
      >
        {currentOption?.label || currentStatus}
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusClick(option.value);
              }}
              disabled={option.value === currentStatus}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                option.value === currentStatus
                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
              }`}
            >
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${option.color.replace('hover:bg', 'bg')}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
