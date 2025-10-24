import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Periodo, Metric, Pedido } from '../types';

interface ReportData {
  periodo: Periodo;
  metrics: Metric[];
  pedidos: Pedido[];
}

export const generateReport = (data: ReportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('O Bom da Roça', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório de Vendas', pageWidth / 2, 30, { align: 'center' });

  const periodoLabels: Record<Periodo, string> = {
    hoje: 'Hoje',
    ontem: 'Ontem',
    '7dias': 'Últimos 7 dias',
    semana: 'Esta semana',
    mes: 'Este mês',
    personalizado: 'Período personalizado',
  };

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Período: ${periodoLabels[data.periodo]}`, pageWidth / 2, 37, { align: 'center' });
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 42, { align: 'center' });

  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.5);
  doc.line(20, 45, pageWidth - 20, 45);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Métricas do Período', 20, 55);

  const metricsData = data.metrics.map((m) => [
    m.label,
    m.value.toString(),
    m.change !== undefined ? `${m.change > 0 ? '+' : ''}${m.change}%` : '-',
  ]);

  autoTable(doc, {
    startY: 60,
    head: [['Métrica', 'Valor', 'Variação']],
    body: metricsData,
    theme: 'grid',
    headStyles: {
      fillColor: [220, 38, 38],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { left: 20, right: 20 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 140;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo dos Pedidos', 20, finalY + 10);

  const totalPedidos = data.pedidos.length;
  const totalValor = data.pedidos.reduce((sum, p) => sum + p.valor_total, 0);
  const pedidosPorStatus = {
    Novo: data.pedidos.filter((p) => p.status === 'Novo').length,
    'Em Atendimento': data.pedidos.filter((p) => p.status === 'Em Atendimento').length,
    Finalizado: data.pedidos.filter((p) => p.status === 'Finalizado').length,
  };

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de Pedidos: ${totalPedidos}`, 20, finalY + 20);
  doc.text(`Valor Total: R$ ${totalValor.toFixed(2)}`, 20, finalY + 27);
  doc.text(`Ticket Médio: R$ ${totalPedidos > 0 ? (totalValor / totalPedidos).toFixed(2) : '0.00'}`, 20, finalY + 34);

  doc.text(`Novos: ${pedidosPorStatus.Novo}`, 20, finalY + 44);
  doc.text(`Em Atendimento: ${pedidosPorStatus['Em Atendimento']}`, 70, finalY + 44);
  doc.text(`Finalizados: ${pedidosPorStatus.Finalizado}`, 130, finalY + 44);

  if (data.pedidos.length > 0) {
    const pedidosData = data.pedidos.slice(0, 20).map((p) => [
      p.numero_pedido,
      p.cliente,
      p.status,
      `R$ ${p.valor_total.toFixed(2)}`,
      new Date(p.created_at).toLocaleDateString('pt-BR'),
    ]);

    autoTable(doc, {
      startY: finalY + 55,
      head: [['Pedido', 'Cliente', 'Status', 'Valor', 'Data']],
      body: pedidosData,
      theme: 'striped',
      headStyles: {
        fillColor: [220, 38, 38],
        textColor: 255,
        fontStyle: 'bold',
      },
      margin: { left: 20, right: 20 },
      styles: {
        fontSize: 9,
      },
    });

    if (data.pedidos.length > 20) {
      const tableEndY = (doc as any).lastAutoTable.finalY;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Exibindo os primeiros 20 pedidos de ${data.pedidos.length}`, 20, tableEndY + 10);
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  const fileName = `relatorio-obdr-${periodoLabels[data.periodo].toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`;
  doc.save(fileName);
};
