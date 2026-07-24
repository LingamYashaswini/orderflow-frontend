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
  const [invoiceSelectedIds, setInvoiceSelectedIds] = useState([]);
  const [paymentSummarySelectedIds, setPaymentSummarySelectedIds] = useState([]);
  const [invoiceFilterDist, setInvoiceFilterDist] = useState('all');
  const [paymentFilterDist, setPaymentFilterDist] = useState('all');

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

  // NEW: Toggle all items for a specific distributor
  const toggleDistributorOrders = (distributorId, checked) => {
    const ordersForDist = getFilteredInvoiceOrders().filter(o => {
      const distId = o.distributorId?._id || o.distributorId;
      return distId === distributorId;
    });
    const orderIds = ordersForDist.map(o => o._id);
    if (checked) {
      setInvoiceSelectedIds(prev => [...new Set([...prev, ...orderIds])]);
    } else {
      setInvoiceSelectedIds(prev => prev.filter(id => !orderIds.includes(id)));
    }
  };

  const toggleDistributorPayments = (distributorId, checked) => {
    const paymentsForDist = getFilteredPayments().filter(p => {
      const distId = p.distributorId?._id || p.distributorId;
      return distId === distributorId;
    });
    const paymentIds = paymentsForDist.map(p => p._id);
    if (checked) {
      setPaymentSummarySelectedIds(prev => [...new Set([...prev, ...paymentIds])]);
    } else {
      setPaymentSummarySelectedIds(prev => prev.filter(id => !paymentIds.includes(id)));
    }
  };

  // Check if all orders for a distributor are selected
  const areAllDistributorOrdersSelected = (distributorId) => {
    const ordersForDist = getFilteredInvoiceOrders().filter(o => {
      const distId = o.distributorId?._id || o.distributorId;
      return distId === distributorId;
    });
    if (ordersForDist.length === 0) return false;
    return ordersForDist.every(o => invoiceSelectedIds.includes(o._id));
  };

  const areAllDistributorPaymentsSelected = (distributorId) => {
    const paymentsForDist = getFilteredPayments().filter(p => {
      const distId = p.distributorId?._id || p.distributorId;
      return distId === distributorId;
    });
    if (paymentsForDist.length === 0) return false;
    return paymentsForDist.every(p => paymentSummarySelectedIds.includes(p._id));
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

  const toggleAllInvoice = (checked) => {
    const filteredOrders = getFilteredInvoiceOrders();
    setInvoiceSelectedIds(checked ? filteredOrders.map(o => o._id) : []);
  };

  const downloadSelectedInvoice = () => {
    const selected = allOrders.filter(o => invoiceSelectedIds.includes(o._id));
    if (selected.length === 0) return;
    buildOrdersPDF('Selected Invoice Summary', selected);
  };

  const deleteSelectedInvoiceOrders = async () => {
    if (invoiceSelectedIds.length === 0) return;
    if (!window.confirm(`Delete ${invoiceSelectedIds.length} selected order(s) from invoice summary?`)) return;
    for (const id of invoiceSelectedIds) {
      await deleteOrder(id);
    }
    setInvoiceSelectedIds([]);
    const allOrdersRes = await getOrders();
    setAllOrders(allOrdersRes.data);
    if (selectedDist) fetchOrders(selectedDist._id);
  };

  const toggleAllPaymentSummary = (checked) => {
    const filteredPayments = getFilteredPayments();
    setPaymentSummarySelectedIds(checked ? filteredPayments.map(p => p._id) : []);
  };

  const downloadSelectedPaymentSummary = () => {
    const selected = payments.filter(p => paymentSummarySelectedIds.includes(p._id));
    if (selected.length === 0) return;
    buildPaymentsPDF('Selected Payment Summary', selected);
  };

  const deleteSelectedPaymentSummary = async () => {
    if (paymentSummarySelectedIds.length === 0) return;
    if (!window.confirm(`Delete ${paymentSummarySelectedIds.length} selected payment(s) from payment summary?`)) return;
    for (const id of paymentSummarySelectedIds) {
      await deletePayment(id);
    }
    setPaymentSummarySelectedIds([]);
    const paymentsRes = await getPayments();
    setPayments(paymentsRes.data);
  };

  const getFilteredInvoiceOrders = () => {
    if (invoiceFilterDist === 'all') return allOrders;
    return allOrders.filter(o => {
      const distId = o.distributorId?._id || o.distributorId;
      return distId === invoiceFilterDist;
    });
  };

  const getFilteredPayments = () => {
    if (paymentFilterDist === 'all') return payments;
    return payments.filter(p => {
      const distId = p.distributorId?._id || p.distributorId;
      return distId === paymentFilterDist;
    });
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
    const filteredOrders = getFilteredInvoiceOrders();
    const sortedDists = [...distributors].sort((a,b) => a.name.localeCompare(b.name));
    let rows = ''; let grandTotal = 0;
    
    const distsToShow = invoiceFilterDist === 'all' 
      ? sortedDists 
      : sortedDists.filter(d => d._id === invoiceFilterDist);
    
    distsToShow.forEach(d => {
      const distOrders = filteredOrders.filter(o => (o.distributorId?._id || o.distributorId) === d._id).sort((a,b) => new Date(a.date) - new Date(b.date));
      if (!distOrders.length) return;
      const dt = distOrders.reduce((s,o) => s + Number(o.amount), 0); grandTotal += dt;
      rows += `<tr><td colspan="4" style="padding:10px 8px 4px;font-weight:700;color:#3FA0E8">${d.name}</td></tr>`;
      distOrders.forEach(o => {
        rows += `<tr><td style="padding:6px 8px"></td><td style="padding:6px 8px;white-space:nowrap">${formatDate(o.date)}</td><td style="padding:6px 8px">${o.invoiceNumber}</td><td style="padding:6px 8px">Rs.${Number(o.amount).toLocaleString('en-IN')}</td></tr>`;
      });
      rows += `<tr><td></td><td colspan="2" style="padding:6px 8px;font-weight:600">Subtotal</td><td style="padding:6px 8px;font-weight:600">Rs.${dt.toLocaleString('en-IN')}</td></tr>`;
    });
    openPDF(`<html><head><meta charset="UTF-8"><title>Distributor Wise Invoice Summary</title>${pdfStyle}</head><body>${pdfHeader}<h3>Distributor Wise Invoice Summary</h3><div class="total">Grand Total: Rs.${grandTotal.toLocaleString('en-IN')}</div><table><thead><tr><th></th><th>Date</th><th>Invoice No.</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:32px;font-size:12px;color:#999">Generated by L NAGESH - ${pdfFooter}</div></body></html>`);
  };

  const generatePaymentSummaryPDF = () => {
    const filteredPayments = getFilteredPayments();
    const sortedDists = [...distributors].sort((a,b) => a.name.localeCompare(b.name));
    let rows = ''; let grandTotal = 0;
    
    const distsToShow = paymentFilterDist === 'all' 
      ? sortedDists 
      : sortedDists.filter(d => d._id === paymentFilterDist);
    
    distsToShow.forEach(d => {
      const dp = filteredPayments.filter(p => (p.distributorId?._id || p.distributorId) === d._id).sort((a,b) => new Date(a.date) - new Date(b.date));
      if (!dp.length) return;
      const dt = dp.reduce((s,p) => s + Number(p.amount), 0); grandTotal += dt;
      rows += `<tr><td colspan="3" style="padding:10px 8px 4px;font-weight:700;color:#3FA0E8">${d.name}</td></tr>`;
      dp.forEach(p => {
        rows += `<tr><td style="padding:6px 8px"></td><td style="padding:6px 8px;white-space:nowrap">${formatDate(p.date)}</td><td style="padding:6px 8px">Rs.${Number(p.amount).toLocaleString('en-IN')}</td></tr>`;
      });
      rows += `<tr><td></td><td style="padding:6px 8px;font-weight:600">Subtotal</td><td style="padding:6px 8px;font-weight:600">Rs.${dt.toLocaleString('en-IN')}</td></tr>`;
    });
    openPDF(`<html><head><meta charset="UTF-8"><title>Distributor Payment Summary</title>${pdfStyle}</head><body>${pdfHeader}<h3>Distributor Payment Summary</h3><div class="total">Grand Total: Rs.${grandTotal.toLocaleString('en-IN')}</div><table><thead><tr><th></th><th>Date</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:32px;font-size:12px;color:#999">Generated by L NAGESH - ${pdfFooter}</div></body></html>`);
  };

  const filteredDists = distributors
    .filter(d => d.name.toLowerCase().startsWith(search.toLowerCase()) || search === '')
    .sort((a,b) => a.name.localeCompare(b.name));

  const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"></path>
    </svg>
  );

  const TotalBar = ({ label, amount }) => (
    <div style={{ background: '#f0f8fe', padding: '14px 18px', borderRadius: 8, marginBottom: 16, fontWeight: 700, fontSize: 17 }}>
      {label}: <span style={{ color: '#3FA0E8' }}>Rs.{Number(amount).toLocaleString('en-IN')}</span>
    </div>
  );

  const FilterDropdown = ({ value, onChange, distributors, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{ fontSize: 14, color: '#666', fontWeight: 500 }}>{label}:</label>
      <select 
        value={value} 
        onChange={onChange}
        style={{ 
          padding: '6px 12px', 
          borderRadius: 8, 
          border: '1px solid #ddd', 
          fontSize: 14,
          background: '#fff',
          cursor: 'pointer',
          minWidth: 180
        }}
      >
        <option value="all">All Distributors</option>
        {[...distributors].sort((a,b) => a.name.localeCompare(b.name)).map(d => (
          <option key={d._id} value={d._id}>{d.name}</option>
        ))}
      </select>
    </div>
  );

  const btnPrimary = { padding: '8px 18px', background: '#3FA0E8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15 };
  const btnOutline = { padding: '8px 18px', borderRadius: 8, border: '1px solid #3FA0E8', cursor: 'pointer', background: '#fff', color: '#3FA0E8', fontSize: 15 };
  const btnDanger = { padding: '8px 18px', borderRadius: 8, border: '1px solid #ff4444', cursor: 'pointer', background: '#fff', color: '#ff4444', fontSize: 15 };
  const btnBack = { marginBottom: 16, padding: '8px 18px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', fontSize: 15 };

  if (!loggedIn) {
    return (
      <div style={{ minHeight: '100vh', background: '#f7f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h2 style={{ color: '#3FA0E8', marginTop: 0, marginBottom: 4, fontSize: 28 }}>OrderFlow</h2>
          <p style={{ color: '#999', fontSize: 16, marginBottom: 24 }}>Sign in to continue</p>
          {loginError && <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{loginError}</div>}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 14, color: '#666', display: 'block', marginBottom: 4 }}>Username</label>
            <input value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} placeholder="Enter username" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15, boxSizing: 'border-box' }}/>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 14, color: '#666', display: 'block', marginBottom: 4 }}>Password</label>
            <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} placeholder="Enter password" onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15, boxSizing: 'border-box' }}/>
          </div>
          <button onClick={handleLogin} style={{ width: '100%', padding: 12, background: '#3FA0E8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 17, cursor: 'pointer', fontWeight: 600 }}>Sign In</button>
        </div>
      </div>
    );
  }

  if (loading || !dataLoaded) {
    return (
      <div style={{ minHeight: '100vh', background: '#f7f5f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#3FA0E8' }}>OrderFlow</div>
        <div style={{ fontSize: 16, color: '#999' }}>SAI KRUPA MEDICAL AND GENERAL STORES</div>
        <div style={{ marginTop: 12, width: 40, height: 40, border: '4px solid #D6EAF8', borderTop: '4px solid #3FA0E8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
        <div style={{ fontSize: 14, color: '#aaa', marginTop: 8 }}>Loading your data...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{ background: '#3FA0E8', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontSize: 24, fontWeight: 700, cursor: 'pointer', minWidth: 120 }} onClick={() => { setView('dashboard'); setSelectedDist(null); }}>OrderFlow</span>
        <div style={{ flex: 1, textAlign: 'center' }}><span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>SAI KRUPA MEDICAL AND GENERAL STORES</span></div>
        <div style={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => { setLoggedIn(false); setDataLoaded(false); }} style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Logout</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 260, minWidth: 260, background: '#D6EAF8', borderRight: '1px solid #AED6F1', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px 16px 8px', flexShrink: 0, background: '#D6EAF8' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: '#555', textTransform: 'uppercase', fontWeight: 600 }}>Distributors</div>
              <button onClick={() => { setModal('dist'); setForm({}); setEditTarget(null); setDupWarning(''); }} style={{ background: '#3FA0E8', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search distributors..." style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #AED6F1', fontSize: 14, boxSizing: 'border-box', background: '#fff' }}/>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
            {filteredDists.length === 0 && <div style={{ fontSize: 14, color: '#999', padding: '8px 0' }}>No distributors found</div>}
            {filteredDists.map(d => (
              <div key={d._id} onClick={() => { setSelectedDist(d); setView('distributor'); fetchOrders(d._id); setDistOrderSelectedIds([]); }}
                style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, background: selectedDist?._id === d._id ? '#AED6F1' : 'transparent', borderLeft: selectedDist?._id === d._id ? '3px solid #3FA0E8' : '3px solid transparent' }}>
                <div style={{ fontWeight: 500, fontSize: 15 }}>{d.name}</div>
                <div style={{ fontSize: 14, color: '#555' }}>{d.phone}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 28, background: '#F0F8FE' }}>

          {view === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flexShrink: 0 }}>
                <h2 style={{ margin: '0 0 24px 0', paddingTop: 28, fontSize: 26 }}>Dashboard</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 24 }}>
                  <div style={{ background: '#f0f0f0', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 14, color: '#666' }}>Distributors</div>
                    <div style={{ fontSize: 26, fontWeight: 700 }}>{distributors.length}</div>
                  </div>
                  <div onClick={() => setView('allOrders')} style={{ background: '#f0f0f0', borderRadius: 10, padding: 16, cursor: 'pointer' }}>
                    <div style={{ fontSize: 14, color: '#666' }}>All Purchases</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>View</div>
                    <div style={{ fontSize: 13, color: '#3FA0E8', marginTop: 4 }}>Click to view all →</div>
                  </div>
                  <div onClick={() => setView('invoiceSummary')} style={{ background: '#f0f0f0', borderRadius: 10, padding: 16, cursor: 'pointer' }}>
                    <div style={{ fontSize: 14, color: '#666' }}>Dist Wise Invoice Summary</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>View</div>
                    <div style={{ fontSize: 13, color: '#3FA0E8', marginTop: 4 }}>Click to open →</div>
                  </div>
                  <div onClick={() => setView('payments')} style={{ background: '#f0f0f0', borderRadius: 10, padding: 16, cursor: 'pointer' }}>
                    <div style={{ fontSize: 14, color: '#666' }}>Distributor Payment</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>View</div>
                    <div style={{ fontSize: 13, color: '#3FA0E8', marginTop: 4 }}>Click to view all →</div>
                  </div>
                  <div onClick={() => setView('paymentSummary')} style={{ background: '#f0f0f0', borderRadius: 10, padding: 16, cursor: 'pointer' }}>
                    <div style={{ fontSize: 14, color: '#666' }}>Dist Payment Summary</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>View</div>
                    <div style={{ fontSize: 13, color: '#3FA0E8', marginTop: 4 }}>Click to open →</div>
                  </div>
                </div>
                <h3 style={{ fontSize: 20 }}>All Distributors</h3>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {[...distributors].sort((a,b) => a.name.localeCompare(b.name)).map((d, idx) => (
                  <div key={d._id} onClick={() => { setSelectedDist(d); setView('distributor'); fetchOrders(d._id); setDistOrderSelectedIds([]); }}
                    style={{ padding: 16, border: '2px solid #97c1E6', borderRadius: 10, marginBottom: 10, cursor: 'pointer', background: '#fff', display: 'flex', gap: 12 }}>
                    <div style={{ fontWeight: 700, color: '#3FA0E8', minWidth: 30, fontSize: 16 }}>{idx + 1}.</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{d.name}</div>
                      <div style={{ fontSize: 14, color: '#666' }}>{d.phone} · {d.address}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#3FA0E8', marginTop: 4 }}>Rs.{totalFor(d._id).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== ALL PURCHASES ===== */}
          {view === 'allOrders' && (
            <div>
              <button onClick={() => setView('dashboard')} style={btnBack}>← Back</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 24 }}>All Purchases</h2>
                <button onClick={() => buildOrdersPDF('All Purchases', allOrders)} style={btnPrimary}>📄 Download All</button>
                {selectedOrderIds.length > 0 && (
                  <>
                    <button onClick={() => { const list = allOrders.filter(o => selectedOrderIds.includes(o._id)); if (!list.length) return; buildOrdersPDF('Selected Purchases', list); }} style={btnOutline}>📄 Download Selected ({selectedOrderIds.length})</button>
                    <button onClick={deleteSelectedOrders} style={btnDanger}>🗑 Delete Selected ({selectedOrderIds.length})</button>
                  </>
                )}
              </div>
              <TotalBar label="Total" amount={allOrders.reduce((s,o) => s + Number(o.amount), 0)} />
              <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 15, whiteSpace: 'nowrap', width: 'auto' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#F0F8FE', zIndex: 1 }}>
                    <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                      <th style={{ padding: '4px 8px', color: '#999' }}>
                        <input type="checkbox" checked={selectedOrderIds.length === allOrders.length && allOrders.length > 0} onChange={(e) => toggleAllOrders(e.target.checked)} style={{ cursor: 'pointer', width: 18, height: 18 }}/>
                      </th>
                      <th style={{ padding: '4px 8px', color: '#999' }}>Date</th>
                      <th style={{ padding: '4px 8px', color: '#999' }}>Distributor</th>
                      <th style={{ padding: '4px 8px', color: '#999' }}>Invoice No.</th>
                      <th style={{ padding: '4px 8px', color: '#999' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...allOrders].sort((a,b) => new Date(a.date) - new Date(b.date)).map(o => (
                      <tr key={o._id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '4px 8px' }}><input type="checkbox" checked={selectedOrderIds.includes(o._id)} onChange={() => toggleSelect(selectedOrderIds, setSelectedOrderIds, o._id)} style={{ cursor: 'pointer', width: 18, height: 18 }}/></td>
                        <td style={{ padding: '4px 8px' }}>{formatDate(o.date)}</td>
                        <td style={{ padding: '4px 8px' }}>{o.distributorId?.name || '-'}</td>
                        <td style={{ padding: '4px 8px' }}>{o.invoiceNumber}</td>
                        <td style={{ padding: '4px 8px', fontWeight: 600 }}>Rs.{Number(o.amount).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== INVOICE SUMMARY with Distributor Level Selection ===== */}
          {view === 'invoiceSummary' && (
            <div>
              <button onClick={() => setView('dashboard')} style={btnBack}>← Back</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 24 }}>Distributor Wise Invoice Summary</h2>
                <FilterDropdown 
                  value={invoiceFilterDist}
                  onChange={(e) => {
                    setInvoiceFilterDist(e.target.value);
                    setInvoiceSelectedIds([]);
                  }}
                  distributors={distributors}
                  label="Filter"
                />
                <button onClick={generateInvoiceSummaryPDF} style={btnPrimary}>📄 Download All</button>
                {invoiceSelectedIds.length > 0 && (
                  <>
                    <button onClick={downloadSelectedInvoice} style={btnOutline}>
                      📄 Download Selected ({invoiceSelectedIds.length})
                    </button>
                    <button onClick={deleteSelectedInvoiceOrders} style={btnDanger}>
                      🗑 Delete Selected ({invoiceSelectedIds.length})
                    </button>
                  </>
                )}
              </div>
              <TotalBar label="Grand Total" amount={getFilteredInvoiceOrders().reduce((s,o) => s + Number(o.amount), 0)} />
              <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 15, whiteSpace: 'nowrap', width: 'auto' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#F0F8FE', zIndex: 1 }}>
                    <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                      <th style={{ padding: '4px 8px', color: '#999', width: '30px' }}>
                        <input
                          type="checkbox"
                          checked={invoiceSelectedIds.length === getFilteredInvoiceOrders().length && getFilteredInvoiceOrders().length > 0}
                          onChange={(e) => toggleAllInvoice(e.target.checked)}
                          style={{ cursor: 'pointer', width: 18, height: 18 }}
                        />
                      </th>
                      <th style={{ padding: '4px 8px', fontSize: 13, color: '#999' }}>Date</th>
                      <th style={{ padding: '4px 8px', fontSize: 13, color: '#999' }}>Invoice No.</th>
                      <th style={{ padding: '4px 8px', fontSize: 13, color: '#999' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredOrders = getFilteredInvoiceOrders();
                      const sortedDists = [...distributors].sort((a,b) => a.name.localeCompare(b.name));
                      const distsToShow = invoiceFilterDist === 'all' 
                        ? sortedDists 
                        : sortedDists.filter(d => d._id === invoiceFilterDist);
                      
                      const blocks = [];
                      distsToShow.forEach(d => {
                        const distOrders = filteredOrders.filter(o => (o.distributorId?._id || o.distributorId) === d._id).sort((a,b) => new Date(a.date) - new Date(b.date));
                        if (!distOrders.length) return;
                        const distTotal = distOrders.reduce((s,o) => s + Number(o.amount), 0);
                        const allSelected = areAllDistributorOrdersSelected(d._id);
                        blocks.push(
                          <tr key={`h-${d._id}`}>
                            <td colSpan={4} style={{ padding: '6px 8px 3px', fontWeight: 700, fontSize: 16, color: '#3FA0E8' }}>
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={(e) => toggleDistributorOrders(d._id, e.target.checked)}
                                style={{ cursor: 'pointer', width: 18, height: 18, marginRight: 10 }}
                              />
                              {d.name}
                            </td>
                          </tr>
                        );
                        distOrders.forEach(o => {
                          blocks.push(
                            <tr key={o._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                              <td style={{ padding: '4px 8px' }}>
                                <input
                                  type="checkbox"
                                  checked={invoiceSelectedIds.includes(o._id)}
                                  onChange={() => toggleSelect(invoiceSelectedIds, setInvoiceSelectedIds, o._id)}
                                  style={{ cursor: 'pointer', width: 18, height: 18 }}
                                />
                              </td>
                              <td style={{ padding: '4px 8px' }}>{formatDate(o.date)}</td>
                              <td style={{ padding: '4px 8px' }}>{o.invoiceNumber}</td>
                              <td style={{ padding: '4px 8px' }}>Rs.{Number(o.amount).toLocaleString('en-IN')}</td>
                            </tr>
                          );
                        });
                        blocks.push(
                          <tr key={`sub-${d._id}`} style={{ borderBottom: '2px solid #eee' }}>
                            <td></td>
                            <td colSpan={2} style={{ padding: '4px 8px', fontWeight: 600, fontSize: 15 }}>Subtotal</td>
                            <td style={{ padding: '4px 8px', fontWeight: 600, fontSize: 15 }}>Rs.{distTotal.toLocaleString('en-IN')}</td>
                          </tr>
                        );
                      });
                      return blocks;
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== DISTRIBUTOR PAYMENTS ===== */}
          {view === 'payments' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flexShrink: 0 }}>
                <button onClick={() => setView('dashboard')} style={btnBack}>← Back</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: 24 }}>Distributor Payments</h2>
                  <button onClick={() => { setModal('payment'); setForm({}); setEditTarget(null); }} style={btnPrimary}>+ Add Payment</button>
                  <button onClick={() => buildPaymentsPDF('Distributor Payments', payments)} style={btnPrimary}>📄 Download All</button>
                  {selectedPaymentIds.length > 0 && (
                    <>
                      <button onClick={() => { const list = payments.filter(p => selectedPaymentIds.includes(p._id)); if (!list.length) return; buildPaymentsPDF('Selected Payments', list); }} style={btnOutline}>📄 Download Selected ({selectedPaymentIds.length})</button>
                      <button onClick={deleteSelectedPayments} style={btnDanger}>🗑 Delete Selected ({selectedPaymentIds.length})</button>
                    </>
                  )}
                </div>
                <TotalBar label="Total" amount={totalAllPayments} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 15, whiteSpace: 'nowrap', width: 'auto' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#F0F8FE', zIndex: 1 }}>
                    <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                      <th style={{ padding: '4px 8px', color: '#999' }}>
                        <input type="checkbox" checked={selectedPaymentIds.length === payments.length && payments.length > 0} onChange={(e) => toggleAllPayments(e.target.checked)} style={{ cursor: 'pointer', width: 18, height: 18 }}/>
                      </th>
                      <th style={{ padding: '4px 8px', color: '#999' }}>Date</th>
                      <th style={{ padding: '4px 8px', color: '#999' }}>Distributor</th>
                      <th style={{ padding: '4px 8px', color: '#999' }}>Amount</th>
                      <th style={{ padding: '4px 8px', color: '#999' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...payments].sort((a,b) => new Date(a.date) - new Date(b.date)).map(p => (
                      <tr key={p._id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '4px 8px' }}><input type="checkbox" checked={selectedPaymentIds.includes(p._id)} onChange={() => toggleSelect(selectedPaymentIds, setSelectedPaymentIds, p._id)} style={{ cursor: 'pointer', width: 18, height: 18 }}/></td>
                        <td style={{ padding: '4px 8px' }}>{formatDate(p.date)}</td>
                        <td style={{ padding: '4px 8px' }}>{paymentName(p)}</td>
                        <td style={{ padding: '4px 8px', fontWeight: 600 }}>Rs.{Number(p.amount).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '4px 8px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEditPayment(p)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', fontSize: 13 }}>Edit</button>
                            <button onClick={() => handleDeletePayment(p._id)} style={{ padding: '4px 6px', borderRadius: 4, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', color: 'red', display: 'flex', alignItems: 'center' }}><TrashIcon/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== PAYMENT SUMMARY with Distributor Level Selection ===== */}
          {view === 'paymentSummary' && (
            <div>
              <button onClick={() => setView('dashboard')} style={btnBack}>← Back</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 24 }}>Distributor Payment Summary</h2>
                <FilterDropdown 
                  value={paymentFilterDist}
                  onChange={(e) => {
                    setPaymentFilterDist(e.target.value);
                    setPaymentSummarySelectedIds([]);
                  }}
                  distributors={distributors}
                  label="Filter"
                />
                <button onClick={generatePaymentSummaryPDF} style={btnPrimary}>📄 Download All</button>
                {paymentSummarySelectedIds.length > 0 && (
                  <>
                    <button onClick={downloadSelectedPaymentSummary} style={btnOutline}>
                      📄 Download Selected ({paymentSummarySelectedIds.length})
                    </button>
                    <button onClick={deleteSelectedPaymentSummary} style={btnDanger}>
                      🗑 Delete Selected ({paymentSummarySelectedIds.length})
                    </button>
                  </>
                )}
              </div>
              <TotalBar label="Grand Total" amount={getFilteredPayments().reduce((s,p) => s + Number(p.amount), 0)} />
              <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 15, whiteSpace: 'nowrap', width: 'auto' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#F0F8FE', zIndex: 1 }}>
                    <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                      <th style={{ padding: '4px 8px', color: '#999', width: '30px' }}>
                        <input
                          type="checkbox"
                          checked={paymentSummarySelectedIds.length === getFilteredPayments().length && getFilteredPayments().length > 0}
                          onChange={(e) => toggleAllPaymentSummary(e.target.checked)}
                          style={{ cursor: 'pointer', width: 18, height: 18 }}
                        />
                      </th>
                      <th style={{ padding: '4px 8px', fontSize: 13, color: '#999' }}>Date</th>
                      <th style={{ padding: '4px 8px', fontSize: 13, color: '#999' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredPayments = getFilteredPayments();
                      const sortedDists = [...distributors].sort((a,b) => a.name.localeCompare(b.name));
                      const distsToShow = paymentFilterDist === 'all' 
                        ? sortedDists 
                        : sortedDists.filter(d => d._id === paymentFilterDist);
                      
                      const blocks = [];
                      distsToShow.forEach(d => {
                        const dp = filteredPayments.filter(p => (p.distributorId?._id || p.distributorId) === d._id).sort((a,b) => new Date(a.date) - new Date(b.date));
                        if (!dp.length) return;
                        const dt = dp.reduce((s,p) => s + Number(p.amount), 0);
                        const allSelected = areAllDistributorPaymentsSelected(d._id);
                        blocks.push(
                          <tr key={`h-${d._id}`}>
                            <td colSpan={3} style={{ padding: '6px 8px 3px', fontWeight: 700, fontSize: 16, color: '#3FA0E8' }}>
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={(e) => toggleDistributorPayments(d._id, e.target.checked)}
                                style={{ cursor: 'pointer', width: 18, height: 18, marginRight: 10 }}
                              />
                              {d.name}
                            </td>
                          </tr>
                        );
                        dp.forEach(p => {
                          blocks.push(
                            <tr key={p._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                              <td style={{ padding: '4px 8px' }}>
                                <input
                                  type="checkbox"
                                  checked={paymentSummarySelectedIds.includes(p._id)}
                                  onChange={() => toggleSelect(paymentSummarySelectedIds, setPaymentSummarySelectedIds, p._id)}
                                  style={{ cursor: 'pointer', width: 18, height: 18 }}
                                />
                              </td>
                              <td style={{ padding: '4px 8px' }}>{formatDate(p.date)}</td>
                              <td style={{ padding: '4px 8px' }}>Rs.{Number(p.amount).toLocaleString('en-IN')}</td>
                            </tr>
                          );
                        });
                        blocks.push(
                          <tr key={`sub-${d._id}`} style={{ borderBottom: '2px solid #eee' }}>
                            <td></td>
                            <td style={{ padding: '4px 8px', fontWeight: 600, fontSize: 15 }}>Subtotal</td>
                            <td style={{ padding: '4px 8px', fontWeight: 600, fontSize: 15 }}>Rs.{dt.toLocaleString('en-IN')}</td>
                          </tr>
                        );
                      });
                      return blocks;
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== DISTRIBUTOR VIEW ===== */}
          {view === 'distributor' && selectedDist && (
            <div>
              <button onClick={() => { setView('dashboard'); setSelectedDist(null); }} style={btnBack}>← Back</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 24 }}>{selectedDist.name}</h2>
                  <div style={{ color: '#666', fontSize: 15 }}>{selectedDist.phone} · {selectedDist.address}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button onClick={() => openEditDist(selectedDist)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', fontSize: 14 }}>Edit</button>
                  <button onClick={() => handleDeleteDist(selectedDist._id)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', color: 'red', display: 'flex', alignItems: 'center' }}><TrashIcon/></button>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 20 }}>Orders</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => { setModal('order'); setForm({}); setEditTarget(null); setDupWarning(''); }} style={btnPrimary}>+ Add Order</button>
                  <button onClick={() => buildOrdersPDF(selectedDist.name, orders.map(o => ({ ...o, distributorId: selectedDist })))} style={btnPrimary}>📄 Download All</button>
                  {distOrderSelectedIds.length > 0 && <button onClick={() => { const list = orders.filter(o => distOrderSelectedIds.includes(o._id)).map(o => ({ ...o, distributorId: selectedDist })); if (!list.length) return; buildOrdersPDF('Selected - ' + selectedDist.name, list); }} style={btnOutline}>📄 Download Selected ({distOrderSelectedIds.length})</button>}
                </div>
              </div>
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 15, whiteSpace: 'nowrap', width: 'auto' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#F0F8FE', zIndex: 1 }}>
                    <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                      <th style={{ padding: '4px 8px', color: '#999' }}></th>
                      <th style={{ padding: '4px 8px', color: '#999' }}>Date</th>
                      <th style={{ padding: '4px 8px', color: '#999' }}>Invoice No.</th>
                      <th style={{ padding: '4px 8px', color: '#999' }}>Amount</th>
                      <th style={{ padding: '4px 8px', color: '#999' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o._id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '4px 8px' }}><input type="checkbox" checked={distOrderSelectedIds.includes(o._id)} onChange={() => toggleSelect(distOrderSelectedIds, setDistOrderSelectedIds, o._id)} style={{ cursor: 'pointer', width: 18, height: 18 }}/></td>
                        <td style={{ padding: '4px 8px' }}>{formatDate(o.date)}</td>
                        <td style={{ padding: '4px 8px' }}>{o.invoiceNumber}</td>
                        <td style={{ padding: '4px 8px', fontWeight: 600 }}>Rs.{Number(o.amount).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '4px 8px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEditOrder(o)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', fontSize: 13 }}>Edit</button>
                            <button onClick={() => buildOrdersPDF(selectedDist.name, [{ ...o, distributorId: selectedDist }])} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #3FA0E8', cursor: 'pointer', background: '#3FA0E8', color: '#fff', fontSize: 13 }}>PDF</button>
                            <button onClick={() => handleDeleteOrder(o._id)} style={{ padding: '4px 6px', borderRadius: 4, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', color: 'red', display: 'flex', alignItems: 'center' }}><TrashIcon/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #eee', background: '#f9f9f9' }}>
                      <td></td>
                      <td colSpan={2} style={{ padding: '8px 10px', fontWeight: 700, fontSize: 17 }}>Total</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, fontSize: 17, color: '#3FA0E8' }}>Rs.{orders.reduce((s,o) => s + Number(o.amount), 0).toLocaleString('en-IN')}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 420 }}>
            <h3 style={{ marginTop: 0, fontSize: 22 }}>{modal === 'dist' ? (editTarget ? 'Edit Distributor' : 'Add Distributor') : modal === 'order' ? (editTarget ? 'Edit Order' : 'Add Order') : (editTarget ? 'Edit Payment' : 'Add Distributor Payment')}</h3>
            {dupWarning && <div style={{ background: '#FAEEDA', color: '#BA7517', padding: '12px 16px', borderRadius: 8, marginBottom: 14, fontSize: 15 }}>⚠️ {dupWarning}</div>}
            {modal === 'dist' && ['name','phone','address'].map(f => (
              <div key={f} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 14, color: '#666', display: 'block', marginBottom: 4 }}>{f.charAt(0).toUpperCase()+f.slice(1)}</label>
                <input value={form[f]||''} onChange={e => setForm({...form,[f]:e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15, boxSizing: 'border-box' }}/>
              </div>
            ))}
            {modal === 'order' && [{f:'date',t:'date'},{f:'invoiceNumber',t:'text'},{f:'amount',t:'number'}].map(({f,t}) => (
              <div key={f} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 14, color: '#666', display: 'block', marginBottom: 4 }}>{f.charAt(0).toUpperCase()+f.slice(1)}</label>
                <input type={t} value={form[f]||''} onChange={e => setForm({...form,[f]:e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15, boxSizing: 'border-box' }}/>
              </div>
            ))}
            {modal === 'payment' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 14, color: '#666', display: 'block', marginBottom: 4 }}>Date</label>
                  <input type="date" value={form.date||''} onChange={e => setForm({...form, date: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15, boxSizing: 'border-box' }}/>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 14, color: '#666', display: 'block', marginBottom: 4 }}>Distributor</label>
                  <select value={form.distributorId||''} onChange={e => setForm({...form, distributorId: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15, boxSizing: 'border-box' }}>
                    <option value="">Select distributor</option>
                    {[...distributors].sort((a,b) => a.name.localeCompare(b.name)).map(d => <option key={d._id} value={d._id} style={{ fontSize: 15 }}>{d.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 14, color: '#666', display: 'block', marginBottom: 4 }}>Payment Amount (Rs.)</label>
                  <input type="number" value={form.amount||''} onChange={e => setForm({...form, amount: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15, boxSizing: 'border-box' }}/>
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => { setModal(null); setForm({}); setEditTarget(null); setDupWarning(''); }} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', fontSize: 15 }}>Cancel</button>
              <button onClick={modal === 'dist' ? handleSaveDist : modal === 'order' ? handleSaveOrder : handleSavePayment} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#3FA0E8', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;