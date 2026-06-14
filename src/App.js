import React, { useState, useEffect } from 'react';
import {
  getDistributors, createDistributor, updateDistributor, deleteDistributor,
  getOrdersByDistributor, createOrder, updateOrder, deleteOrder,
  getOrders
} from './api';
import './App.css';

const PRESET_USER = 'NAGESH';
const PRESET_PASS = 'RUDRA@4473';

function App() {
  const [distributors, setDistributors] = useState([]);
  const [selectedDist, setSelectedDist] = useState(null);
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [view, setView] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [editTarget, setEditTarget] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [search, setSearch] = useState('');
  const [dupWarning, setDupWarning] = useState('');

  useEffect(() => { fetchDistributors(); }, []);

  useEffect(() => {
    const ping = setInterval(() => {
      fetch('https://orderflow-backend-5wcq.onrender.com/');
    }, 600000);
    return () => clearInterval(ping);
  }, []);

  useEffect(() => {
    if (selectedDist) fetchOrders(selectedDist._id);
  }, [selectedDist]);

  const fetchDistributors = async () => {
    const res = await getDistributors();
    setDistributors(res.data);
    const allOrdersRes = await getOrders();
    setAllOrders(allOrdersRes.data);
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
    if (editTarget) {
      await updateDistributor(editTarget._id, form);
    } else {
      await createDistributor(form);
    }
    setModal(null); setForm({}); setEditTarget(null); setDupWarning('');
    fetchDistributors();
  };

  const handleDeleteDist = async (id) => {
    if (window.confirm('Delete this distributor?')) {
      await deleteDistributor(id);
      setView('dashboard'); setSelectedDist(null);
      fetchDistributors();
    }
  };

  const handleSaveOrder = async () => {
    setDupWarning('');
    if (!editTarget) {
      const dup = orders.find(o => o.invoiceNumber.toLowerCase() === (form.invoiceNumber || '').toLowerCase());
      if (dup) { setDupWarning('An order with this invoice number already exists!'); return; }
    }
    const data = { ...form, distributorId: selectedDist._id, totalAmount: form.amount };
    if (editTarget) {
      await updateOrder(editTarget._id, data);
    } else {
      await createOrder(data);
    }
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2,'0');
    const month = String(d.getMonth()+1).padStart(2,'0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const generatePDF = () => {
    const totalAmount = orders.reduce((s,o) => s + Number(o.amount), 0);
    const rows = orders.map(o =>
      `<tr>
        <td style="padding:8px;border:1px solid #ddd">${formatDate(o.date)}</td>
        <td style="padding:8px;border:1px solid #ddd">${o.invoiceNumber}</td>
        <td style="padding:8px;border:1px solid #ddd">Rs.${Number(o.amount).toLocaleString('en-IN')}</td>
      </tr>`
    ).join('');
    const html = `
      <html><head><meta charset="UTF-8"><title>OrderFlow - ${selectedDist.name}</title>
      <style>body{font-family:sans-serif;padding:32px;color:#1a1a1a}h1{color:#73c2fb}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#73c2fb;color:#fff;padding:10px;text-align:left}td{padding:8px;border:1px solid #ddd}.total{text-align:right;margin-top:16px;font-size:18px;font-weight:700;color:#73c2fb}.meta{color:#666;margin-bottom:24px;font-size:14px}</style>
      </head><body>
        <h1>OrderFlow</h1>
        <h2>SAI KRUPA MEDICAL AND GENERAL STORE</h2>
        <h3>${selectedDist.name}</h3>
        <div class="meta">Ph: ${selectedDist.phone} | Addr: ${selectedDist.address}</div>
        <table>
          <thead><tr><th>Date</th><th>Invoice No.</th><th>Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total">Total: Rs.${totalAmount.toLocaleString('en-IN')}</div>
        <div style="margin-top:32px;font-size:12px;color:#999">Generated by L NAGESH - ${new Date().toLocaleDateString('en-IN')}</div>
      </body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    win.onload = () => { win.print(); };
  };

  const generateAllOrdersPDF = () => {
    const sorted = [...allOrders].sort((a,b) => new Date(a.date) - new Date(b.date));
    const rows = sorted.map(o =>
      `<tr>
        <td style="padding:8px;border:1px solid #ddd">${formatDate(o.date)}</td>
        <td style="padding:8px;border:1px solid #ddd">${o.distributorId?.name || '-'}</td>
        <td style="padding:8px;border:1px solid #ddd">${o.invoiceNumber}</td>
        <td style="padding:8px;border:1px solid #ddd">Rs.${Number(o.amount).toLocaleString('en-IN')}</td>
      </tr>`
    ).join('');
    const total = allOrders.reduce((s,o) => s + Number(o.amount), 0);
    const html = `
      <html><head><meta charset="UTF-8"><title>All Orders - OrderFlow</title>
      <style>body{font-family:sans-serif;padding:32px;color:#1a1a1a}h1{color:#73c2fb}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#73c2fb;color:#fff;padding:10px;text-align:left}td{padding:8px;border:1px solid #ddd}.total{text-align:right;margin-top:16px;font-size:18px;font-weight:700;color:#73c2fb}</style>
      </head><body>
        <h1>OrderFlow</h1>
        <h2>SAI KRUPA MEDICAL AND GENERAL STORE</h2>
        <h3>All Orders</h3>
        <table>
          <thead><tr><th>Date</th><th>Distributor</th><th>Invoice No.</th><th>Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total">Total: Rs.${total.toLocaleString('en-IN')}</div>
        <div style="margin-top:32px;font-size:12px;color:#999">Generated by L NAGESH - ${new Date().toLocaleDateString('en-IN')}</div>
      </body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    win.onload = () => { win.print(); };
  };

  const shareOrder = (o) => {
    const text = `OrderFlow - ${selectedDist.name}\nDate: ${formatDate(o.date)}\nInvoice: ${o.invoiceNumber}\nAmount: Rs.${Number(o.amount).toLocaleString('en-IN')}`;
    if (navigator.share) {
      navigator.share({ title: 'Order Details', text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Order details copied to clipboard!');
    }
  };

  const shareOrderPDF = (o) => {
    const html = `
      <html><head><meta charset="UTF-8"><title>Order - ${o.invoiceNumber}</title>
      <style>body{font-family:sans-serif;padding:32px;color:#1a1a1a}h1{color:#73c2fb}.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}.label{color:#666;font-size:14px}.value{font-weight:600}</style>
      </head><body>
        <h1>OrderFlow</h1>
        <h2>SAI KRUPA MEDICAL AND GENERAL STORE</h2>
        <h3>${selectedDist.name}</h3>
        <div class="row"><span class="label">Date</span><span class="value">${formatDate(o.date)}</span></div>
        <div class="row"><span class="label">Invoice No.</span><span class="value">${o.invoiceNumber}</span></div>
        <div class="row"><span class="label">Amount</span><span class="value">Rs.${Number(o.amount).toLocaleString('en-IN')}</span></div>
        <div style="margin-top:32px;font-size:12px;color:#999">Generated by L NAGESH - ${new Date().toLocaleDateString('en-IN')}</div>
      </body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    win.onload = () => { win.print(); };
  };

  const filteredDists = distributors
    .filter(d => d.name.toLowerCase().startsWith(search.toLowerCase()) || search === '')
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!loggedIn) {
    return (
      <div style={{ minHeight: '100vh', background: '#f7f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 36, width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h2 style={{ color: '#73c2fb', marginTop: 0, marginBottom: 4 }}>OrderFlow</h2>
          <p style={{ color: '#999', fontSize: 14, marginBottom: 24 }}>Sign in to continue</p>
          {loginError && (
            <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              {loginError}
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Username</label>
            <input value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})}
              placeholder="Enter username"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}/>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Password</label>
            <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              placeholder="Enter password"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}/>
          </div>
          <button onClick={handleLogin}
            style={{ width: '100%', padding: 10, background: '#73c2fb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Topbar */}
      <div style={{ background: '#73c2fb', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontSize: 20, fontWeight: 700, cursor: 'pointer', minWidth: 120 }}
          onClick={() => { setView('dashboard'); setSelectedDist(null); }}>
          OrderFlow
        </span>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600, letterSpacing: '0.3px' }}>
            SAI KRUPA MEDICAL AND GENERAL STORE
          </span>
        </div>
        <div style={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setLoggedIn(false)}
            style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', padding: '5px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 240, minWidth: 240, background: '#D6EAF8', borderRight: '1px solid #AED6F1', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

          {/* Fixed: Add button + Search */}
          <div style={{ padding: '16px 16px 8px', flexShrink: 0, background: '#D6EAF8' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', fontWeight: 600 }}>Distributors</div>
              <button onClick={() => { setModal('dist'); setForm({}); setEditTarget(null); setDupWarning(''); }}
                style={{ background: '#73c2fb', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                + Add
              </button>
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search distributors..."
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #AED6F1', fontSize: 13, boxSizing: 'border-box', background: '#fff' }}
            />
          </div>

          {/* Scrollable distributor list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
            {filteredDists.length === 0 && (
              <div style={{ fontSize: 13, color: '#999', padding: '8px 0' }}>No distributors found</div>
            )}
            {filteredDists.map(d => (
              <div key={d._id} onClick={() => { setSelectedDist(d); setView('distributor'); fetchOrders(d._id); }}
                style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                  background: selectedDist?._id === d._id ? '#AED6F1' : 'transparent',
                  borderLeft: selectedDist?._id === d._id ? '3px solid #73c2fb' : '3px solid transparent' }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: '#555' }}>{d.phone}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

          {/* Dashboard */}
          {view === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

              {/* Fixed: Stats */}
              <div style={{ flexShrink: 0 }}>
                <h2>Dashboard</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
                  <div style={{ background: '#f0f0f0', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 12, color: '#666' }}>Distributors</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{distributors.length}</div>
                  </div>
                  <div onClick={() => setView('allOrders')}
                    style={{ background: '#f0f0f0', borderRadius: 10, padding: 16, cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, color: '#666' }}>Total Orders</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{allOrders.length}</div>
                    <div style={{ fontSize: 11, color: '#73c2fb', marginTop: 4 }}>Click to view all →</div>
                  </div>
                  <div style={{ background: '#f0f0f0', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 12, color: '#666' }}>Total Billing</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>Rs.{distributors.reduce((s,d) => s + totalFor(d._id), 0).toLocaleString('en-IN')}</div>
                  </div>
                </div>
                <h3>All Distributors</h3>
              </div>

              {/* Scrollable distributor cards */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {[...distributors].sort((a,b) => a.name.localeCompare(b.name)).map(d => (
                  <div key={d._id} onClick={() => { setSelectedDist(d); setView('distributor'); fetchOrders(d._id); }}
                    style={{ padding: 14, border: '2px solid #97c1E6', borderRadius: 10, marginBottom: 10, cursor: 'pointer' }}>
                    <div style={{ fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: 13, color: '#666' }}>{d.phone} · {d.address}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#73c2fb', marginTop: 4 }}>
                      Rs.{totalFor(d._id).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Orders */}
          {view === 'allOrders' && (
            <div>
              <button onClick={() => setView('dashboard')}
                style={{ marginBottom: 16, padding: '6px 14px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}>
                ← Back
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>All Orders</h2>
                <button onClick={generateAllOrdersPDF}
                  style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #73c2fb', cursor: 'pointer', background: '#73c2fb', color: '#fff', fontSize: 13 }}>
                  📄 Download PDF
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                    <th style={{ padding: 10, fontSize: 13, color: '#999' }}>Date</th>
                    <th style={{ padding: 10, fontSize: 13, color: '#999' }}>Distributor</th>
                    <th style={{ padding: 10, fontSize: 13, color: '#999' }}>Invoice No.</th>
                    <th style={{ padding: 10, fontSize: 13, color: '#999' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[...allOrders].sort((a,b) => new Date(a.date) - new Date(b.date)).map(o => (
                    <tr key={o._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 10 }}>{formatDate(o.date)}</td>
                      <td style={{ padding: 10 }}>{o.distributorId?.name || '-'}</td>
                      <td style={{ padding: 10 }}>{o.invoiceNumber}</td>
                      <td style={{ padding: 10, fontWeight: 600 }}>Rs.{Number(o.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #eee', background: '#f9f9f9' }}>
                    <td colSpan={3} style={{ padding: 12, fontWeight: 700, fontSize: 15 }}>Total</td>
                    <td style={{ padding: 12, fontWeight: 700, fontSize: 15, color: '#73c2fb' }}>
                      Rs.{allOrders.reduce((s,o) => s + Number(o.amount), 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Distributor Detail */}
          {view === 'distributor' && selectedDist && (
            <div>
              <button onClick={() => { setView('dashboard'); setSelectedDist(null); }}
                style={{ marginBottom: 16, padding: '6px 14px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}>
                ← Back
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{selectedDist.name}</h2>
                  <div style={{ color: '#666', fontSize: 14 }}>{selectedDist.phone} · {selectedDist.address}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button onClick={generatePDF}
                    style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #73c2fb', cursor: 'pointer', background: '#73c2fb', color: '#fff' }}>
                    📄 PDF
                  </button>
                  <button onClick={() => openEditDist(selectedDist)}
                    style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}>
                    Edit
                  </button>
                  <button onClick={() => handleDeleteDist(selectedDist._id)}
                    style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', color: 'red' }}>
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Orders</h3>
                <button onClick={() => { setModal('order'); setForm({}); setEditTarget(null); setDupWarning(''); }}
                  style={{ padding: '6px 14px', background: '#73c2fb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  + Add Order
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                    <th style={{ padding: 10, fontSize: 13, color: '#999' }}>Date</th>
                    <th style={{ padding: 10, fontSize: 13, color: '#999' }}>Invoice No.</th>
                    <th style={{ padding: 10, fontSize: 13, color: '#999' }}>Amount</th>
                    <th style={{ padding: 10, fontSize: 13, color: '#999' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 10 }}>{formatDate(o.date)}</td>
                      <td style={{ padding: 10 }}>{o.invoiceNumber}</td>
                      <td style={{ padding: 10, fontWeight: 600 }}>Rs.{Number(o.amount).toLocaleString('en-IN')}</td>
                      <td style={{ padding: 10 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button onClick={() => openEditOrder(o)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', fontSize: 12 }}>
                            Edit
                          </button>
                          <button onClick={() => shareOrder(o)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #73c2fb', cursor: 'pointer', background: '#fff', color: '#73c2fb', fontSize: 12 }}>
                            Share
                          </button>
                          <button onClick={() => shareOrderPDF(o)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #73c2fb', cursor: 'pointer', background: '#73c2fb', color: '#fff', fontSize: 12 }}>
                            PDF
                          </button>
                          <button onClick={() => handleDeleteOrder(o._id)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', color: 'red', fontSize: 12 }}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #eee', background: '#f9f9f9' }}>
                    <td colSpan={2} style={{ padding: 12, fontWeight: 700, fontSize: 15 }}>Total</td>
                    <td style={{ padding: 12, fontWeight: 700, fontSize: 15, color: '#73c2fb' }}>
                      Rs.{orders.reduce((s,o) => s + Number(o.amount), 0).toLocaleString('en-IN')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380 }}>
            <h3 style={{ marginTop: 0 }}>{modal === 'dist' ? (editTarget ? 'Edit Distributor' : 'Add Distributor') : (editTarget ? 'Edit Order' : 'Add Order')}</h3>
            {dupWarning && (
              <div style={{ background: '#FAEEDA', color: '#BA7517', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 14 }}>
                ⚠️ {dupWarning}
              </div>
            )}
            {modal === 'dist' ? (
              <>
                {['name','phone','address'].map(f => (
                  <div key={f} style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>{f.charAt(0).toUpperCase()+f.slice(1)}</label>
                    <input value={form[f]||''} onChange={e => setForm({...form,[f]:e.target.value})}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}/>
                  </div>
                ))}
              </>
            ) : (
              <>
                {[{f:'date',t:'date'},{f:'invoiceNumber',t:'text'},{f:'amount',t:'number'}].map(({f,t}) => (
                  <div key={f} style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>{f.charAt(0).toUpperCase()+f.slice(1)}</label>
                    <input type={t} value={form[f]||''} onChange={e => setForm({...form,[f]:e.target.value})}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}/>
                  </div>
                ))}
              </>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => { setModal(null); setForm({}); setEditTarget(null); setDupWarning(''); }}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}>
                Cancel
              </button>
              <button onClick={modal === 'dist' ? handleSaveDist : handleSaveOrder}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#73c2fb', color: '#fff', cursor: 'pointer' }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;