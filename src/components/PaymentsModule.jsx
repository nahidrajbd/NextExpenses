import React, { useState, useEffect, useContext } from 'react';
import { db } from '../db';
import { AuthContext, ToastContext } from '../App';
import { Coins, Plus, Calendar, User, FileText, ArrowRight } from 'lucide-react';

export default function PaymentsModule() {
  const { currentUser } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  
  // Ledger/Balance State
  const [totals, setTotals] = useState({
    totalApproved: 0,
    totalPaid: 0,
    currentDue: 0
  });

  // Form State
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Payment History
  const [paymentsHistory, setPaymentsHistory] = useState([]);

  useEffect(() => {
    loadEmployees();
    
    // Check if redirecting from ledger link
    const targetEmpId = localStorage.getItem('ne_pay_target_employee');
    if (targetEmpId) {
      setSelectedEmpId(targetEmpId);
      localStorage.removeItem('ne_pay_target_employee');
    }
  }, []);

  useEffect(() => {
    if (selectedEmpId) {
      calculateBalances(selectedEmpId);
    } else {
      setTotals({ totalApproved: 0, totalPaid: 0, currentDue: 0 });
    }
    loadPaymentsHistory();
  }, [selectedEmpId]);

  const loadEmployees = async () => {
    try {
      const list = await db.getEmployees();
      setEmployees(list);
      if (list.length > 0 && !selectedEmpId) {
        setSelectedEmpId(list[0].id);
      }
    } catch (e) {
      console.error("Failed to load employees list", e);
    }
  };

  const calculateBalances = async (empId) => {
    try {
      const summary = await db.getSingleEmployeeSummary(empId);
      setTotals({
        totalApproved: summary.totalApproved,
        totalPaid: summary.totalPaid,
        currentDue: summary.balanceDue
      });
    } catch (e) {
      console.error("Failed to calculate balances", e);
    }
  };

  const loadPaymentsHistory = async () => {
    try {
      let history = await db.getPayments();
      if (selectedEmpId && selectedEmpId !== 'All') {
        history = history.filter(p => p.employeeId === selectedEmpId);
      }
      setPaymentsHistory(history.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (e) {
      console.error("Failed to load payments history", e);
    }
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedEmpId || !amount || !date) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    const payAmount = parseFloat(amount);
    if (payAmount <= 0) {
      showToast('Payment amount must be greater than zero.', 'error');
      return;
    }

    if (payAmount > totals.currentDue && totals.currentDue > 0) {
      if (!confirm(`Warning: Payment amount (${formatBDT(payAmount)}) exceeds the current outstanding balance of ${formatBDT(totals.currentDue)}. Do you want to proceed anyway?`)) {
        return;
      }
    }

    const emp = employees.find(u => u.id === selectedEmpId);
    const empName = emp ? emp.name : 'Employee';

    try {
      // Record Payment
      await db.addPayment({
        employeeId: selectedEmpId,
        amount: payAmount,
        date,
        notes
      }, currentUser.name);

      // Audit Log
      await db.addLog(
        currentUser.id,
        'Record Payment',
        `Recorded payment of ${payAmount} BDT to ${empName} (Notes: ${notes || 'None'})`
      );

      // Notification to Employee
      await db.addNotification(
        selectedEmpId,
        'Payment Recorded',
        `A payment of ${formatBDT(payAmount)} has been recorded for you on ${date} by Admin.`
      );

      showToast(`Payment of ${formatBDT(payAmount)} registered successfully.`, 'success');
      
      // Reset Form
      setAmount('');
      setNotes('');
      // Reload state
      await calculateBalances(selectedEmpId);
      await loadPaymentsHistory();
    } catch (err) {
      showToast('Failed to record payment.', 'error');
    }
  };

  const getEmployeeName = (id) => {
    const emp = db.getUsers().find(u => u.id === id);
    return emp ? emp.name : 'Unknown';
  };

  const formatBDT = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount).replace('BDT', '৳');
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h2>Payment Module</h2>
          <p>Disburse payments to employees and clear outstanding balances.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Step 1: Select Employee & Outstanding view */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} color="var(--primary)" />
              <span>Select Employee Account</span>
            </h3>

            <div className="form-group">
              <label className="form-label">Employee Profile</label>
              <select
                className="form-control"
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                ))}
              </select>
            </div>

            {/* Calculations displays */}
            {selectedEmpId && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Approved Expenses:</span>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>{formatBDT(totals.totalApproved)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Already Disbursed Paid:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatBDT(totals.totalPaid)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderTop: '1px dashed var(--border-color)',
                  paddingTop: '0.85rem',
                  marginTop: '0.25rem'
                }}>
                  <span style={{ color: 'var(--primary)' }}>Remaining Balance Due:</span>
                  <span style={{ color: 'var(--primary)' }}>{formatBDT(totals.currentDue)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Form to disburse payments */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Coins size={20} color="var(--primary)" />
            <span>Disburse Payment Details</span>
          </h3>

          <form onSubmit={handleSubmitPayment}>
            <div className="form-group">
              <label className="form-label">Payment Amount (BDT) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 5000"
                className="form-control"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Date *</label>
              <input
                type="date"
                required
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Disbursement Note (Optional)</label>
              <input
                type="text"
                placeholder="Reference checks, bank transactions, etc..."
                className="form-control"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              <Plus size={16} />
              <span>Record Disbursed Payment</span>
            </button>
          </form>
        </div>
      </div>

      {/* Payment History List */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} color="var(--primary)" />
          <span>Payment History Log</span>
        </h3>

        {paymentsHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <Coins size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p>No payments recorded for this account.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Payment Date</th>
                  <th>Employee Profile</th>
                  <th>Amount Disbursed</th>
                  <th>Notes Reference</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {paymentsHistory.map(pay => (
                  <tr key={pay.id}>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={14} className="text-muted" />
                        {pay.date}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{getEmployeeName(pay.employeeId)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatBDT(pay.amount)}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {pay.notes || '—'}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{pay.recordedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
