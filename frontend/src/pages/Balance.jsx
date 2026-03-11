import { useEffect, useState } from 'react';
import client from '../api/client';
import Toast from '../components/ui/Toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatMoney = (n) => Number(n || 0).toFixed(2);

function GroupedBalance({ title, accounts, accountType }) {
  const filteredAccounts = accounts.filter(a => 
    Number(a.total_debit) !== 0 || Number(a.total_credit) !== 0 || Number(a.balance) !== 0
  );

  const totalDebit = accounts.reduce((sum, a) => sum + (Number(a.total_debit) || 0), 0);
  const totalCredit = accounts.reduce((sum, a) => sum + (Number(a.total_credit) || 0), 0);
  
  // Para pasivo y patrimonio, el saldo debe mostrarse positivo (invertir el signo)
  // Para ingresos (grupo 7): signo positivo
  // Para gastos (grupo 6): signo negativo
  const isPasivoOrPatrimonio = accountType === 'pasivo' || accountType === 'patrimonio';
  const isIngreso = accountType === 'ingreso';
  const isGasto = accountType === 'gasto';
  
  const totalBalance = accounts.reduce((sum, a) => {
    const balance = Number(a.balance) || 0;
    if (isPasivoOrPatrimonio) {
      return sum + (-balance); // Invertir signo para pasivo y patrimonio
    } else if (isGasto) {
      return sum + (-Math.abs(balance)); // Siempre negativo para gastos
    }
    return sum + balance; // Activo e ingresos como están
  }, 0);

  if (filteredAccounts.length === 0) return null;

  // Función para formatear el saldo considerando el tipo de cuenta
  const formatBalance = (balance) => {
    const numBalance = Number(balance) || 0;
    let displayBalance;
    if (isPasivoOrPatrimonio) {
      displayBalance = -numBalance; // Invertir signo para pasivo y patrimonio
    } else if (isGasto) {
      displayBalance = -Math.abs(numBalance); // Siempre negativo para gastos
    } else {
      displayBalance = numBalance; // Activo e ingresos como están
    }
    return formatMoney(displayBalance);
  };

  // Función para determinar el color del saldo
  const getBalanceColor = (balance) => {
    const numBalance = Number(balance) || 0;
    let displayBalance;
    if (isPasivoOrPatrimonio) {
      displayBalance = -numBalance;
    } else if (isGasto) {
      displayBalance = -Math.abs(numBalance);
    } else {
      displayBalance = numBalance;
    }
    return displayBalance >= 0 ? 'text-emerald-400' : 'text-rose-400';
  };

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-lg font-bold text-white border-b border-white/10 pb-2">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-surface-800/40">
            <tr>
              <th className="erp-th text-left w-20">Codigo</th>
              <th className="erp-th text-left">Cuenta</th>
              <th className="erp-th text-right w-32">Debe</th>
              <th className="erp-th text-right w-32">Haber</th>
              <th className="erp-th text-right w-32">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredAccounts.map((account) => (
              <tr key={account.id} className="hover:bg-white/5">
                <td className="erp-td font-mono text-sm">{account.code}</td>
                <td className="erp-td">{account.name}</td>
                <td className="erp-td text-right font-mono">{formatMoney(account.total_debit)}</td>
                <td className="erp-td text-right font-mono">{formatMoney(account.total_credit)}</td>
                <td className={`erp-td text-right font-mono font-bold ${getBalanceColor(account.balance)}`}>
                  {formatBalance(account.balance)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-surface-900/60">
            <tr>
              <td className="erp-td font-bold" colSpan={2}>Total {title}</td>
              <td className="erp-td text-right font-mono font-bold">{formatMoney(totalDebit)}</td>
              <td className="erp-td text-right font-mono font-bold">{formatMoney(totalCredit)}</td>
              <td className={`erp-td text-right font-mono font-bold ${totalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatMoney(totalBalance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function generateBalanceSheetPDF(accounts) {
  const doc = new jsPDF();
  
  // Colores corporativos profesionales
  const colorHeader = [33, 53, 85];    // Azul oscuro corporativo
  const colorActivo = [46, 139, 87];   // Verde mar
  const colorPasivo = [178, 34, 34];    // Rojo oscuro
  const colorPatrimonio = [70, 130, 180]; // Azul acero
  
  const activo = accounts.filter(a => a.account_type === 'activo' && Number(a.balance) !== 0);
  const pasivoOriginal = accounts.filter(a => a.account_type === 'pasivo' && Number(a.balance) !== 0);
  const patrimonio = accounts.filter(a => a.account_type === 'patrimonio' && Number(a.balance) !== 0 && a.code !== '129');
  
  // Obtener resultado del ejercicio
  const ingresos = accounts.filter(a => a.account_type === 'ingreso');
  const gastos = accounts.filter(a => a.account_type === 'gasto');
  const totalIngresos = ingresos.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalGastos = gastos.reduce((sum, a) => sum + Number(a.balance), 0);
  const resultado = totalIngresos - totalGastos;
  
  // Cuenta 129 (resultado) incluida en pasivo
  const resultado129 = accounts.find(a => a.code === '129');
  
  // Pasivo: cuentas originales + resultado (con signo invertido para mostrar positivo)
  const pasivo = [
    ...pasivoOriginal.map(a => ({ ...a, balance: -Number(a.balance) })),
    ...(resultado129 ? [{ ...resultado129, balance: resultado }] : [])
  ].filter(a => Number(a.balance) !== 0);

  const totalActivo = activo.reduce((sum, a) => sum + Number(a.balance), 0);
  // Total pasivo con signo invertido para que muestre positivo
  const totalPasivo = pasivoOriginal.reduce((sum, a) => sum + (-Number(a.balance)), 0) + resultado;
  const totalPatrimonio = patrimonio.reduce((sum, a) => sum + Number(a.balance), 0);
  
  const balancingFigure = totalActivo - (totalPasivo + totalPatrimonio);

  // Encabezado profesional
  doc.setFillColor(...colorHeader);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('BALANCE DE SITUACIÓN', 105, 18, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(fecha, 105, 28, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text('Informe financiero', 105, 35, { align: 'center' });

  // Reset colors
  doc.setTextColor(0, 0, 0);
  let yPos = 50;

  // Función helper para表格
  const drawTable = (title, data, total, color, showTotal = true) => {
    if (data.length === 0) return yPos;
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(title, 14, yPos);
    yPos += 3;
    
    // Línea decorativa
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.line(14, yPos, 196, yPos);
    yPos += 7;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Código', 'Cuenta', 'Saldo (€)']],
      body: data.map(a => [a.code, a.name, formatMoney(a.balance)]),
      theme: 'grid',
      headStyles: {
        fillColor: color,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 35, halign: 'right' }
      },
      margin: { left: 14, right: 14 },
    });
    yPos = doc.lastAutoTable.finalY + 5;
    
    if (showTotal) {
      doc.setFillColor(245, 245, 245);
      doc.rect(14, yPos - 2, 182, 8, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...color);
      doc.text('TOTAL ' + title.toUpperCase(), 18, yPos + 3);
      doc.text(formatMoney(total) + ' €', 192, yPos + 3, { align: 'right' });
      yPos += 12;
    }
    
    return yPos;
  };

  // Dibujar secciones
  yPos = drawTable('ACTIVO', activo, totalActivo, colorActivo);
  yPos = drawTable('PASIVO', pasivo, totalPasivo, colorPasivo);
  yPos = drawTable('PATRIMONIO NETO', patrimonio, totalPatrimonio, colorPatrimonio);

  // Nota de verificación
  if (Math.abs(balancingFigure) > 0.01) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(200, 0, 0);
    doc.text('Diferencia: ' + formatMoney(balancingFigure) + ' €', 195, yPos, { align: 'right' });
  }

  // Pie de página
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Documento generado automáticamente - ERP Contable', 105, pageHeight - 7, { align: 'center' });

  doc.save('balance_situacion.pdf');
}

function generateIncomeStatementPDF(accounts) {
  const doc = new jsPDF();
  
  // Colores corporativos profesionales
  const colorHeader = [33, 53, 85];    // Azul oscuro corporativo
  const colorIngresos = [46, 139, 87]; // Verde mar
  const colorGastos = [178, 34, 34];  // Rojo oscuro
  
  const ingresos = accounts.filter(a => a.account_type === 'ingreso' && Number(a.balance) !== 0);
  const gastos = accounts.filter(a => a.account_type === 'gasto' && Number(a.balance) !== 0);

  // Encabezado profesional
  doc.setFillColor(...colorHeader);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('CUENTA DE PÉRDIDAS Y GANANCIAS', 105, 18, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(fecha, 105, 28, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text('Estado de resultados', 105, 35, { align: 'center' });

  // Reset colors
  doc.setTextColor(0, 0, 0);
  let yPos = 50;

  // Función helper para tablas
  const drawTablePyG = (title, data, total, color, isNegative = false) => {
    if (data.length === 0) return yPos;
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(title, 14, yPos);
    yPos += 3;
    
    // Línea decorativa
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.line(14, yPos, 196, yPos);
    yPos += 7;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Código', 'Cuenta', 'Importe (€)']],
      body: data.map(a => [
        a.code, 
        a.name, 
        isNegative ? formatMoney(-Math.abs(a.balance)) : formatMoney(a.balance)
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: color,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 35, halign: 'right' }
      },
      margin: { left: 14, right: 14 },
    });
    yPos = doc.lastAutoTable.finalY + 5;
    
    // Total con fondo
    doc.setFillColor(245, 245, 245);
    doc.rect(14, yPos - 2, 182, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    const totalLabel = isNegative ? 'TOTAL GASTOS' : 'TOTAL INGRESOS';
    doc.text(totalLabel, 18, yPos + 3);
    const displayTotal = isNegative ? formatMoney(-Math.abs(total)) : formatMoney(total);
    doc.text(displayTotal + ' €', 192, yPos + 3, { align: 'right' });
    yPos += 12;
    
    return yPos;
  };

  // Calcular totales
  const totalIngresos = ingresos.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalGastos = gastos.reduce((sum, a) => sum + Number(a.balance), 0);
  const resultado = totalIngresos - totalGastos;

  // Dibujar secciones
  yPos = drawTablePyG('INGRESOS', ingresos, totalIngresos, colorIngresos, false);
  yPos = drawTablePyG('GASTOS', gastos, totalGastos, colorGastos, true);

  // Resultado del ejercicio
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, 196, yPos);
  yPos += 10;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  
  if (resultado >= 0) {
    // Beneficio
    doc.setFillColor(46, 204, 113);
    doc.rect(14, yPos - 4, 182, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('RESULTADO DEL EJERCICIO (BENEFICIO)', 18, yPos + 4);
    doc.text(formatMoney(resultado) + ' €', 192, yPos + 4, { align: 'right' });
  } else {
    // Pérdida
    doc.setFillColor(231, 76, 60);
    doc.rect(14, yPos - 4, 182, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('RESULTADO DEL EJERCICIO (PÉRDIDA)', 18, yPos + 4);
    doc.text(formatMoney(Math.abs(resultado)) + ' €', 192, yPos + 4, { align: 'right' });
  }

  // Pie de página
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Documento generado automáticamente - ERP Contable', 105, pageHeight - 7, { align: 'center' });

  doc.save('cuenta_resultados.pdf');
}

export default function Balance() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await client.get('/reports/balance');
        setAccounts(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        showToast(e.response?.data?.error || 'Error al cargar balance', 'error');
        setAccounts([]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Obtener el resultado del ejercicio (cuenta 129)
  const ingresos = accounts.filter(a => a.account_type === 'ingreso');
  const gastos = accounts.filter(a => a.account_type === 'gasto');
  const resultado = ingresos.reduce((sum, a) => sum + (Number(a.balance) || 0), 0) - 
                    gastos.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  
  // Obtener las cuentas de patrimonio sin la 129 (resultado)
  const patrimonioSin129 = accounts.filter(a => a.account_type === 'patrimonio' && a.code !== '129');
  
  // Las cuentas de pasivo incluyen las originales + resultado del ejercicio (cuenta 129)
  const pasivoConResultado = accounts.filter(a => a.account_type === 'pasivo' || a.code === '129');

  const groupedAccounts = {
    activo: accounts.filter(a => a.account_type === 'activo'),
    pasivo: pasivoConResultado,
    patrimonio: patrimonioSin129,
    ingreso: accounts.filter(a => a.account_type === 'ingreso'),
    gasto: accounts.filter(a => a.account_type === 'gasto')
  };
  
  // Guardar resultado para uso en PDF
  const resultadoDelEjercicio = resultado;

  const filteredAccounts = accounts.filter(a => 
    Number(a.total_debit) !== 0 || Number(a.total_credit) !== 0 || Number(a.balance) !== 0
  );

  const totals = {
    totalDebit: accounts.reduce((sum, a) => sum + (Number(a.total_debit) || 0), 0),
    totalCredit: accounts.reduce((sum, a) => sum + (Number(a.total_credit) || 0), 0),
    totalBalance: accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
  };

  const handleGeneratePDF = (type) => {
    if (accounts.length === 0) {
      showToast('No hay datos para generar el PDF', 'error');
      return;
    }

    try {
      if (type === 'balance') {
        generateBalanceSheetPDF(accounts);
        showToast('PDF de Balance de Situacion generado', 'success');
      } else if (type === 'income') {
        generateIncomeStatementPDF(accounts);
        showToast('PDF de Cuenta de Resultados generado', 'success');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Error al generar PDF: ' + error.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Balance de Sumas y Saldos</h1>
          <p className="mt-1 text-sm text-slate-400">Resumen de movimientos por cuenta contable.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleGeneratePDF('balance')}
            disabled={loading || accounts.length === 0}
            className="erp-btn-primary"
          >
            Balance PDF
          </button>
          <button
            onClick={() => handleGeneratePDF('income')}
            disabled={loading || accounts.length === 0}
            className="erp-btn-primary"
          >
            Resultados PDF
          </button>
        </div>
      </div>

      {loading && (
        <div className="erp-panel p-8 text-center">
          <p className="text-slate-400">Cargando balance...</p>
        </div>
      )}

      {!loading && filteredAccounts.length === 0 && (
        <div className="erp-panel p-8 text-center">
          <p className="text-slate-400">No hay datos de balance. Crea asientos contables primero.</p>
        </div>
      )}

      {!loading && filteredAccounts.length > 0 && (
        <>
          {groupedAccounts.activo.length > 0 && (
            <GroupedBalance title="ACTIVO" accounts={groupedAccounts.activo} accountType="activo" />
          )}
          {groupedAccounts.pasivo.length > 0 && (
            <GroupedBalance title="PASIVO" accounts={groupedAccounts.pasivo} accountType="pasivo" />
          )}
          {groupedAccounts.patrimonio.length > 0 && (
            <GroupedBalance title="PATRIMONIO NETO" accounts={groupedAccounts.patrimonio} accountType="patrimonio" />
          )}
          {groupedAccounts.ingreso.length > 0 && (
            <GroupedBalance title="INGRESOS" accounts={groupedAccounts.ingreso} accountType="ingreso" />
          )}
          {groupedAccounts.gasto.length > 0 && (
            <GroupedBalance title="GASTOS" accounts={groupedAccounts.gasto} accountType="gasto" />
          )}

          <div className="erp-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-white">TOTALES</h3>
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="text-center min-w-[100px]">
                  <p className="text-slate-400">Total Debe</p>
                  <p className="text-xl font-mono font-bold text-white">{formatMoney(totals.totalDebit)} EUR</p>
                </div>
                <div className="text-center min-w-[100px]">
                  <p className="text-slate-400">Total Haber</p>
                  <p className="text-xl font-mono font-bold text-white">{formatMoney(totals.totalCredit)} EUR</p>
                </div>
                <div className="text-center min-w-[100px]">
                  <p className="text-slate-400">Diferencia</p>
                  <p className={`text-xl font-mono font-bold ${Math.abs(totals.totalDebit - totals.totalCredit) < 0.01 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatMoney(totals.totalDebit - totals.totalCredit)} EUR
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
