import { Produto } from '../types';

export const produtos: Produto[] = [
  { id: '1', codigo: 'PROD001', nome: 'Cachaça Artesanal 500ml', preco: 35.00 },
  { id: '2', codigo: 'PROD002', nome: 'Queijo Minas Padrão 1kg', preco: 55.00 },
  { id: '3', codigo: 'PROD003', nome: 'Doce de Leite 300g', preco: 30.00 },
  { id: '4', codigo: 'PROD004', nome: 'Linguiça Calabresa 500g', preco: 23.00 },
  { id: '5', codigo: 'PROD005', nome: 'Pão de Açúcar 200g', preco: 13.00 },
  { id: '6', codigo: 'PROD006', nome: 'Mel Puro 250g', preco: 28.00 },
  { id: '7', codigo: 'PROD007', nome: 'Goiabada Cascão 500g', preco: 18.00 },
  { id: '8', codigo: 'PROD008', nome: 'Rapadura 200g', preco: 8.00 },
  { id: '9', codigo: 'PROD009', nome: 'Café Torrado 500g', preco: 25.00 },
  { id: '10', codigo: 'PROD010', nome: 'Farinha de Milho 1kg', preco: 12.00 },
];

export const useProdutos = () => {
  return { produtos };
};
