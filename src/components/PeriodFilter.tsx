import { useState } from 'react';
import { Periodo } from '../types';
import { Calendar } from 'lucide-react';

interface PeriodFilterProps {
  periodo: Periodo;
  onChange: (periodo: Periodo) => void;
}

const filtros: { label: string; value: Periodo }[] = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Ontem', value: 'ontem' },
  { label: '7 dias', value: '7dias' },
  { label: 'Semana', value: 'semana' },
  { label: 'Mês', value: 'mes' },
  { label: 'Personalizado', value: 'personalizado' },
];

export const PeriodFilter = ({ periodo, onChange }: PeriodFilterProps) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  const handlePeriodoChange = (value: Periodo) => {
    if (value === 'personalizado') {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
    }
    onChange(value);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {filtros.map((filtro) => (
            <button
              key={filtro.value}
              onClick={() => handlePeriodoChange(filtro.value)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                periodo === filtro.value
                  ? 'bg-red-600 text-white shadow-md transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow'
              }`}
            >
              {filtro.label}
            </button>
          ))}
        </div>
      </div>

      {periodo === 'personalizado' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-fadeIn">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-red-600" />
            <h3 className="text-sm font-semibold text-gray-900">Selecionar Período</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                max={dataFinal || undefined}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                min={dataInicial || undefined}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          {dataInicial && dataFinal && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Período selecionado:</span>{' '}
                {new Date(dataInicial + 'T00:00:00').toLocaleDateString('pt-BR')} até{' '}
                {new Date(dataFinal + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
