import { useState, useEffect } from 'react';
import { Bot, BotOff, Clock, User } from 'lucide-react';
import { useAgenteIA } from '../hooks/useAgenteIA';

interface ToggleAgenteIAProps {
  telefone: string;
  clienteNome: string;
  compact?: boolean; // Para uso em cards menores
  onToggle?: (ativo: boolean) => void;
}

export const ToggleAgenteIA = ({ telefone, clienteNome, compact = false, onToggle }: ToggleAgenteIAProps) => {
  const { verificarBloqueio, toggleAtendimentoHumano, loading } = useAgenteIA();
  const [bloqueado, setBloqueado] = useState(false);
  const [info, setInfo] = useState<{
    ativadoPor?: string;
    expiraEm?: string;
  }>({});
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verificar = async () => {
      setChecking(true);
      const status = await verificarBloqueio(telefone);
      setBloqueado(status.bloqueado);
      if (status.bloqueado) {
        setInfo({
          ativadoPor: status.ativadoPor,
          expiraEm: status.expiraEm,
        });
      }
      setChecking(false);
    };
    
    if (telefone) {
      verificar();
    }
  }, [telefone, verificarBloqueio]);

  const handleToggle = async () => {
    const novoEstado = !bloqueado;
    const sucesso = await toggleAtendimentoHumano(telefone, clienteNome, novoEstado);
    
    if (sucesso) {
      setBloqueado(novoEstado);
      if (novoEstado) {
        const expira = new Date();
        expira.setHours(expira.getHours() + 1);
        setInfo({ expiraEm: expira.toISOString() });
      } else {
        setInfo({});
      }
      onToggle?.(novoEstado);
    }
  };

  const formatExpiracao = (expiraEm: string) => {
    const expira = new Date(expiraEm);
    const agora = new Date();
    const diffMinutos = Math.round((expira.getTime() - agora.getTime()) / 1000 / 60);
    
    if (diffMinutos <= 0) return 'Expirando...';
    if (diffMinutos < 60) return `${diffMinutos}min restantes`;
    return `${Math.round(diffMinutos / 60)}h restantes`;
  };

  if (checking) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-gray-400`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        {!compact && <span>Verificando...</span>}
      </div>
    );
  }

  // Versão compacta para cards
  if (compact) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        disabled={loading}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
          bloqueado
            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            : 'bg-green-100 text-green-700 hover:bg-green-200'
        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={bloqueado ? 'Agente IA desativado - Clique para reativar' : 'Agente IA ativo - Clique para desativar'}
      >
        {bloqueado ? (
          <>
            <BotOff size={14} />
            <span>Humano</span>
          </>
        ) : (
          <>
            <Bot size={14} />
            <span>IA</span>
          </>
        )}
      </button>
    );
  }

  // Versão completa para modais
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {bloqueado ? (
            <BotOff className="w-5 h-5 text-orange-600" />
          ) : (
            <Bot className="w-5 h-5 text-green-600" />
          )}
          <span className="text-sm font-medium text-gray-700">
            {bloqueado ? 'Atendimento Humano Ativo' : 'Agente IA Ativo'}
          </span>
        </div>
        
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            bloqueado
              ? 'bg-orange-500 focus:ring-orange-500'
              : 'bg-green-500 focus:ring-green-500'
          } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              bloqueado ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {bloqueado && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-xs text-orange-700">
            <User size={12} />
            <span>Atendimento humano assumido</span>
          </div>
          {info.expiraEm && (
            <div className="flex items-center gap-2 text-xs text-orange-600">
              <Clock size={12} />
              <span>{formatExpiracao(info.expiraEm)}</span>
            </div>
          )}
          {info.ativadoPor && (
            <div className="text-xs text-orange-500">
              Ativado por {info.ativadoPor}
            </div>
          )}
        </div>
      )}

      {!bloqueado && (
        <p className="text-xs text-gray-500">
          O agente IA está respondendo automaticamente. Clique para assumir o atendimento.
        </p>
      )}
    </div>
  );
};
