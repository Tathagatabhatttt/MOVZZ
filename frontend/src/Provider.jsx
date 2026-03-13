import React, { useEffect, useState, useCallback, useRef } from 'react';
import { io as ioClient } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const API = `${API_BASE}/provider`;

// ─── API helpers ─────────────────────────────────────────

function getToken() { return localStorage.getItem('provider_token'); }

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { headers: authHeaders(), ...opts });
  return res.json();
}

// ─── State badge ─────────────────────────────────────────

const STATE_COLORS = {
  CONFIRMED:     { bg: '#d1fae5', color: '#065f46' },
  IN_PROGRESS:   { bg: '#fef3c7', color: '#92400e' },
  COMPLETED:     { bg: '#e0f2fe', color: '#0369a1' },
  FAILED:        { bg: '#fee2e2', color: '#991b1b' },
  CANCELLED:     { bg: '#f3f4f6', color: '#374151' },
  SEARCHING:     { bg: '#dbeafe', color: '#1e40af' },
};

function StateBadge({ state }) {
  const s = STATE_COLORS[state] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
    }}>
      {state?.replace('_', ' ')}
    </span>
  );
}

// ─── Rupee helper ────────────────────────────────────────

const rupees = (paise) => `₹${Math.round((paise || 0) / 100)}`;

// ═════════════════════════════════════════════════════════
//  LOGIN SCREEN
// ═════════════════════════════════════════════════════════

