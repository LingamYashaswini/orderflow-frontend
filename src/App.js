import React, { useState, useEffect } from 'react';
import {
  getDistributors, createDistributor, updateDistributor, deleteDistributor,
  getOrdersByDistributor, createOrder, updateOrder, deleteOrder,
  getOrders, getPayments, createPayment, updatePayment, deletePayment
} from './api';
import './App.css';

const PRESET_USER = 'NAGESH';
const PRESET_PASS = 'RUDRA@4473';

function App() {
  const [distributors, setDistributors] = useState([]);
  const [selectedDist, setSelectedDist] = useState(null);
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [view, setView] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [editTarget, setEditTarget] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [search, setSearch] = useState('');
  const [dupWarning, setDupWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);
  const [distOrderSelectedIds, setDistOrderSelectedIds] = useState([]);

  useEffect(() => {
    const ping = setInterval(() => {
      fetch('https://orderflow-backend-5wcq.onrender.com/');
    }, 600000);
    return () => clearInterval(ping);
  }, []);

  useEffect(() => {
    if (selectedDist) fetchOrders(selectedDist._id);
  }, [selectedDist]);

  const fetchInitialData = async () => {
    const startTime = Date.now();
    try {
      setLoading(true);
      const res = await getDistributors();
      setDistributors(res.data);
      const allOrdersRes = await getOrders();
      setAllOrders(allOrdersRes.data);
      const paymentsRes = await getPayments();
      setPayments(paymentsRes.data);
      setDataLoaded(true);
    } catch (err) {
      console.error(err);
    } finally {
      const elapsed = Date.now() - startTime;
      const waitTime = Math.min(Math.max(2000 - elapsed, 0), 3000);
      setTimeout(() => setLoading(false), waitTime);
    }
  };

  const refreshData = async () => {
    try {
      const res = await getDistributors();
      setDistributors(res.data);
      const allOrdersRes = await getOrders();
      setAllOrders(allOrdersRes.data);
      const paymentsRes = await getPayments();
      setPayments(paymentsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async (id) => {
    const res = await getOrdersByDistributor(id);
    const sorted = res.data.sort((a, b) => new Date(a.date) - new Date(b.date));
    setOrders(sorted);
  };

  const handleLogin = () => {
    if (loginForm.username === PRESET_USER && loginForm.password === PRESET_PASS) {
      setLoggedIn(true);
      setLoginError('');
      fetchInitialData();
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleSaveDist = async () => {
    setDupWarning('');
    if (!editTarget) {
      const dup = distributors.find(d => d.name.toLowerCase() === (form.name || '').toLowerCase());
      if (dup) { setDupWarning('A distributor with this name already exists!'); return; }
    }
    if (editTarget) { await updateDistributor(editTarget._id, form); }
    else { await createDistributor(form); }
    setModal(null); setForm({}); setEditTarget(null); setDupWarning('');
    refreshData();
  };

  const handleDeleteDist = async (id) => {
    if (window.confirm('Delete this distributor?')) {
      await deleteDistributor(id);
      setView('dashboard'); setSelectedDist(null);
      refreshData();
    }
  };

  const handleSaveOrder = async () => {
    setDupWarning('');
    if (!editTarget) {
      const dup = orders.find(o => o.invoiceNumber.toLowerCase() === (form.invoiceNumber || '').toLowerCase());
      if (dup) { setDupWarning('An order with this invoice number already exists!'); return; }
    }
    const data = { ...form, distributorId: selectedDist._id, totalAmount: form.amount };
    if (editTarget) { await updateOrder(editTarget._id, data); }
    else { await createOrder(data); }
    setModal(null); setForm({}); setEditTarget(null); setDupWarning('');
    fetchOrders(selectedDist._id);
    const allOrdersRes = await getOrders();
    setAllOrders(allOrdersRes.data);
  };

  const handleDeleteOrder = async (id) => {
    if (window.confirm('Delete this order?')) {
      await deleteOrder(id);
      fetchOrders(selectedDist._id);
      const allOrdersRes = await getOrders();
      setAllOrders(allOrdersRes.data);
    }
  };

  const handleSavePayment = async () => {
    if (!form.date || !form.amount || !form.distributorId) { alert('Please fill all fields'); return; }
    const data = { date: form.date, amount: form.amount, distributorId: form.distributorId };
    if (editTarget) { await updatePayment(editTarget._id, data); }
    else { await createPayment(data); }
    setModal(null); setForm({}); setEditTarget(null);
    const paymentsRes = await getPayments();
    setPayments(paymentsRes.data);
  };

  const handleDeletePayment = async (id) => {
    if (window.confirm('Delete this payment?')) {
      await deletePayment(id);
      const paymentsRes = await getPayments();
      setPayments(paymentsRes.data);
    }
  };

  const openEditPayment = (p) => {
    setEditTarget(p);
    setForm({ date: p.date.slice(0,10), amount: p.amount, distributorId: p.distributorId?._id || '' });
    setModal('payment');
  };

  const openEditDist = (d) => {
    setEditTarget(d);
    setForm({ name: d.name, phone: d.phone, address: d.address });
    setModal('dist');
  };

  const openEditOrder = (o) => {
    setEditTarget(o);
    setForm({ date: o.date.slice(0,10), invoiceNumber: o.invoiceNumber, amount: o.amount });
    setModal('order');
  };

  const totalFor = (id) => allOrders.filter(o => {
    const distId = o.distributorId?._id || o.distributorId;
    return distId === id;
  }).reduce((s,o) => s + o.amount, 0);

  const totalAllPayments = payments.reduce((s,p) => s + Number(p.amount), 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return String(d.getDate()).padStart(2,'0') + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + d.getFullYear();
  };

  const paymentName = (p) => p.distributorId?.name || '-';

  const toggleSelect = (idList, setIdList, id) => {
    setIdList(idList.includes(id) ? idList.filter(x => x !== id) : [...idList, id]);
  };

  const toggleAllOrders = (checked) => {
    setSelectedOrderIds(checked ? allOrders.map(o => o._id) : []);
  };

  const deleteSelectedOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedOrderIds.length} selected order(s)?`)) return;
    for (const id of selectedOrderIds) {
      await deleteOrder(id);
    }
    setSelectedOrderIds([]);
    const allOrdersRes = await getOrders();
    setAllOrders(allOrdersRes.data);
    if (selectedDist) fetchOrders(selectedDist._id);
  };

  const toggleAllPayments = (checked) => {
    setSelectedPaymentIds(checked ? payments.map(p => p._id) : []);
  };

  const deleteSelectedPayments = async () => {
    if (selectedPaymentIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedPaymentIds.length} selected payment(s)?`)) return;
    for (const id of selectedPaymentIds) {
      await deletePayment(id);
    }
    setSelectedPaymentIds([]);
    const paymentsRes = await getPayments();
    setPayments(paymentsRes.data);
  };

  const openPDF = (html) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    win.onload = () => { win.print(); };
  };

  const pdfStyle = '<style>body{font-family:sans-serif;padding:32px;color:#1a1a1a}h1{font-weight:600;font-size:20px}h2{font-weight:500;font-size:16px;color:#333}h3{font-weight:500;font-size:15px;color:#444}table{width:100%;border-collapse:collapse;margin-top:16px}th{padding:10px;text-align:left;font-weight:600}td{padding:8px}.total{text-align:right;margin-top:16px;font-size:16px;font-weight:600}</style>';
  const pdfHeader = '<h1>OrderFlow</h1><h2>SAI KRUPA MEDICAL AND GENERAL STORES</h2>';
  const pdfFooter = (new Date().toLocaleDateString('en-IN'));

  const buildOrdersPDF = (title, list) => {
    const sorted = [...list].sort((a,b) => new Date(a.date) - new Date(b.date));
    const total = list.reduce((s,o) => s + Number(o.amount), 0);
    const rows = sorted.map(o =>
      `<tr><td style="padding:8px;white-space:nowrap">${formatDate(o.date)}</td><td style="padding:8px">${o.distributorId?.name || '-'}</td><td style="padding:8px">${o.invoiceNumber}</td><td style="padding:8px">Rs.${Number(o.amount).toLocaleString('en-IN')}</td></tr>`
    ).join('');
    openPDF(`<html><head><meta charset="UTF-8"><title>${title}</title>${pdfStyle}</head><body>${pdfHeader}<h3>${title}</h3><div class="total">Total: Rs.${total.toLocaleString('en-IN')}</div><table><thead><tr><th>Date</th><th>Distributor</th><th>Invoice No.</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:32px;font-size:12px;color:#999">Generated by L NAGESH - ${pdfFooter}</div></body></html>`);
  };

  const buildPaymentsPDF = (title, list) => {
    const sorted = [...list].sort((a,b) => new Date(a.date) - new Date(b.date));
    const total = list.reduce((s,p) => s + Number(p.amount), 0);
    const rows = sorted.map(p =>
      `<tr><td style="padding:8px;white-space:nowrap">${formatDate(p.date)}</td><td style="padding:8px">${paymentName(p)}</td><td style="padding:8px">Rs.${Number(p.amount).toLocaleString('en-IN')}</td></tr>`
    ).join('');
    openPDF(`<html><head><meta charset="UTF-8"><title>${title}</title>${pdfStyle}</head><body>${pdfHeader}<h3>${title}</h3><div class="total">Total: Rs.${total.toLocaleString('en-IN')}</div><table><thead><tr><th>Date</th><th>Distributor</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:32px;font-size:12px;color:#999">Generated by L NAGESH - ${pdfFooter}</div></body></html>`);
  };

  const generateInvoiceSummaryPDF = () => {
    const sortedDists = [...distributors].sort((a,b) => a.name.localeCompare(b.name));
    let rows = ''; let grandTotal = 0;
    sortedDists.forEach(d => {
      const distOrders = allOrders.filter(o => (o.distributorId?._id || o.distributorId) === d._id).sort((a,b) => new Date(a.date) - new Date(b.date));
      if (!distOrders.length) return;
      const dt = distOrders.reduce((s,o) => s + Number(o.amount), 0); grandTotal += dt;
      rows += `<tr><td colspan="4" style="padding:10px 8px 4px;font-weight:700;color:#3FA0E8">${d.name}</td></tr>`;
      distOrders.forEach(o => {
        rows += `<tr><td style="padding:6px 8px"></td><td style="padding:6px 8px;white-space:nowrap">${formatDate(o.date)}</td><td style="padding:6px 8px">${o.invoiceNumber}</td><td style="padding:6px 8px">Rs.${Number(o.amount).toLocaleString('en-IN')}</td></tr>`;
      });
      rows += `<tr><td></td><td colspan="2" style="padding:6px 8px;font-weight:600">Subtotal</td><td style="padding:6px 8px;font-weight:600">Rs.${dt.toLocaleString('en-IN')}</td></tr>`;
    });
    openPDF(`<html><head><meta charset="UTF-8"><title>Invoice Summary</title>${pdfStyle}</head><body>${pdfHeader}<h3>Distributor Wise Invoice Summary</h3><div class="total">Grand Total: Rs.${grandTotal.toLocaleString('en-IN')}</div><table><thead><tr><th></th><th>Date</th><th>Invoice No.</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:32px;font-size:12px;color:#999">Generated by L NAGESH - ${pdfFooter}</div></body></html>`);
  };

  const generatePaymentSummaryPDF = () => {
    const sortedDists = [...distributors].sort((a,b) => a.name.localeCompare(b.name));
    let rows = ''; let grandTotal = 0;
    sortedDists.forEach(d => {
      const dp = payments.filter(p => (p.distributorId?._id || p.distributorId) === d._id).sort((a,b) => new Date(a.date) - new Date(b.date));
      if (!dp.length) return;
      const dt = dp.reduce((s,p) => s + Number(p.amount), 0); grandTotal += dt;
      rows += `<tr><td colspan="3" style="padding:10px 8px 4px;font-weight:700;color:#3FA0E8">${d.name}</td></tr>`;
      dp.forEach(p => {
        rows += `<tr><td style="padding:6px 8px"></td><td style="padding:6px 8px;white-space:nowrap">${formatDate(p.date)}</td><td style="padding:6px 8px">Rs.${Number(p.amount).toLocaleString('en-IN')}</td></tr>`;
      });
      rows += `<tr><td></td><td style="padding:6px 8px;font-weight:600">Subtotal</td><td style="padding:6px 8px;font-weight:600">Rs.${dt.toLocaleString('en-IN')}</td></tr>`;
    });
    openPDF(`<html><head><meta charset="UTF-8"><title>Payment Summary</title>${pdfStyle}</head><body>${pdfHeader}<h3>Distributor Payment Summary</h3><div class="total">Grand Total: Rs.${grandTotal.toLocaleString('en-IN')}</div><table><thead><tr><th></th><th>Date</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:32px;font-size:12px;color:#999">Generated by L NAGESH - ${pdfFooter}</div></body></html>`);
  };

  const filteredDists = distributors
    .filter(d => d.name.toLowerCase().startsWith(search.toLowerCase()) || search === '')
    .sort((a,b) => a.name.localeCompare(b.name));

  const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"></path>
    </svg>
  );

  const TotalBar = ({ label, amount }) => (
    <div style={{ background: '#f0f8fe', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontWeight: 700, fontSize: 15 }}>
      {label}: <span style={{ color: '#3FA0E8' }}>Rs.{Number(amount).toLocaleString('en-IN')}</span>
    </div>
  );

  const btnPrimary = { padding: '6px 14px', background: '#3FA0E8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 };
  const btnOutline = { padding: '6px 14px', borderRadius: 8, border: '1px solid #3FA0E8', cursor: 'pointer', background: '#fff', color: '#3FA0E8', fontSize: 13 };
  const btnBack = { marginBottom: 16, padding: '6px 14px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', background: '#fff' };

  if (!loggedIn) {
    return (
      <div style={{ minHeight: '100vh', background: '#f7f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 36, width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h2 style={{ color: '#3FA0E8', marginTop: 0, marginBottom: 4 }}>OrderFlow</h2>
          <p style={{ color: '#999', fontSize: 14, marginBottom: 24 }}>Sign in to continue</p>
          {loginError && <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{loginError}</div>}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Username</label>
            <input value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} placeholder="Enter username" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}/>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Password</label>
            <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} placeholder="Enter password" onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}/>
          </div>
          <button onClick={handleLogin} style={{ width: '100%', padding: 10, background: '#3FA0E8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>Sign In</button>
        </div>
      </div>
    );
  }

  if (loading || !dataLoaded) {
    return (
      <div style={{ minHeight: '100vh', background: '#f7f5f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#3FA0E8' }}>OrderFlow</div>
        <div style={{ fontSize: 14, color: '#999' }}>SAI KRUPA MEDICAL AND GENERAL STORES</div>
        <div style={{ marginTop: 12, width: 40, height: 40, border: '4px solid #D6EAF8', borderTop: '4px solid #3FA0E8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
        <div style={{ fontSize: 13, color: '#aaa', marginTop: 8 }}>Loading your data...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{ background: '#3FA0E8', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontSize: 20, fontWeight: 700, cursor: 'pointer', minWidth: 120 }} onClick={() => { setView('dashboard'); setSelectedDist(null); }}>OrderFlow</span>
        <div style={{ flex: 1, textAlign: 'center' }}><span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>SAI KRUPA MEDICAL AND GENERAL STORES</span></div>
        <div style={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => { setLoggedIn(false); setDataLoaded(false); }} style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', padding: '5px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Logout</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 240, minWidth: 240, background: '#D6EAF8', borderRight: '1px solid #AED6F1', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px 16px 8px', flexShrink: 0, background: '#D6EAF8' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', fontWeight: 600 }}>Distributors</div>
              <button onClick={() => { setModal('dist'); setForm({}); setEditTarget(null); setDupWarning(''); }} style={{ background: '#3FA0E8', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search distributors..." style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #AED6F1', fontSize: 13, boxSizing: 'border-box', background: '#fff' }}/>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
            {filteredDists.length === 0 && <div style={{ fontSize: 13, color: '#999', padding: '8px 0' }}>No distributors found</div>}
            {filteredDists.map(d => (
              <div key={d._id} onClick={() => { setSelectedDist(d); setView('distributor'); fetchOrders(d._id); setDistOrderSelectedIds([]); }}
                style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, background: selectedDist?._id === d._id ? '#AED6F1' : 'transparent', borderLeft: selectedDist?._id === d._id ? '3px solid #3FA0E8' : '3px solid transparent' }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: '#555' }}>{d.phone}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 28, background: '#F0F8FE' }}>

          {view === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flexShrink: 0 }}>
                <h2 style={{ margin: '0 0 24px 0', paddingTop: 28 }}>Dashboard</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 24 }}>
                  <div style={{ background: '#f0f0f0', borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 12, color: '#666' }}>Distributors</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{distributors.length}</div>
                  </div>
                  <div onClick={() => setView('allOrders')} style={{ background: '#f0f0f0', borderRadius: 10, padding: 14, cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, color: '#666' }}>All Purchases</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>View</div>
                    <div style={{ fontSize: 11, color: '#3FA0E8', marginTop: 4 }}>Click to view all →</div>
                  </div>
                  <div onClick={() => setView('invoiceSummary')} style={{ background: '#f0f0f0', borderRadius: 10, padding: 14, cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, color: '#666' }}>Dist Wise Invoice Summary</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>View</div>
                    <div style={{ fontSize: 11, color: '#3FA0E8', marginTop: 4 }}>Click to open →</div>
                  </div>
                  <div onClick={() => setView('payments')} style={{ background: '#f0f0f0', borderRadius: 10, padding: 14, cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, color: '#666' }}>Distributor Payment</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>View</div>
                    <div style={{ fontSize: 11, color: '#3FA0E8', marginTop: 4 }}>Click to view all →</div>
                  </div>
                  <div onClick={() => setView('paymentSummary')} style={{ background: '#f0f0f0', borderRadius: 10, padding: 14, cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, color: '#666' }}>Dist Payment Summary</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>View</div>
                    <div style={{ fontSize: 11, color: '#3FA0E8', marginTop: 4 }}>Click to open →</div>
                  </div>
                </div>
                <h3>All Distributors</h3>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {[...distributors].sort((a,b) => a.name.localeCompare(b.name)).map((d, idx) => (
                  <div key={d._id} onClick={() => { setSelectedDist(d); setView('distributor'); fetchOrders(d._id); setDistOrderSelectedIds([]); }}
                    style={{ padding: 14, border: '2px solid #97c1E6', borderRadius: 10, marginBottom: 10, cursor: 'pointer', background: '#fff', display: 'flex', gap: 12 }}>
                    <div style={{ fontWeight: 700, color: '#3FA0E8', minWidth: 24 }}>{idx + 1}.</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{d.name}</div>
                      <div style={{ fontSize: 13, color: '#666' }}>{d.phone} · {d.address}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#3FA0E8', marginTop: 4 }}>Rs.{totalFor(d._id).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== ALL PURCHASES (COMPACT) ===== */}
          {view === 'allOrders' && (
            <div>
              <button onClick={() => setView('dashboard')} style={btnBack}>← Back</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0 }}>All Purchases</h2>
                <button onClick={() => buildOrdersPDF('All Purchases', allOrders)} style={btnPrimary}>📄 Download All</button>
                {selectedOrderIds.length > 0 && (
                  <>
                    <button onClick={() => { const list = allOrders.filter(o => selectedOrderIds.includes(o._id)); if (!list.length) return; buildOrdersPDF('Selected Purchases', list); }} style={btnOutline}>📄 Download Selected ({selectedOrderIds.length})</button>
                    <button onClick={deleteSelectedOrders} style={{ ...btnOutline, color: 'red', borderColor: 'red' }}>🗑 Delete Selected ({selectedOrderIds.length})</button>
                  </>
                )}
              </div>
              <TotalBar label="Total" amount={allOrders.reduce((s,o) => s + Number(o.amount), 0)} />
              <table style={{ borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                    <th style={{ padding: '2px 4px', color: '#999' }}>
                      <input type="checkbox" checked={selectedOrderIds.length === allOrders.length && allOrders.length > 0} onChange={(e) => toggleAllOrders(e.target.checked)} style={{ cursor: 'pointer' }}/>
                    </th>
                    <th style={{ padding: '2px 4px', color: '#999' }}>Date</th>
                    <th style={{ padding: '2px 4px', color: '#999' }}>Distributor</th>
                    <th style={{ padding: '2px 4px', color: '#999' }}>Invoice No.</th>
                    <th style={{ padding: '2px 4px', color: '#999' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[...allOrders].sort((a,b) => new Date(a.date) - new Date(b.date)).map(o => (
                    <tr key={o._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '2px 4px' }}><input type="checkbox" checked={selectedOrderIds.includes(o._id)} onChange={() => toggleSelect(selectedOrderIds, setSelectedOrderIds, o._id)} style={{ cursor: 'pointer' }}/></td>
                      <td style={{ padding: '2px 4px' }}>{formatDate(o.date)}</td>
                      <td style={{ padding: '2px 4px' }}>{o.distributorId?.name || '-'}</td>
                      <td style={{ padding: '2px 4px' }}>{o.invoiceNumber}</td>
                      <td style={{ padding: '2px 4px', fontWeight: 600 }}>Rs.{Number(o.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== INVOICE SUMMARY (COMPACT) ===== */}
          {view === 'invoiceSummary' && (
            <div>
              <button onClick={() => setView('dashboard')} style={btnBack}>← Back</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Distributor Wise Invoice Summary</h2>
                <button onClick={generateInvoiceSummaryPDF} style={btnPrimary}>📄 Download PDF</button>
              </div>
              <TotalBar label="Grand Total" amount={allOrders.reduce((s,o) => s + Number(o.amount), 0)} />
              <table style={{ borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                    <th style={{ padding: '2px 4px', fontSize: 12, color: '#999' }}>Date</th>
                    <th style={{ padding: '2px 4px', fontSize: 12, color: '#999' }}>Invoice No.</th>
                    <th style={{ padding: '2px 4px', fontSize: 12, color: '#999' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sortedDists = [...distributors].sort((a,b) => a.name.localeCompare(b.name));
                    const blocks = [];
                    sortedDists.forEach(d => {
                      const distOrders = allOrders.filter(o => (o.distributorId?._id || o.distributorId) === d._id).sort((a,b) => new Date(a.date) - new Date(b.date));
                      if (!distOrders.length) return;
                      const distTotal = distOrders.reduce((s,o) => s + Number(o.amount), 0);
                      blocks.push(<tr key={`h-${d._id}`}><td colSpan={3} style={{ padding: '6px 4px 2px', fontWeight: 700, fontSize: 14, color: '#3FA0E8' }}>{d.name}</td></tr>);
                      distOrders.forEach(o => blocks.push(<tr key={o._id} style={{ borderBottom: '1px solid #f5f5f5' }}><td style={{ padding: '2px 4px' }}>{formatDate(o.date)}</td><td style={{ padding: '2px 4px' }}>{o.invoiceNumber}</td><td style={{ padding: '2px 4px' }}>Rs.{Number(o.amount).toLocaleString('en-IN')}</td></tr>));
                      blocks.push(<tr key={`sub-${d._id}`} style={{ borderBottom: '2px solid #eee' }}><td></td><td style={{ padding: '2px 4px', fontWeight: 600 }}>Subtotal</td><td style={{ padding: '2px 4px', fontWeight: 600 }}>Rs.{distTotal.toLocaleString('en-IN')}</td></tr>);
                    });
                    return blocks;
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== DISTRIBUTOR PAYMENTS (COMPACT) ===== */}
          {view === 'payments' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flexShrink: 0 }}>
                <button onClick={() => setView('dashboard')} style={btnBack}>← Back</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0 }}>Distributor Payments</h2>
                  <button onClick={() => { setModal('payment'); setForm({}); setEditTarget(null); }} style={btnPrimary}>+ Add Payment</button>
                  <button onClick={() => buildPaymentsPDF('Distributor Payments', payments)} style={btnPrimary}>📄 Download All</button>
                  {selectedPaymentIds.length > 0 && (
                    <>
                      <button onClick={() => { const list = payments.filter(p => selectedPaymentIds.includes(p._id)); if (!list.length) return; buildPaymentsPDF('Selected Payments', list); }} style={btnOutline}>📄 Download Selected ({selectedPaymentIds.length})</button>
                      <button onClick={deleteSelectedPayments} style={{ ...btnOutline, color: 'red', borderColor: 'red' }}>🗑 Delete Selected ({selectedPaymentIds.length})</button>
                    </>
                  )}
                </div>
                <TotalBar label="Total" amount={totalAllPayments} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#F0F8FE', zIndex: 1 }}>
                    <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                      <th style={{ padding: '2px 4px', color: '#999' }}>
                        <input type="checkbox" checked={selectedPaymentIds.length === payments.length && payments.length > 0} onChange={(e) => toggleAllPayments(e.target.checked)} style={{ cursor: 'pointer' }}/>
                      </th>
                      <th style={{ padding: '2px 4px', color: '#999' }}>Date</th>
                      <th style={{ padding: '2px 4px', color: '#999' }}>Distributor</th>
                      <th style={{ padding: '2px 4px', color: '#999' }}>Amount</th>
                      <th style={{ padding: '2px 4px', color: '#999' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...payments].sort((a,b) => new Date(a.date) - new Date(b.date)).map(p => (
                      <tr key={p._id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '2px 4px' }}><input type="checkbox" checked={selectedPaymentIds.includes(p._id)} onChange={() => toggleSelect(selectedPaymentIds, setSelectedPaymentIds, p._id)} style={{ cursor: 'pointer' }}/></td>
                        <td style={{ padding: '2px 4px' }}>{formatDate(p.date)}</td>
                        <td style={{ padding: '2px 4px' }}>{paymentName(p)}</td>
                        <td style={{ padding: '2px 4px', fontWeight: 600 }}>Rs.{Number(p.amount).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '2px 4px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => openEditPayment(p)} style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', fontSize: 12 }}>Edit</button>
                            <button onClick={() => handleDeletePayment(p._id)} style={{ padding: '2px 4px', borderRadius: 4, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', color: 'red', display: 'flex', alignItems: 'center' }}><TrashIcon/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== PAYMENT SUMMARY (COMPACT) ===== */}
          {view === 'paymentSummary' && (
            <div>
              <button onClick={() => setView('dashboard')} style={btnBack}>← Back</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Distributor Payment Summary</h2>
                <button onClick={generatePaymentSummaryPDF} style={btnPrimary}>📄 Download PDF</button>
              </div>
              <TotalBar label="Grand Total" amount={totalAllPayments} />
              <table style={{ borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                    <th style={{ padding: '2px 4px', fontSize: 12, color: '#999' }}>Date</th>
                    <th style={{ padding: '2px 4px', fontSize: 12, color: '#999' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sortedDists = [...distributors].sort((a,b) => a.name.localeCompare(b.name));
                    const blocks = [];
                    sortedDists.forEach(d => {
                      const dp = payments.filter(p => (p.distributorId?._id || p.distributorId) === d._id).sort((a,b) => new Date(a.date) - new Date(b.date));
                      if (!dp.length) return;
                      const dt = dp.reduce((s,p) => s + Number(p.amount), 0);
                      blocks.push(<tr key={`h-${d._id}`}><td colSpan={2} style={{ padding: '6px 4px 2px', fontWeight: 700, fontSize: 14, color: '#3FA0E8' }}>{d.name}</td></tr>);
                      dp.forEach(p => blocks.push(<tr key={p._id} style={{ borderBottom: '1px solid #f5f5f5' }}><td style={{ padding: '2px 4px' }}>{formatDate(p.date)}</td><td style={{ padding: '2px 4px' }}>Rs.{Number(p.amount).toLocaleString('en-IN')}</td></tr>));
                      blocks.push(<tr key={`sub-${d._id}`} style={{ borderBottom: '2px solid #eee' }}><td style={{ padding: '2px 4px', fontWeight: 600 }}>Subtotal</td><td style={{ padding: '2px 4px', fontWeight: 600 }}>Rs.{dt.toLocaleString('en-IN')}</td></tr>);
                    });
                    return blocks;
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {view === 'distributor' && selectedDist && (
            <div>
              <button onClick={() => { setView('dashboard'); setSelectedDist(null); }} style={btnBack}>← Back</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{selectedDist.name}</h2>
                  <div style={{ color: '#666', fontSize: 14 }}>{selectedDist.phone} · {selectedDist.address}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button onClick={() => openEditDist(selectedDist)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}>Edit</button>
                  <button onClick={() => handleDeleteDist(selectedDist._id)} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', color: 'red', display: 'flex', alignItems: 'center' }}><TrashIcon/></button>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0 }}>Orders</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => { setModal('order'); setForm({}); setEditTarget(null); setDupWarning(''); }} style={btnPrimary}>+ Add Order</button>
                  <button onClick={() => buildOrdersPDF(selectedDist.name, orders.map(o => ({ ...o, distributorId: selectedDist })))} style={btnPrimary}>📄 Download All</button>
                  {distOrderSelectedIds.length > 0 && <button onClick={() => { const list = orders.filter(o => distOrderSelectedIds.includes(o._id)).map(o => ({ ...o, distributorId: selectedDist })); if (!list.length) return; buildOrdersPDF('Selected - ' + selectedDist.name, list); }} style={btnOutline}>📄 Download Selected ({distOrderSelectedIds.length})</button>}
                </div>
              </div>
              <table style={{ borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                    <th style={{ padding: '2px 4px', color: '#999' }}></th>
                    <th style={{ padding: '2px 4px', color: '#999' }}>Date</th>
                    <th style={{ padding: '2px 4px', color: '#999' }}>Invoice No.</th>
                    <th style={{ padding: '2px 4px', color: '#999' }}>Amount</th>
                    <th style={{ padding: '2px 4px', color: '#999' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '2px 4px' }}><input type="checkbox" checked={distOrderSelectedIds.includes(o._id)} onChange={() => toggleSelect(distOrderSelectedIds, setDistOrderSelectedIds, o._id)} style={{ cursor: 'pointer' }}/></td>
                      <td style={{ padding: '2px 4px' }}>{formatDate(o.date)}</td>
                      <td style={{ padding: '2px 4px' }}>{o.invoiceNumber}</td>
                      <td style={{ padding: '2px 4px', fontWeight: 600 }}>Rs.{Number(o.amount).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '2px 4px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openEditOrder(o)} style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', fontSize: 12 }}>Edit</button>
                          <button onClick={() => buildOrdersPDF(selectedDist.name, [{ ...o, distributorId: selectedDist }])} style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #3FA0E8', cursor: 'pointer', background: '#3FA0E8', color: '#fff', fontSize: 12 }}>PDF</button>
                          <button onClick={() => handleDeleteOrder(o._id)} style={{ padding: '2px 4px', borderRadius: 4, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', color: 'red', display: 'flex', alignItems: 'center' }}><TrashIcon/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #eee', background: '#f9f9f9' }}>
                    <td></td>
                    <td colSpan={2} style={{ padding: '6px 8px', fontWeight: 700, fontSize: 15 }}>Total</td>
                    <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: 15, color: '#3FA0E8' }}>Rs.{orders.reduce((s,o) => s + Number(o.amount), 0).toLocaleString('en-IN')}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380 }}>
            <h3 style={{ marginTop: 0 }}>{modal === 'dist' ? (editTarget ? 'Edit Distributor' : 'Add Distributor') : modal === 'order' ? (editTarget ? 'Edit Order' : 'Add Order') : (editTarget ? 'Edit Payment' : 'Add Distributor Payment')}</h3>
            {dupWarning && <div style={{ background: '#FAEEDA', color: '#BA7517', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 14 }}>⚠️ {dupWarning}</div>}
            {modal === 'dist' && ['name','phone','address'].map(f => (
              <div key={f} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>{f.charAt(0).toUpperCase()+f.slice(1)}</label>
                <input value={form[f]||''} onChange={e => setForm({...form,[f]:e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}/>
              </div>
            ))}
            {modal === 'order' && [{f:'date',t:'date'},{f:'invoiceNumber',t:'text'},{f:'amount',t:'number'}].map(({f,t}) => (
              <div key={f} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>{f.charAt(0).toUpperCase()+f.slice(1)}</label>
                <input type={t} value={form[f]||''} onChange={e => setForm({...form,[f]:e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}/>
              </div>
            ))}
            {modal === 'payment' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Date</label>
                  <input type="date" value={form.date||''} onChange={e => setForm({...form, date: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}/>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Distributor</label>
                  <select value={form.distributorId||''} onChange={e => setForm({...form, distributorId: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}>
                    <option value="">Select distributor</option>
                    {[...distributors].sort((a,b) => a.name.localeCompare(b.name)).map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Payment Amount (Rs.)</label>
                  <input type="number" value={form.amount||''} onChange={e => setForm({...form, amount: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}/>
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => { setModal(null); setForm({}); setEditTarget(null); setDupWarning(''); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}>Cancel</button>
              <button onClick={modal === 'dist' ? handleSaveDist : modal === 'order' ? handleSaveOrder : handleSavePayment} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3FA0E8', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;