import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Produto } from '../types';

interface SearchableProductSelectProps {
  produtos: Produto[];
  value: string;
  onChange: (produto: Produto) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const SearchableProductSelect = ({
  produtos,
  value,
  onChange,
  disabled = false,
  placeholder = 'Digite para buscar produto...',
}: SearchableProductSelectProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredProdutos = produtos.filter((produto) => {
    const term = searchTerm.toLowerCase();
    return (
      produto.nome.toLowerCase().includes(term) ||
      produto.codigo.toLowerCase().includes(term)
    );
  }).slice(0, 50);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      const produto = produtos.find((p) => p.nome === value);
      if (produto) {
        setSearchTerm(produto.nome);
      }
    }
  }, [value, produtos]);

  const handleSelect = (produto: Produto) => {
    setSearchTerm(produto.nome);
    setIsOpen(false);
    onChange(produto);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredProdutos.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredProdutos[selectedIndex]) {
          handleSelect(filteredProdutos[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-yellow-200 font-semibold">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {searchTerm && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {filteredProdutos.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <p className="font-medium">Nenhum produto encontrado</p>
              <p className="text-sm mt-1">
                Tente buscar por nome ou código do produto
              </p>
            </div>
          ) : (
            <>
              <div className="sticky top-0 bg-gray-50 px-4 py-2 text-xs text-gray-600 border-b border-gray-200">
                {filteredProdutos.length} produto{filteredProdutos.length !== 1 ? 's' : ''}{' '}
                encontrado{filteredProdutos.length !== 1 ? 's' : ''}
                {filteredProdutos.length === 50 && ' (mostrando primeiros 50)'}
              </div>
              {filteredProdutos.map((produto, index) => (
                <button
                  key={produto.id}
                  type="button"
                  onClick={() => handleSelect(produto)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
                    index === selectedIndex ? 'bg-red-50' : ''
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {highlightMatch(produto.nome, searchTerm)}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        Código: {highlightMatch(produto.codigo, searchTerm)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      R$ {produto.preco.toFixed(2)}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
