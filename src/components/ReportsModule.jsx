import React, { useState, useEffect } from 'react';
import { db } from '../db';
import {
  FileText,
  FileSpreadsheet,
  Printer,
  Calendar,
  Layers,
  Users,
  Coins,
  TrendingUp
} from 'lucide-react';

export default function ReportsModule() {
  const [activeReport, setActiveReport] = useState('monthly');
  const [reportData, setReportData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [usersLookup, setUsersLookup] = useState([]);

  useEffect(() => {
    const initData = async () => {
      try {
        const [cats, emps, users] = await Promise.all([
          db.getCategories(),
          db.getEmployees(),
          db.getUsers()
        ]);
        setCategories(cats);
        setEmployees(emps);
        setUsersLookup(users);
        await generateReport(cats, emps, users);
      } catch (e) {
        console.error("Failed to load reports initial data", e);
      }
    };
    initData();
  }, [activeReport]);

  const generateReport = async (cats = categories, emps = employees, users = usersLookup) => {
    try {
      const [expenses, payments, ledgerData] = await Promise.all([
        db.getExpenses(),
        db.getPayments(),
        db.getEmployeeLedger()
      ]);

      switch (activeReport) {
        case 'monthly': {
          // Group approved expenses by year-month
          const monthsMap = {};
          expenses.forEach(e => {
            if (e.status !== 'Approved') return;
            const monthStr = e.date.substring(0, 7); // "YYYY-MM"
            if (!monthsMap[monthStr]) {
              monthsMap[monthStr] = { month: monthStr, amount: 0, count: 0 };
            }
            monthsMap[monthStr].amount += e.amount;
            monthsMap[monthStr].count += 1;
          });
          
          const sorted = Object.values(monthsMap).sort((a, b) => b.month.localeCompare(a.month));
          setReportData(sorted);
          break;
        }
        case 'employee': {
          // Summarize statistics per employee
          const empSummary = emps.map(emp => {
            const empExps = expenses.filter(e => e.employeeId === emp.id);
            const totalSpent = empExps.reduce((sum, e) => sum + e.amount, 0);
            
            const approved = empExps.filter(e => e.status === 'Approved').reduce((sum, e) => sum + e.amount, 0);
            const pending = empExps.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.amount, 0);
            const rejected = empExps.filter(e => e.status === 'Rejected').reduce((sum, e) => sum + e.amount, 0);
            
            const paid = payments.filter(p => p.employeeId === emp.id).reduce((sum, p) => sum + p.amount, 0);
            const balance = approved - paid;

            return {
              name: emp.name,
              email: emp.email,
              totalSpent,
              approved,
              pending,
              rejected,
              paid,
              balance
            };
          });
          setReportData(empSummary);
          break;
        }
        case 'category': {
          // Approved sums by category
          const catSummary = cats.map(cat => {
            const catExps = expenses.filter(e => e.categoryId === cat.id && e.status === 'Approved');
            const amount = catExps.reduce((sum, e) => sum + e.amount, 0);
            const count = catExps.length;
            return {
              categoryName: cat.name,
              amount,
              count
            };
          }).sort((a, b) => b.amount - a.amount);
          setReportData(catSummary);
          break;
        }
        case 'payments': {
          // Detail payment list
          const pays = payments.map(p => {
            const emp = users.find(u => u.id === p.employeeId);
            return {
              date: p.date,
              employeeName: emp ? emp.name : 'Unknown',
              amount: p.amount,
              notes: p.notes || '—',
              recordedBy: p.recordedBy
            };
          }).sort((a, b) => new Date(b.date) - new Date(a.date));
          setReportData(pays);
          break;
        }
        case 'outstanding': {
          // Active employees with due balance
          const outstandingLedger = ledgerData.filter(item => item.balanceDue > 0);
          setReportData(outstandingLedger);
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.error("Failed to generate report", err);
    }
  };

  const cleanCSVCell = (cell) => {
    if (cell === null || cell === undefined) return '';
    const cellStr = cell.toString().replace(/"/g, '""');
    return `"${cellStr}"`;
  };

  const handleExportCSV = () => {
    let headers = [];
    let rows = [];
    let filename = `report_${activeReport}_${new Date().toISOString().split('T')[0]}.csv`;

    switch (activeReport) {
      case 'monthly':
        headers = ['Month', 'Total Approved Amount (BDT)', 'Claims Count'];
        rows = reportData.map(r => [r.month, r.amount, r.count]);
        break;
      case 'employee':
        headers = ['Employee Name', 'Email', 'Total Spent', 'Approved', 'Pending', 'Rejected', 'Paid', 'Outstanding Due'];
        rows = reportData.map(r => [r.name, r.email, r.totalSpent, r.approved, r.pending, r.rejected, r.paid, r.balance]);
        break;
      case 'category':
        headers = ['Category Name', 'Total Approved (BDT)', 'Claims Count'];
        rows = reportData.map(r => [r.categoryName, r.amount, r.count]);
        break;
      case 'payments':
        headers = ['Payment Date', 'Employee Name', 'Amount Paid (BDT)', 'Disbursement Notes', 'Recorded By'];
        rows = reportData.map(r => [r.date, r.employeeName, r.amount, r.notes, r.recordedBy]);
        break;
      case 'outstanding':
        headers = ['Employee Name', 'Email', 'Approved Expenses', 'Total Payments', 'Outstanding Due (BDT)'];
        rows = reportData.map(r => [r.employee.name, r.employee.email, r.totalApproved, r.totalPaid, r.balanceDue]);
        break;
      default:
        return;
    }

    const csvRows = [
      headers.map(cleanCSVCell).join(','),
      ...rows.map(row => row.map(cleanCSVCell).join(','))
    ];

    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filename} successfully.`, 'success');
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const formatBDT = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount).replace('BDT', '৳');
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h2>Reports Module</h2>
          <p>Generate summaries, export data to Excel, and print official PDF logs.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleExportCSV} className="btn btn-secondary">
            <FileSpreadsheet size={16} />
            <span>Export to Excel (CSV)</span>
          </button>
          <button onClick={handlePrintPDF} className="btn btn-primary">
            <Printer size={16} />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Reports Navigation Tabs */}
      <div className="tab-container">
        <button
          onClick={() => setActiveReport('monthly')}
          className={`tab-btn ${activeReport === 'monthly' ? 'active' : ''}`}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={16} /> Monthly Expense Report
          </span>
        </button>
        <button
          onClick={() => setActiveReport('employee')}
          className={`tab-btn ${activeReport === 'employee' ? 'active' : ''}`}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Users size={16} /> Employee Report
          </span>
        </button>
        <button
          onClick={() => setActiveReport('category')}
          className={`tab-btn ${activeReport === 'category' ? 'active' : ''}`}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Layers size={16} /> Category Report
          </span>
        </button>
        <button
          onClick={() => setActiveReport('payments')}
          className={`tab-btn ${activeReport === 'payments' ? 'active' : ''}`}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Coins size={16} /> Payment Report
          </span>
        </button>
        <button
          onClick={() => setActiveReport('outstanding')}
          className={`tab-btn ${activeReport === 'outstanding' ? 'active' : ''}`}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={16} /> Outstanding Report
          </span>
        </button>
      </div>

      {/* Info Warning Tip banner */}
      <div style={{
        padding: '0.875rem 1.25rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--primary-light)',
        color: 'var(--text-secondary)',
        fontSize: '0.85rem',
        marginBottom: '1.5rem',
        lineHeight: 1.4
      }}>
        <strong>Tip:</strong> Click "Print / Save as PDF" to load the printer friendly layout. Make sure to toggle on "Background Graphics" in your printer configurations.
      </div>

      {/* Report Tables Container */}
      <div className="glass-card">
        {reportData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <FileText size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p>No transactions registered for this report.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            {activeReport === 'monthly' && (
              <table>
                <thead>
                  <tr>
                    <th>Expense Month</th>
                    <th>Approved Amount</th>
                    <th>Number of Claims</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{row.month}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatBDT(row.amount)}</td>
                      <td>{row.count} items</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeReport === 'employee' && (
              <table>
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Total Spent</th>
                    <th>Approved</th>
                    <th>Pending</th>
                    <th>Rejected</th>
                    <th>Paid</th>
                    <th style={{ color: 'var(--primary)' }}>Outstanding Due</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{row.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.email}</div>
                      </td>
                      <td>{formatBDT(row.totalSpent)}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 500 }}>{formatBDT(row.approved)}</td>
                      <td>{formatBDT(row.pending)}</td>
                      <td style={{ color: 'var(--danger)' }}>{formatBDT(row.rejected)}</td>
                      <td>{formatBDT(row.paid)}</td>
                      <td style={{ fontWeight: 700, color: row.balance > 0 ? 'var(--primary)' : 'var(--text-secondary)' }}>
                        {formatBDT(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeReport === 'category' && (
              <table>
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Approved Amount</th>
                    <th>Claims Count</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{row.categoryName}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatBDT(row.amount)}</td>
                      <td>{row.count} items</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeReport === 'payments' && (
              <table>
                <thead>
                  <tr>
                    <th>Disbursement Date</th>
                    <th>Employee Name</th>
                    <th>Amount Disbursed</th>
                    <th>Payment Notes</th>
                    <th>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.date}</td>
                      <td style={{ fontWeight: 600 }}>{row.employeeName}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatBDT(row.amount)}</td>
                      <td>{row.notes}</td>
                      <td>{row.recordedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeReport === 'outstanding' && (
              <table>
                <thead>
                  <tr>
                    <th>Employee Profile</th>
                    <th>Total Approved</th>
                    <th>Total Paid</th>
                    <th style={{ color: 'var(--primary)' }}>Outstanding Money Owed</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{row.employee.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.employee.email}</div>
                      </td>
                      <td style={{ color: 'var(--success)' }}>{formatBDT(row.totalApproved)}</td>
                      <td>{formatBDT(row.totalPaid)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {formatBDT(row.balanceDue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
