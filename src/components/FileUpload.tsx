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
  preco_varejo?: number;
  preco_cartao?: number;
  preco_pix?: number;
  preco_dinheiro?: number;
  categoria?: string;
  subcategoria_id?: string;
  marca?: string;
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
          // Campos obrigatórios
          const codigo = row['Código'] || row['Codigo'] || row['codigo'] || row['CÓDIGO'] || '';
          const nome = row['Nome'] || row['nome'] || row['NOME'] || row['Produto'] || row['produto'] || '';
          
          // Preço Varejo (obrigatório) - aceita "Preço Varejo" ou "Preço" para compatibilidade
          const precoVarejo = parseFloat(
            row['Preço Varejo'] || row['Preco Varejo'] || row['preco_varejo'] || row['PREÇO VAREJO'] ||
            row['Preço'] || row['Preco'] || row['preco'] || row['PREÇO'] || row['Valor'] || '0'
          );

          // Campos opcionais
          const marca = row['Marca'] || row['marca'] || row['MARCA'] || '';
          const categoria = row['Categoria'] || row['categoria'] || row['CATEGORIA'] || '';
          const subcategoria = row['Subcategoria'] || row['subcategoria'] || row['SUBCATEGORIA'] || '';

          // Preços opcionais (atacado)
          const precoCartao = row['Preço Cartão'] || row['Preco Cartao'] || row['preco_cartao'] || row['PREÇO CARTÃO'] || '';
          const precoPix = row['Preço PIX'] || row['Preco PIX'] || row['Preço Pix'] || row['Preco Pix'] || row['preco_pix'] || row['PREÇO PIX'] || '';
          const precoDinheiro = row['Preço TED/Dinheiro'] || row['Preço Dinheiro'] || row['Preco Dinheiro'] || row['preco_dinheiro'] || row['PREÇO DINHEIRO'] || row['PREÇO TED/DINHEIRO'] || '';

          if (!codigo || !nome || isNaN(precoVarejo) || precoVarejo <= 0) {
            throw new Error(`Linha ${index + 2}: Dados incompletos ou inválidos (código, nome e preço varejo são obrigatórios)`);
          }

          const product: ImportedProduct = {
            codigo: String(codigo).trim(),
            nome: String(nome).trim(),
            preco: precoVarejo, // Mantém compatibilidade com campo antigo
            preco_varejo: precoVarejo,
            marca: marca ? String(marca).trim() : undefined,
            categoria: categoria ? String(categoria).trim() : undefined,
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
        'Código': 'PROD001',
        'Nome': 'Queijo Minas Artesanal 500g',
        'Marca': 'Fazenda São João',
        'Preço Varejo': 45.00,
        'Preço Cartão': 42.00,
        'Preço PIX': 40.00,
        'Preço TED/Dinheiro': 38.00,
        'Categoria': 'Laticínios',
        'Subcategoria': 'Queijos',
      },
      {
        'Código': 'PROD002',
        'Nome': 'Cachaça Artesanal 700ml',
        'Marca': 'Alambique Mineiro',
        'Preço Varejo': 65.00,
        'Preço Cartão': 60.00,
        'Preço PIX': 58.00,
        'Preço TED/Dinheiro': 55.00,
        'Categoria': 'Bebidas',
        'Subcategoria': 'Cachaças',
      },
      {
        'Código': 'PROD003',
        'Nome': 'Doce de Leite 400g',
        'Marca': 'Fazenda São João',
        'Preço Varejo': 28.00,
        'Preço Cartão': 26.00,
        'Preço PIX': 25.00,
        'Preço TED/Dinheiro': 24.00,
        'Categoria': 'Doces',
        'Subcategoria': 'Doces de Leite',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 12 },  // Código
      { wch: 35 },  // Nome
      { wch: 20 },  // Marca
      { wch: 14 },  // Preço Varejo
      { wch: 14 },  // Preço Cartão
      { wch: 12 },  // Preço PIX
      { wch: 18 },  // Preço TED/Dinheiro
      { wch: 15 },  // Categoria
      { wch: 18 },  // Subcategoria
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, 'template-produtos-obomdaroca.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={downloadTemplate}
              className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Baixar Modelo de Planilha
            </button>
            <div className="text-xs text-gray-500">
              Colunas: Código*, Nome*, Marca, Preço Varejo*, Preço Cartão, Preço PIX, Preço TED/Dinheiro, Categoria, Subcategoria
            </div>
          </div>

          {/* Informações sobre as regras de preço */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <p className="font-medium mb-1">Regras de Precificação:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Varejo:</strong> Preço padrão, sem quantidade mínima</li>
              <li><strong>Cartão:</strong> Mínimo R$300 ou 10 unidades do mesmo produto/marca</li>
              <li><strong>PIX:</strong> Mínimo R$300 ou 15 unidades do mesmo produto/marca</li>
              <li><strong>TED/Dinheiro:</strong> Mínimo R$300 ou 15 unidades do mesmo produto/marca</li>
            </ul>
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
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">
                          Código
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">
                          Nome
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">
                          Marca
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">
                          Varejo
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">
                          Cartão
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">
                          PIX
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">
                          TED/Din.
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((product, index) => (
                        <tr key={index} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-xs text-gray-900">
                            {product.codigo}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900 max-w-[200px] truncate" title={product.nome}>
                            {product.nome}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {product.marca || '-'}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900 font-medium">
                            R$ {(product.preco_varejo || product.preco).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {product.preco_cartao ? `R$ ${product.preco_cartao.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {product.preco_pix ? `R$ ${product.preco_pix.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {product.preco_dinheiro ? `R$ ${product.preco_dinheiro.toFixed(2)}` : '-'}
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