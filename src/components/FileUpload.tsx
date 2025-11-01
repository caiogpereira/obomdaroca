import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Produto } from '../types';

interface FileUploadProps {
  onProductsImported: (produtos: Omit<Produto, 'id' | 'created_at' | 'updated_at'>[]) => void;
  onClose: () => void;
}

interface ImportedProduct {
  codigo: string;
  nome: string;
  preco: number;
  preco_cartao?: number;
  preco_pix?: number;
  preco_dinheiro?: number;
  preco_oferta?: number;
  subcategoria_id?: string;
}

export const FileUpload = ({ onProductsImported, onClose }: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportedProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    setError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

        if (jsonData.length === 0) {
          setError('O arquivo está vazio');
          return;
        }

        const products: ImportedProduct[] = jsonData.map((row, index) => {
          const codigo = row['Código'] || row['Codigo'] || row['codigo'] || row['CÓDIGO'] || '';
          const nome = row['Nome'] || row['nome'] || row['NOME'] || row['Produto'] || row['produto'] || '';
          const preco = parseFloat(row['Preço'] || row['Preco'] || row['preco'] || row['PREÇO'] || row['Valor'] || '0');
          const subcategoria = row['Subcategoria'] || row['subcategoria'] || row['SUBCATEGORIA'] || row['Categoria'] || '';

          // Optional price fields
          const precoCartao = row['Preço Cartão'] || row['Preco Cartao'] || row['preco_cartao'] || row['PREÇO CARTÃO'] || '';
          const precoPix = row['Preço Pix'] || row['Preco Pix'] || row['preco_pix'] || row['PREÇO PIX'] || '';
          const precoDinheiro = row['Preço Dinheiro'] || row['Preco Dinheiro'] || row['preco_dinheiro'] || row['PREÇO DINHEIRO'] || '';
          const precoOferta = row['Preço Oferta'] || row['Preco Oferta'] || row['preco_oferta'] || row['PREÇO OFERTA'] || '';

          if (!codigo || !nome || isNaN(preco)) {
            throw new Error(`Linha ${index + 2}: Dados incompletos ou inválidos (código, nome e preço são obrigatórios)`);
          }

          const product: ImportedProduct = {
            codigo: String(codigo).trim(),
            nome: String(nome).trim(),
            preco,
            subcategoria_id: subcategoria ? String(subcategoria).trim() : undefined,
          };

          // Add optional prices only if they exist and are valid
          if (precoCartao && !isNaN(parseFloat(String(precoCartao)))) {
            product.preco_cartao = parseFloat(String(precoCartao));
          }
          if (precoPix && !isNaN(parseFloat(String(precoPix)))) {
            product.preco_pix = parseFloat(String(precoPix));
          }
          if (precoDinheiro && !isNaN(parseFloat(String(precoDinheiro)))) {
            product.preco_dinheiro = parseFloat(String(precoDinheiro));
          }
          if (precoOferta && !isNaN(parseFloat(String(precoOferta)))) {
            product.preco_oferta = parseFloat(String(precoOferta));
          }

          return product;
        });

        setPreview(products);
        setFile(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
        setPreview([]);
      }
    };

    reader.onerror = () => {
      setError('Erro ao ler o arquivo');
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        droppedFile.type === 'application/vnd.ms-excel' ||
        droppedFile.name.endsWith('.csv')
      ) {
        processFile(droppedFile);
      } else {
        setError('Por favor, envie um arquivo Excel (.xlsx, .xls) ou CSV');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (preview.length > 0) {
      onProductsImported(preview);
      onClose();
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        Código: 'PROD001',
        Nome: 'Exemplo Produto 1',
        Preço: 25.50,
        'Preço Cartão': 27.00,
        'Preço Pix': 24.00,
        'Preço Dinheiro': 23.50,
        'Preço Oferta': 22.00,
        Subcategoria: 'Bebidas',
      },
      {
        Código: 'PROD002',
        Nome: 'Exemplo Produto 2',
        Preço: 45.00,
        'Preço Cartão': 47.00,
        'Preço Pix': 43.00,
        'Preço Dinheiro': 42.50,
        'Preço Oferta': 40.00,
        Subcategoria: 'Laticínios',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, 'template-produtos.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Importar Produtos</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <button
              onClick={downloadTemplate}
              className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Baixar Modelo de Planilha
            </button>
          </div>

          {!preview.length && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-red-600 bg-red-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-2">
                Arraste e solte seu arquivo aqui
              </p>
              <p className="text-sm text-gray-500 mb-4">ou</p>
              <button
                onClick={() => inputRef.current?.click()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Selecionar Arquivo
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleChange}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-4">
                Formatos aceitos: .xlsx, .xls, .csv
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Erro na importação</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {preview.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-800 font-medium">
                  {preview.length} produtos prontos para importar
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                          Código
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                          Nome
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                          Preço
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                          Subcategoria
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((product, index) => (
                        <tr key={index} className="border-t border-gray-100">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {product.codigo}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {product.nome}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            R$ {product.preco.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {product.subcategoria_id || 'Sem categoria'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleImport}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Importar {preview.length} Produtos
                </button>
                <button
                  onClick={() => {
                    setPreview([]);
                    setFile(null);
                    setError(null);
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
