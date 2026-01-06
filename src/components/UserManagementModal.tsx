import { useState, useEffect } from 'react';
import { X, UserPlus, Shield, User, Mail, Check, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface UserManagementModalProps {
  onClose: () => void;
}

interface NewUserForm {
  email: string;
  full_name: string;
  password: string;
  role: 'admin' | 'employee';
}

export const UserManagementModal = ({ onClose }: UserManagementModalProps) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>({
    email: '',
    full_name: '',
    password: '',
    role: 'employee',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  // Auto-clear messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!newUser.email.trim()) {
      setError('Email é obrigatório');
      return;
    }
    if (!newUser.full_name.trim()) {
      setError('Nome completo é obrigatório');
      return;
    }
    if (!newUser.password || newUser.password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSaving(true);

    try {
      // Create auth user using signUp
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: newUser.email.trim(),
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name.trim(),
          },
        },
      });

      if (signUpError) throw signUpError;

      if (signUpData.user) {
        // Create user profile
        const { error: profileError } = await supabase.from('users').insert({
          id: signUpData.user.id,
          email: newUser.email.trim(),
          full_name: newUser.full_name.trim(),
          role: newUser.role,
          is_active: true,
        });

        if (profileError) throw profileError;
      }

      setSuccess('Usuário criado com sucesso! Um email de confirmação foi enviado.');
      setNewUser({ email: '', full_name: '', password: '', role: 'employee' });
      setShowNewUserForm(false);
      await fetchUsers();
    } catch (err: any) {
      console.error('Error creating user:', err);
      if (err.message?.includes('already registered')) {
        setError('Este email já está registrado');
      } else {
        setError(err.message || 'Erro ao criar usuário');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_active: !currentStatus } : u
      ));
      setSuccess(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`);
    } catch (err) {
      console.error('Error toggling user status:', err);
      setError('Erro ao alterar status do usuário');
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'employee') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      setSuccess('Permissão alterada com sucesso');
    } catch (err) {
      console.error('Error changing role:', err);
      setError('Erro ao alterar permissão');
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
          <Shield className="w-3 h-3" />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
        <User className="w-3 h-3" />
        Funcionário
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gerenciar Usuários</h2>
            <p className="text-sm text-gray-500 mt-1">
              Adicione, edite ou desative usuários do sistema
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow">
          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-red-800">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-green-800">{success}</span>
            </div>
          )}

          {/* Add User Button */}
          {!showNewUserForm && (
            <button
              onClick={() => setShowNewUserForm(true)}
              className="mb-6 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <UserPlus className="w-5 h-5" />
              Novo Usuário
            </button>
          )}

          {/* New User Form */}
          {showNewUserForm && (
            <form onSubmit={handleCreateUser} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Criar Novo Usuário</h3>
              
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="João da Silva"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="joao@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha Inicial *
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Acesso
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'employee' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  >
                    <option value="employee">Funcionário (acesso limitado)</option>
                    <option value="admin">Administrador (acesso total)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Criando...' : 'Criar Usuário'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewUserForm(false);
                    setNewUser({ email: '', full_name: '', password: '', role: 'employee' });
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Users List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum usuário cadastrado
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 border rounded-lg ${
                    user.is_active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        user.is_active ? 'bg-gray-200' : 'bg-gray-300'
                      }`}>
                        <User className={`w-5 h-5 ${user.is_active ? 'text-gray-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${user.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                            {user.full_name}
                          </span>
                          {getRoleBadge(user.role)}
                          {!user.is_active && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                              Desativado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Role Selector */}
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.id, e.target.value as 'admin' | 'employee')}
                        className="text-sm px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                      >
                        <option value="employee">Funcionário</option>
                        <option value="admin">Admin</option>
                      </select>

                      {/* Toggle Active */}
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.is_active
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={user.is_active ? 'Desativar usuário' : 'Ativar usuário'}
                      >
                        {user.is_active ? (
                          <ToggleRight className="w-6 h-6" />
                        ) : (
                          <ToggleLeft className="w-6 h-6" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