function LoginScreen({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  const sendOTP = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); setLoading(false); return; }
      if (data.data?.otp) setDevOtp(data.data.otp);
      setOtpSent(true);
    } catch { setError('Network error'); }
    setLoading(false);
  };

  const verifyOTP = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); setLoading(false); return; }
      localStorage.setItem('provider_token', data.data.token);
      localStorage.setItem('provider_id', data.data.provider.id);
      onLogin(data.data.provider);
    } catch { setError('Network error'); }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-deep, #0a0f1a)',
    }}>
      <div style={{ width: 360, textAlign: 'center' }}>
        <h1 style={{ fontSize: 42, fontWeight: 800, color: '#fff', letterSpacing: 2 }}>
          MOV<span style={{ color: 'var(--brand, #60a5fa)' }}>ZZ</span>
        </h1>
        <p style={{ color: '#64748b', marginBottom: 32 }}>Driver Partner Login</p>

        {error && <p style={{ color: '#f87171', marginBottom: 12, fontSize: 13 }}>{error}</p>}

        {!otpSent ? (
          <>
            <input
              type="tel" placeholder="Phone number (9876543210)"
              value={phone} onChange={e => setPhone(e.target.value)}
              style={inputStyle} maxLength={13}
            />
            <button onClick={sendOTP} disabled={loading || phone.length < 10}
              style={{ ...btnStyle, opacity: phone.length < 10 ? 0.4 : 1 }}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>OTP sent to {phone}</p>
            {devOtp && <p style={{ color: '#f59e0b', fontSize: 12, marginBottom: 8 }}>Dev OTP: {devOtp}</p>}
            <input
              type="text" placeholder="Enter 6-digit OTP"
              value={otp} onChange={e => setOtp(e.target.value)}
              style={inputStyle} maxLength={6}
            />
            <button onClick={verifyOTP} disabled={loading || otp.length < 6}
              style={{ ...btnStyle, opacity: otp.length < 6 ? 0.4 : 1 }}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 12, border: 'none',
  background: '#1e293b', color: '#fff', fontSize: 18, letterSpacing: 2,
  marginBottom: 12, boxSizing: 'border-box', outline: 'none',
};

const btnStyle = {
  width: '100%', padding: 14, borderRadius: 12, border: 'none',
  background: 'var(--brand, #60a5fa)', color: '#fff', fontSize: 16,
  fontWeight: 700, cursor: 'pointer',
};

// ═════════════════════════════════════════════════════════
//  MAIN PROVIDER DASHBOARD
// ═════════════════════════════════════════════════════════

function Dashboard() {
  const [tab, setTab] = useState('home');
  const [provider, setProvider] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeBookings, setActiveBookings] = useState([]);
  const [incomingRide, setIncomingRide] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [history, setHistory] = useState([]);
  const socketRef = useRef(null);

  // Load profile
  useEffect(() => {
    apiFetch('/profile').then(res => {
      if (res.success) { setProvider(res.data); setIsOnline(res.data.isOnline); }
    });
  }, []);

  // Socket.IO
  useEffect(() => {
    const token = getToken();
    const providerId = localStorage.getItem('provider_id');
    if (!token || !providerId) return;

    const socket = ioClient(
      import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3000',
      { auth: { token }, transports: ['websocket'] }
    );

    socket.on('connect', () => socket.emit('join:provider', providerId));

    socket.on('ride:new_assignment', (data) => {
      setIncomingRide(data);
      fetchActive();
    });

    socket.on('ride:cancelled', (data) => {
      setActiveBookings(prev => prev.filter(b => b.id !== data.id));
      setIncomingRide(prev => prev?.id === data.id ? null : prev);
    });

    socketRef.current = socket;
    return () => socket.disconnect();
  }, []);

  const fetchActive = useCallback(async () => {
    const res = await apiFetch('/bookings/active');
    if (res.success) setActiveBookings(res.data);
  }, []);

  useEffect(() => { fetchActive(); }, [fetchActive]);

  // Toggle online
  const toggleOnline = async () => {
    const next = !isOnline;
    const res = await apiFetch('/status', {
      method: 'POST', body: JSON.stringify({ online: next }),
    });
    if (res.success) setIsOnline(next);
  };

  // Ride actions
  const acceptRide = async (id) => {
    await apiFetch(`/bookings/${id}/accept`, { method: 'POST' });
    setIncomingRide(null);
    fetchActive();
  };

  const startRide = async (id) => {
    await apiFetch(`/bookings/${id}/start`, { method: 'POST' });
    fetchActive();
  };

  const completeRide = async (id) => {
    await apiFetch(`/bookings/${id}/complete`, { method: 'POST' });
    fetchActive();
  };

  const rejectRide = async (id) => {
    await apiFetch(`/bookings/${id}/reject`, { method: 'POST' });
    setIncomingRide(null);
    fetchActive();
  };

  // Earnings
  useEffect(() => {
    if (tab === 'earnings') {
      apiFetch('/earnings').then(res => { if (res.success) setEarnings(res.data); });
      apiFetch('/bookings/history?limit=20').then(res => { if (res.success) setHistory(res.data.bookings); });
    }
  }, [tab]);

  // Profile update
  const updateProfile = async (fields) => {
    const res = await apiFetch('/profile', {
      method: 'PUT', body: JSON.stringify(fields),
    });
    if (res.success) {
      setProvider(prev => ({ ...prev, ...fields }));
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('provider_token');
    localStorage.removeItem('provider_id');
    window.location.reload();
  };

  // ── Tab nav ──────────────────────────────────────────
  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'earnings', label: 'Earnings' },
    { id: 'profile', label: 'Profile' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep, #0a0f1a)' }}>
      {/* Header */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 24px', background: 'var(--bg-card, #0d1d35)',
        borderBottom: '1px solid var(--line, #1e293b)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
            MOV<span style={{ color: 'var(--brand, #60a5fa)' }}>ZZ</span>
          </span>
          <span style={{ color: '#64748b', fontSize: 12 }}>Driver Partner</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={toggleOnline} style={{
            padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 12, letterSpacing: 1,
            background: isOnline ? '#22c55e' : '#ef4444', color: '#fff',
          }}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </button>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>{provider?.name}</span>
        </div>
      </header>

      {/* Tabs */}
      <nav style={{
        display: 'flex', gap: 0, background: 'var(--bg-card, #0d1d35)',
        borderBottom: '1px solid var(--line, #1e293b)',
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '12px 0', border: 'none', cursor: 'pointer',
            background: 'transparent', fontSize: 13, fontWeight: 700,
            color: tab === t.id ? 'var(--brand, #60a5fa)' : '#64748b',
            borderBottom: tab === t.id ? '2px solid var(--brand, #60a5fa)' : '2px solid transparent',
          }}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        {tab === 'home' && (
          <HomeTab
            activeBookings={activeBookings}
            incomingRide={incomingRide}
            isOnline={isOnline}
            onAccept={acceptRide}
            onReject={rejectRide}
            onStart={startRide}
            onComplete={completeRide}
          />
        )}
        {tab === 'earnings' && <EarningsTab earnings={earnings} history={history} />}
        {tab === 'profile' && <ProfileTab provider={provider} onUpdate={updateProfile} onLogout={logout} />}
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
//  HOME TAB
// ═════════════════════════════════════════════════════════

function HomeTab({ activeBookings, incomingRide, isOnline, onAccept, onReject, onStart, onComplete }) {
  return (
    <>
      {/* Incoming ride alert */}
      {incomingRide && (
        <div style={{
          padding: 20, background: '#1e3a5f', borderRadius: 16,
          border: '2px solid var(--brand, #60a5fa)', marginBottom: 20,
        }}>
          <h3 style={{ color: 'var(--brand, #60a5fa)', margin: '0 0 8px', fontSize: 16 }}>
            New Ride Request!
          </h3>
          <p style={{ color: '#fff', margin: '0 0 4px', fontSize: 15 }}>
            {incomingRide.pickup || 'Pickup'} → {incomingRide.dropoff || 'Dropoff'}
          </p>
          <p style={{ color: '#22c55e', fontWeight: 800, fontSize: 22, margin: '4px 0 16px' }}>
            {rupees(incomingRide.fareEstimate)}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => onAccept(incomingRide.id)} style={{
              flex: 1, padding: 14, borderRadius: 12, border: 'none',
              background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer',
            }}>Accept</button>
            <button onClick={() => onReject(incomingRide.id)} style={{
              flex: 1, padding: 14, borderRadius: 12, border: 'none',
              background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer',
            }}>Reject</button>
          </div>
        </div>
      )}

      <h3 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
        Active Rides ({activeBookings.length})
      </h3>

      {activeBookings.length === 0 ? (
        <p style={{ color: '#475569', textAlign: 'center', paddingTop: 40 }}>
          {isOnline ? 'Waiting for ride requests...' : 'Go online to receive rides'}
        </p>
      ) : (
        activeBookings.map(b => (
          <div key={b.id} style={{
            padding: 16, background: '#1e293b', borderRadius: 12, marginBottom: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--brand, #60a5fa)', fontSize: 12, fontWeight: 700 }}>
                {b.transportMode}
              </span>
              <StateBadge state={b.state} />
            </div>
            <p style={{ color: '#fff', margin: '0 0 4px', fontSize: 15 }}>
              {b.pickup} → {b.dropoff}
            </p>
            <p style={{ color: '#22c55e', fontWeight: 700, fontSize: 18, margin: '4px 0' }}>
              {rupees(b.fareEstimate)}
            </p>
            {b.user && (
              <p style={{ color: '#64748b', fontSize: 12, margin: '4px 0 12px' }}>
                Rider: {b.user.name || b.user.phone}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              {b.state === 'CONFIRMED' && (
                <button onClick={() => onStart(b.id)} style={{
                  flex: 1, padding: 12, borderRadius: 10, border: 'none',
                  background: '#f59e0b', color: '#fff', fontWeight: 700, cursor: 'pointer',
                }}>Start Ride</button>
              )}
              {b.state === 'IN_PROGRESS' && (
                <button onClick={() => onComplete(b.id)} style={{
                  flex: 1, padding: 12, borderRadius: 10, border: 'none',
                  background: '#22c55e', color: '#fff', fontWeight: 700, cursor: 'pointer',
                }}>Complete Ride</button>
              )}
            </div>
          </div>
        ))
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════
//  EARNINGS TAB
// ═════════════════════════════════════════════════════════

function EarningsTab({ earnings, history }) {
  if (!earnings) return <p style={{ color: '#475569' }}>Loading...</p>;

  const periods = [
    { label: 'Today', ...earnings.today },
    { label: 'This Week', ...earnings.week },
    { label: 'This Month', ...earnings.month },
  ];

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {periods.map(p => (
          <div key={p.label} style={{
            flex: 1, background: '#1e293b', borderRadius: 12, padding: 16, textAlign: 'center',
          }}>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>{p.label}</div>
            <div style={{ color: '#22c55e', fontSize: 24, fontWeight: 800, margin: '6px 0 2px' }}>
              {rupees(p.net)}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>{p.rides} rides</div>
          </div>
        ))}
      </div>

      <div style={{
        background: '#1e293b', borderRadius: 8, padding: '10px 16px',
        display: 'flex', justifyContent: 'space-between', marginBottom: 20,
      }}>
        <span style={{ color: '#64748b', fontSize: 12 }}>
          Commission: {rupees(earnings.month.commission)} this month (10%)
        </span>
        <span style={{ color: '#64748b', fontSize: 12 }}>Payment: T+2 days</span>
      </div>

      <h3 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
        Ride History
      </h3>

      {history.length === 0 ? (
        <p style={{ color: '#475569' }}>No completed rides yet</p>
      ) : (
        history.map(b => (
          <div key={b.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 14, background: '#1e293b', borderRadius: 10, marginBottom: 8,
          }}>
            <div>
              <div style={{ color: '#fff', fontSize: 14 }}>{b.pickup} → {b.dropoff}</div>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                {new Date(b.createdAt).toLocaleDateString()} · {b.transportMode}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#22c55e', fontWeight: 700 }}>{rupees(b.fareActual || b.fareEstimate)}</div>
              <StateBadge state={b.state} />
            </div>
          </div>
        ))
      )}

      {earnings.payouts?.length > 0 && (
        <>
          <h3 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, margin: '20px 0 12px' }}>
            Payouts
          </h3>
          {earnings.payouts.map(p => (
            <div key={p.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: 12, background: '#1e293b', borderRadius: 8, marginBottom: 8,
            }}>
              <div>
                <span style={{ color: '#fff', fontWeight: 700 }}>{rupees(p.netPayout)}</span>
                <span style={{ color: '#64748b', fontSize: 12, marginLeft: 8 }}>{p.totalRides} rides</span>
              </div>
              <div>
                <span style={{
                  color: p.status === 'COMPLETED' ? '#22c55e' : '#f59e0b',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {p.status}
                </span>
                <span style={{ color: '#475569', fontSize: 11, marginLeft: 8 }}>
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════
//  PROFILE TAB
// ═════════════════════════════════════════════════════════

function ProfileTab({ provider, onUpdate, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(provider?.name || '');
  const [vehicleModel, setVehicleModel] = useState(provider?.vehicleModel || '');
  const [vehiclePlate, setVehiclePlate] = useState(provider?.vehiclePlate || '');

  if (!provider) return null;

  const handleSave = async () => {
    const ok = await onUpdate({ name, vehicleModel, vehiclePlate });
    if (ok) setEditing(false);
  };

  return (
    <>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Reliability', value: `${Math.round(provider.reliability * 100)}%` },
          { label: 'Rating', value: provider.rating?.toFixed(1) },
          { label: 'Total Rides', value: provider.totalRides },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: '#1e293b', borderRadius: 12, padding: 16, textAlign: 'center',
          }}>
            <div style={{ color: '#22c55e', fontSize: 24, fontWeight: 800 }}>{s.value}</div>
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 4, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Details */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
        <h3 style={{ color: '#fff', margin: '0 0 16px', fontSize: 16 }}>Profile Details</h3>

        {[
          { label: 'Name', val: provider.name, editable: true, state: name, setter: setName },
          { label: 'Phone', val: provider.phone },
          { label: 'Type', val: provider.type?.replace('_', ' ') },
          { label: 'Vehicle Model', val: provider.vehicleModel || '—', editable: true, state: vehicleModel, setter: setVehicleModel },
          { label: 'Vehicle Plate', val: provider.vehiclePlate || '—', editable: true, state: vehiclePlate, setter: setVehiclePlate },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 14 }}>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{f.label}</div>
            {editing && f.editable ? (
              <input value={f.state} onChange={e => f.setter(e.target.value)} style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none',
                background: '#0f172a', color: '#fff', fontSize: 15, marginTop: 4,
                boxSizing: 'border-box', outline: 'none',
              }} />
            ) : (
              <div style={{ color: '#fff', fontSize: 15, marginTop: 4 }}>{f.val}</div>
            )}
          </div>
        ))}

        {editing ? (
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button onClick={handleSave} style={{
              flex: 1, padding: 12, borderRadius: 10, border: 'none',
              background: 'var(--brand, #60a5fa)', color: '#fff', fontWeight: 700, cursor: 'pointer',
            }}>Save</button>
            <button onClick={() => setEditing(false)} style={{
              flex: 1, padding: 12, borderRadius: 10, border: '1px solid #334155',
              background: 'transparent', color: '#64748b', fontWeight: 600, cursor: 'pointer',
            }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} style={{
            width: '100%', padding: 12, borderRadius: 10, marginTop: 8,
            border: '1px solid var(--brand, #60a5fa)', background: 'transparent',
            color: 'var(--brand, #60a5fa)', fontWeight: 700, cursor: 'pointer',
          }}>Edit Profile</button>
        )}
      </div>

      {/* Logout */}
      <button onClick={onLogout} style={{
        width: '100%', padding: 14, borderRadius: 12, marginTop: 20,
        border: '1px solid #ef4444', background: 'transparent',
        color: '#ef4444', fontWeight: 700, fontSize: 16, cursor: 'pointer',
      }}>Logout</button>
    </>
  );
}

// ═════════════════════════════════════════════════════════
//  ROOT COMPONENT
// ═════════════════════════════════════════════════════════

export default function Provider() {
  const [isAuth, setIsAuth] = useState(!!getToken());

  if (!isAuth) return <LoginScreen onLogin={() => setIsAuth(true)} />;
  return <Dashboard />;
}
