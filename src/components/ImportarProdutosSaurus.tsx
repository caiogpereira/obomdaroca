import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2, AlertTriangle, X } from 'lucide-react';

interface ImportResult {
  status: 'sucesso' | 'parcial' | 'erro';
  timestamp?: string;
  resumo?: {
    total_processados: number;
    total_erros: number;
    mensagem: string;
  };
  mensagem?: string;
}

interface ImportarProdutosSaurusProps {
  webhookUrl: string;
  onClose: () => void;
}

export const ImportarProdutosSaurus: React.FC<ImportarProdutosSaurusProps> = ({ 
  webhookUrl,
  onClose
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File | null) => {
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx')) {
        setError('Apenas arquivos .xlsx são aceitos');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleImport = async () => {
    if (!file) {
      setError('Selecione um arquivo primeiro');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      // Adaptar resposta para nosso formato
      if (data.status) {
        setResult(data);
      } else {
        setResult({
          status: 'sucesso',
          resumo: {
            total_processados: data.total || 0,
            total_erros: 0,
            mensagem: data.mensagem || 'Importação concluída com sucesso!'
          }
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Importar do Saurus PDV</h2>
              <p className="text-sm text-gray-500">Sincronize o catálogo automaticamente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Área de Upload */}
          {!result && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                  ${dragOver ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'}
                  ${file ? 'border-green-500 bg-green-50' : ''}
                `}
                onClick={() => document.getElementById('saurus-file-input')?.click()}
              >
                <input
                  id="saurus-file-input"
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  className="hidden"
                />
                
                {file ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetForm();
                      }}
                      className="mt-3 text-sm text-red-600 hover:text-red-700"
                    >
                      Remover arquivo
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="font-medium text-gray-700">
                      Arraste o arquivo aqui ou clique para selecionar
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Apenas arquivos .xlsx (Relatório Tabela de Preço)
                    </p>
                  </div>
                )}
              </div>

              {/* Erro */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Botão Importar */}
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className={`
                  mt-6 w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2
                  ${file && !loading
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Importando... aguarde
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Importar Produtos
                  </>
                )}
              </button>

              {/* Informações */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">ℹ️ Como funciona:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Exporte o <strong>"Relatório Tabela de Preço"</strong> do Saurus PDV</li>
                  <li>• Faça upload do arquivo .xlsx aqui</li>
                  <li>• O sistema irá atualizar ou inserir produtos automaticamente</li>
                  <li>• Preços de Cartão, PIX e Dinheiro serão sincronizados</li>
                </ul>
              </div>
            </>
          )}

          {/* Resultado */}
          {result && (
            <div className="text-center">
              {result.status === 'sucesso' ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Importação Concluída!</h3>
                  <p className="text-green-600 mt-2">
                    {result.resumo?.mensagem || result.mensagem || 'Produtos sincronizados com sucesso!'}
                  </p>
                </div>
              ) : result.status === 'parcial' ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-10 h-10 text-yellow-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Importação Parcial</h3>
                  <p className="text-yellow-600 mt-2">{result.resumo?.mensagem}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <XCircle className="w-10 h-10 text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Erro na Importação</h3>
                  <p className="text-red-600 mt-2">{result.resumo?.mensagem || result.mensagem}</p>
                </div>
              )}

              {/* Estatísticas */}
              {result.resumo && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{result.resumo.total_processados}</p>
                    <p className="text-sm text-green-700">Produtos sincronizados</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{result.resumo.total_erros}</p>
                    <p className="text-sm text-red-700">Erros</p>
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={resetForm}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  Nova Importação
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportarProdutosSaurus;
