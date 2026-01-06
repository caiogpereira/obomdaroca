import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, AlertTriangle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Produto } from '../types';

interface FileUploadProps {
  onProductsImported: (produtos: Omit<Produto, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
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

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ImportProgress {
  stage: 'idle' | 'parsing' | 'validating' | 'importing' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

const MAX_FILE_SIZE_MB = 10;
const PREVIEW_LIMIT = 100; // Only show first 100 in preview
const BATCH_SIZE = 100; // Smaller batches for reliability

export const FileUpload = ({ onProductsImported, onClose }: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [products, setProducts] = useState<ImportedProduct[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [progress, setProgress] = useState<ImportProgress>({
    stage: 'idle',
    current: 0,
    total: 0,
    message: '',
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const parseValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  };

  const parseNumber = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const str = String(value).replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  };

  const processFile = useCallback(async (file: File) => {
    // Reset state
    setErrors([]);
    setDuplicates([]);
    setProducts([]);
    setProgress({ stage: 'parsing', current: 0, total: 0, message: 'Lendo arquivo...' });

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setProgress({
        stage: 'error',
        current: 0,
        total: 0,
        message: `Arquivo muito grande (${fileSizeMB.toFixed(1)}MB). Máximo permitido: ${MAX_FILE_SIZE_MB}MB`,
      });
      return;
    }

    try {
      // Read file in chunks to avoid blocking UI
      const data = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsArrayBuffer(file);
      });

      setProgress({ stage: 'parsing', current: 30, total: 100, message: 'Processando planilha...' });

      // Parse Excel - this is the heavy operation
      const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

      if (jsonData.length === 0) {
        setProgress({ stage: 'error', current: 0, total: 0, message: 'O arquivo está vazio' });
        return;
      }

      setProgress({
        stage: 'validating',
        current: 50,
        total: 100,
        message: `Validando ${jsonData.length} produtos...`,
      });

      // Process and validate in batches to avoid freezing
      const validationErrors: ValidationError[] = [];
      const seenCodes = new Map<string, number>();
      const duplicateCodes: string[] = [];
      const validProducts: ImportedProduct[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNum = i + 2; // +2 because row 1 is header

        // Extract fields with multiple possible column names
        const codigo = parseValue(row['Código'] || row['Codigo'] || row['codigo'] || row['CÓDIGO'] || row['SKU'] || row['sku']);
        const nome = parseValue(row['Nome'] || row['nome'] || row['NOME'] || row['Produto'] || row['produto'] || row['Descrição'] || row['descricao']);
        const preco = parseNumber(row['Preço'] || row['Preco'] || row['preco'] || row['PREÇO'] || row['Valor'] || row['valor']);
        const subcategoria = parseValue(row['Subcategoria'] || row['subcategoria'] || row['SUBCATEGORIA'] || row['Categoria'] || row['categoria']);

        // Validate required fields
        if (!codigo) {
          validationErrors.push({ row: rowNum, field: 'Código', message: 'Código é obrigatório' });
          continue;
        }

        if (!nome) {
          validationErrors.push({ row: rowNum, field: 'Nome', message: 'Nome é obrigatório' });
          continue;
        }

        if (preco === null || preco < 0) {
          validationErrors.push({ row: rowNum, field: 'Preço', message: 'Preço inválido ou negativo' });
          continue;
        }

        // Check for duplicates within file
        const existingRow = seenCodes.get(codigo.toLowerCase());
        if (existingRow) {
          duplicateCodes.push(`${codigo} (linhas ${existingRow} e ${rowNum})`);
          continue;
        }
        seenCodes.set(codigo.toLowerCase(), rowNum);

        // Build product object
        const product: ImportedProduct = {
          codigo,
          nome,
          preco,
          subcategoria_id: subcategoria || undefined,
        };

        // Optional price fields
        const precoCartao = parseNumber(row['Preço Cartão'] || row['Preco Cartao'] || row['preco_cartao'] || row['PREÇO CARTÃO']);
        const precoPix = parseNumber(row['Preço Pix'] || row['Preco Pix'] || row['preco_pix'] || row['PREÇO PIX']);
        const precoDinheiro = parseNumber(row['Preço Dinheiro'] || row['Preco Dinheiro'] || row['preco_dinheiro'] || row['PREÇO DINHEIRO']);
        const precoOferta = parseNumber(row['Preço Oferta'] || row['Preco Oferta'] || row['preco_oferta'] || row['PREÇO OFERTA']);

        if (precoCartao !== null && precoCartao >= 0) product.preco_cartao = precoCartao;
        if (precoPix !== null && precoPix >= 0) product.preco_pix = precoPix;
        if (precoDinheiro !== null && precoDinheiro >= 0) product.preco_dinheiro = precoDinheiro;
        if (precoOferta !== null && precoOferta >= 0) product.preco_oferta = precoOferta;

        validProducts.push(product);

        // Update progress every 100 rows
        if (i % 100 === 0) {
          setProgress({
            stage: 'validating',
            current: 50 + Math.floor((i / jsonData.length) * 40),
            total: 100,
            message: `Validando... ${i}/${jsonData.length}`,
          });
          // Allow UI to update
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      setErrors(validationErrors);
      setDuplicates(duplicateCodes);
      setProducts(validProducts);
      setFile(file);

      if (validProducts.length === 0) {
        setProgress({
          stage: 'error',
          current: 0,
          total: 0,
          message: 'Nenhum produto válido encontrado. Verifique os erros abaixo.',
        });
      } else {
        setProgress({
          stage: 'idle',
          current: 100,
          total: 100,
          message: `${validProducts.length} produtos prontos para importar`,
        });
      }
    } catch (err) {
      console.error('Error processing file:', err);
      setProgress({
        stage: 'error',
        current: 0,
        total: 0,
        message: err instanceof Error ? err.message : 'Erro ao processar arquivo',
      });
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      const isValidType = validTypes.includes(droppedFile.type) || 
        droppedFile.name.endsWith('.csv') || 
        droppedFile.name.endsWith('.xlsx') || 
        droppedFile.name.endsWith('.xls');

      if (isValidType) {
        processFile(droppedFile);
      } else {
        setProgress({
          stage: 'error',
          current: 0,
          total: 0,
          message: 'Formato inválido. Use arquivos Excel (.xlsx, .xls) ou CSV',
        });
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (products.length === 0) return;

    abortControllerRef.current = new AbortController();
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);

    setProgress({
      stage: 'importing',
      current: 0,
      total: products.length,
      message: 'Iniciando importação...',
    });

    try {
      // Import in batches
      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        // Check if import was cancelled
        if (abortControllerRef.current.signal.aborted) {
          throw new Error('Importação cancelada');
        }

        const batch = products.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;

        setProgress({
          stage: 'importing',
          current: i,
          total: products.length,
          message: `Importando lote ${batchNum} de ${totalBatches}...`,
        });

        // Call the parent's import function with this batch
        await onProductsImported(batch);

        // Small delay between batches to avoid overwhelming the server
        if (i + BATCH_SIZE < products.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      setProgress({
        stage: 'complete',
        current: products.length,
        total: products.length,
        message: `${products.length} produtos importados com sucesso!`,
      });

      // Auto close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Import error:', err);
      setProgress({
        stage: 'error',
        current: progress.current,
        total: products.length,
        message: err instanceof Error ? err.message : 'Erro durante a importação',
      });
    }
  };

  const handleCancel = () => {
    if (progress.stage === 'importing') {
      abortControllerRef.current?.abort();
    }
    setProducts([]);
    setFile(null);
    setErrors([]);
    setDuplicates([]);
    setProgress({ stage: 'idle', current: 0, total: 0, message: '' });
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Código': 'PROD001',
        'Nome': 'Queijo Minas Artesanal',
        'Preço': 35.90,
        'Preço Cartão': 37.50,
        'Preço Pix': 34.00,
        'Preço Dinheiro': 33.50,
        'Preço Oferta': 32.00,
        'Subcategoria': 'Laticínios',
      },
      {
        'Código': 'PROD002',
        'Nome': 'Doce de Leite 500g',
        'Preço': 22.00,
        'Preço Cartão': 23.50,
        'Preço Pix': 21.00,
        'Preço Dinheiro': 20.50,
        'Preço Oferta': 19.00,
        'Subcategoria': 'Doces',
      },
      {
        'Código': 'PROD003',
        'Nome': 'Cachaça Artesanal 700ml',
        'Preço': 45.00,
        'Preço Cartão': '',
        'Preço Pix': '',
        'Preço Dinheiro': '',
        'Preço Oferta': '',
        'Subcategoria': 'Bebidas',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Código
      { wch: 30 }, // Nome
      { wch: 10 }, // Preço
      { wch: 12 }, // Preço Cartão
      { wch: 10 }, // Preço Pix
      { wch: 14 }, // Preço Dinheiro
      { wch: 12 }, // Preço Oferta
      { wch: 15 }, // Subcategoria
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, 'template-produtos-obomdaroca.xlsx');
  };

  const previewProducts = products.slice(0, PREVIEW_LIMIT);
  const hasMoreProducts = products.length > PREVIEW_LIMIT;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Importar Produtos</h2>
            <p className="text-sm text-gray-500 mt-1">
              Suporta arquivos Excel (.xlsx, .xls) e CSV com até {MAX_FILE_SIZE_MB}MB
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={progress.stage === 'importing'}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow">
          {/* Template Download */}
          <div className="mb-4">
            <button
              onClick={downloadTemplate}
              className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Baixar Modelo de Planilha
            </button>
          </div>

          {/* Upload Area */}
          {!file && progress.stage !== 'parsing' && progress.stage !== 'validating' && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-red-600 bg-red-50' : 'border-gray-300 hover:border-gray-400'
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
                Formatos: .xlsx, .xls, .csv • Máximo: {MAX_FILE_SIZE_MB}MB
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {(progress.stage === 'parsing' || progress.stage === 'validating' || progress.stage === 'importing') && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
                <span className="text-sm font-medium text-gray-700">{progress.message}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max((progress.current / Math.max(progress.total, 1)) * 100, progress.stage === 'parsing' ? 30 : 0)}%` }}
                />
              </div>
              {progress.stage === 'importing' && (
                <p className="text-xs text-gray-500 mt-2">
                  {progress.current} de {progress.total} produtos
                </p>
              )}
            </div>
          )}

          {/* Success Message */}
          {progress.stage === 'complete' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="font-medium text-green-800">{progress.message}</span>
            </div>
          )}

          {/* Error Message */}
          {progress.stage === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Erro</p>
                <p className="text-sm text-red-700 mt-1">{progress.message}</p>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  {errors.length} erro(s) de validação
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto text-sm text-yellow-700">
                {errors.slice(0, 10).map((err, i) => (
                  <p key={i}>Linha {err.row}: {err.field} - {err.message}</p>
                ))}
                {errors.length > 10 && (
                  <p className="font-medium">...e mais {errors.length - 10} erros</p>
                )}
              </div>
            </div>
          )}

          {/* Duplicate Warnings */}
          {duplicates.length > 0 && (
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-800">
                  {duplicates.length} código(s) duplicado(s) ignorados
                </span>
              </div>
              <div className="max-h-24 overflow-y-auto text-sm text-orange-700">
                {duplicates.slice(0, 5).map((dup, i) => (
                  <p key={i}>{dup}</p>
                ))}
                {duplicates.length > 5 && (
                  <p className="font-medium">...e mais {duplicates.length - 5}</p>
                )}
              </div>
            </div>
          )}

          {/* Preview Table */}
          {products.length > 0 && progress.stage !== 'importing' && progress.stage !== 'complete' && (
            <div>
              <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-800 font-medium">
                  {products.length} produtos prontos para importar
                  {hasMoreProducts && ` (mostrando primeiros ${PREVIEW_LIMIT})`}
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Código</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Nome</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Preço</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Categoria</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewProducts.map((product, index) => (
                        <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                          <td className="px-3 py-2 font-mono text-gray-900">{product.codigo}</td>
                          <td className="px-3 py-2 text-gray-900">{product.nome}</td>
                          <td className="px-3 py-2 text-gray-900">R$ {product.preco.toFixed(2)}</td>
                          <td className="px-3 py-2 text-gray-600">{product.subcategoria_id || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {hasMoreProducts && (
                  <div className="bg-gray-50 px-4 py-2 text-center text-sm text-gray-500 border-t">
                    ...e mais {products.length - PREVIEW_LIMIT} produtos
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {products.length > 0 && progress.stage !== 'complete' && (
          <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={handleImport}
              disabled={progress.stage === 'importing'}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {progress.stage === 'importing' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Importando...
                </>
              ) : (
                <>Importar {products.length} Produtos</>
              )}
            </button>
            <button
              onClick={handleCancel}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              {progress.stage === 'importing' ? 'Cancelar' : 'Limpar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
