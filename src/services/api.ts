const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const API_ENDPOINTS = {
  ATENDIMENTOS: `${API_BASE_URL}/atendimentos`,
  METRICAS: `${API_BASE_URL}/metricas`,
  PEDIDOS_PENDENTES: `${API_BASE_URL}/pedidos-pendentes`,
  PEDIDOS: (id?: string) => id ? `${API_BASE_URL}/pedidos/${id}` : `${API_BASE_URL}/pedidos`,
  FINALIZAR_PEDIDO: (id: string) => `${API_BASE_URL}/pedidos/${id}/finalizar`,
};

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

const fetchWithAuth = async (url: string, options: FetchOptions = {}) => {
  const { params, ...fetchOptions } = options;

  let finalUrl = url;
  if (params) {
    const queryString = new URLSearchParams(params).toString();
    finalUrl = `${url}?${queryString}`;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  const response = await fetch(finalUrl, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || `HTTP Error: ${response.status}`);
  }

  return response.json();
};

export const apiService = {
  getMetricas: async (periodo: string) => {
    return fetchWithAuth(API_ENDPOINTS.METRICAS, {
      params: { periodo },
    });
  },

  getPedidosPendentes: async () => {
    return fetchWithAuth(API_ENDPOINTS.PEDIDOS_PENDENTES);
  },

  updatePedido: async (id: string, data: any) => {
    return fetchWithAuth(API_ENDPOINTS.PEDIDOS(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  finalizarPedido: async (id: string) => {
    return fetchWithAuth(API_ENDPOINTS.FINALIZAR_PEDIDO(id), {
      method: 'POST',
    });
  },

  createAtendimento: async (data: any) => {
    return fetchWithAuth(API_ENDPOINTS.ATENDIMENTOS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
