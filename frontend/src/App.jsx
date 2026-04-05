import { useEffect, useRef, useState } from "react";
import Map, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useBookingStore } from './stores/bookingStore';
import { useAuthStore } from './stores/authStore';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const CHENNAI_PROXIMITY = '80.2707,13.0827';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const transportModes = [
  { id: "cab",   label: "Cab",        icon: CabIcon,   desc: "Doorstep comfort and AC ride" },
  { id: "bike",  label: "Bike Taxi",  icon: BikeIcon,  desc: "Fastest for tight city lanes" },
  { id: "auto",  label: "Auto",       icon: AutoIcon,  desc: "Balanced fare with quick pickup" },
  { id: "metro", label: "Metro",      icon: MetroIcon, desc: "Most predictable commute window" },
];

const destinationChips = [
  { label: "Chennai Airport T1", lat: 12.9941, lng: 80.1709 },
  { label: "T Nagar",            lat: 13.0418, lng: 80.2341 },
  { label: "OMR Tech Park",      lat: 12.9010, lng: 80.2279 },
  { label: "Guindy",             lat: 13.0067, lng: 80.2206 },
];
const sourceChips = [
  { label: "Pacifica Aurum 1 Block-B5", lat: 13.0623, lng: 80.2100 },
  { label: "Anna Nagar",                lat: 13.0878, lng: 80.2101 },
  { label: "Velachery",                 lat: 12.9815, lng: 80.2180 },
];
const laneLabels = ["Cab", "Bike", "Auto", "Metro", "Reliable", "Parallel", "Safe ETA"];

// ─── Helpers ──────────────────────────────────────────────

function getToneClass(tag) {
  if (tag === "BEST") return "best";
  if (tag === "CHEAPEST") return "cheap";
  return "high";
}
function getTagLabel(tag) {
  if (tag === "BEST") return "Best Match";
  if (tag === "CHEAPEST") return "Cheapest";
  if (tag === "PREMIUM") return "Premium";
  return tag;
}
function authHeaders() {
  const token = localStorage.getItem('movzzy_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}
async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders(), ...opts });
  return res.json();
}
function rupees(paise) { return Math.round((paise || 0) / 100); }

// ─── Star Rating Component ─────────────────────────────────

function StarRating({ value, onChange, size = 28 }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(n)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: size, color: n <= value ? '#f59e0b' : '#d1d5db', padding: 0,
        }}>★</button>
      ))}
    </div>
  );
}

// ─── Notification Banner ───────────────────────────────────

function NotifBanner({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'absolute', top: 46, left: 0, right: 0, zIndex: 999,
      background: '#1e63c9', color: '#fff', padding: '8px 14px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontSize: 13, fontWeight: 600, borderRadius: '0 0 8px 8px',
    }}>
      <span>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );
}

// ─── Bottom Nav Bar ───────────────────────────────────────

function BottomNav({ active, onChange, hasNotif }) {
  const tabs = [
    { id: 'home',    label: 'Ride',    icon: '🚗' },
    { id: 'trips',   label: 'Trips',   icon: '📋' },
    { id: 'wallet',  label: 'Wallet',  icon: '💳' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      display: 'flex', background: '#fff',
      borderTop: '1px solid #e5e7eb', borderRadius: '0 0 36px 36px',
      zIndex: 100,
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, padding: '8px 0 10px', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 2, opacity: active === t.id ? 1 : 0.45,
          borderBottom: active === t.id ? '2px solid #1e63c9' : '2px solid transparent',
          transition: 'opacity 0.2s, border-color 0.2s',
        }}>
          <span style={{ fontSize: 18, position: 'relative' }}>
            {t.icon}
            {t.id === 'wallet' && hasNotif && (
              <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
            )}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: active === t.id ? '#1e63c9' : '#6b7280' }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Trip History Card ─────────────────────────────────────

const STATE_CHIP = {
  COMPLETED:        { bg: '#dcfce7', color: '#15803d' },
  CANCELLED:        { bg: '#f3f4f6', color: '#374151' },
  FAILED:           { bg: '#fee2e2', color: '#991b1b' },
  IN_PROGRESS:      { bg: '#fef3c7', color: '#92400e' },
  CONFIRMED:        { bg: '#dbeafe', color: '#1d4ed8' },
  SEARCHING:        { bg: '#ede9fe', color: '#7c3aed' },
  MANUAL_ESCALATION:{ bg: '#fce7f3', color: '#9d174d' },
};

function TripCard({ booking, onRate, onReceipt }) {
  const s = STATE_CHIP[booking.state] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '12px 14px',
      border: '1px solid #e5e7eb', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1d35' }}>{booking.pickup}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>→ {booking.dropoff}</div>
        </div>
        <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
          {booking.state?.replace('_', ' ')}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span style={{ fontSize: 12, color: '#6b7280' }}>
          {booking.transportMode} · ₹{rupees(booking.fareEstimate)}
        </span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>
          {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      {booking.state === 'COMPLETED' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {!booking.rating && (
            <button onClick={() => onRate(booking)} style={{
              flex: 1, fontSize: 11, padding: '5px 0', background: '#ede9fe', color: '#7c3aed',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
            }}>★ Rate Trip</button>
          )}
          {booking.rating && (
            <div style={{ fontSize: 11, color: '#f59e0b' }}>{'★'.repeat(booking.rating.score)} Rated</div>
          )}
          <button onClick={() => onReceipt(booking)} style={{
            flex: 1, fontSize: 11, padding: '5px 0', background: '#f0fdf4', color: '#15803d',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
          }}>⬇ Receipt</button>
        </div>
      )}
    </div>
  );
}

// ─── Trips Screen ──────────────────────────────────────────

function TripsScreen({ isActive, onRate, onReceipt }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!isActive) return;
    setLoading(true);
    apiFetch('/bookings').then(d => {
      if (d.success) setTrips(d.data || []);
    }).finally(() => setLoading(false));
  }, [isActive]);

  const filtered = filter === 'all' ? trips : trips.filter(t => t.state === filter.toUpperCase());

  return (
    <section className={`screen ${isActive ? 'is-active' : ''}`} style={{ paddingBottom: 72 }}>
      <p className="kicker">My Rides</p>
      <h2>Trip History</h2>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {['all','completed','cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
            border: '1px solid #e5e7eb', cursor: 'pointer',
            background: filter === f ? '#1e63c9' : '#fff',
            color: filter === f ? '#fff' : '#374151',
          }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>
      {loading ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>Loading trips...</p>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>No trips found</p>
      ) : (
        filtered.map(b => (
          <TripCard key={b.id} booking={b} onRate={onRate} onReceipt={onReceipt} />
        ))
      )}
    </section>
  );
}

// ─── Wallet Screen ─────────────────────────────────────────

function WalletScreen({ isActive, onNotif }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [passData, setPassData] = useState(null);
  const [passActivating, setPassActivating] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    setLoading(true);
    Promise.all([
      apiFetch('/users/me/wallet'),
      apiFetch('/subscriptions/me'),
    ]).then(([walletRes, passRes]) => {
      if (walletRes.success) setWallet(walletRes.data);
      if (passRes.success) setPassData(passRes.data);
    }).finally(() => setLoading(false));
  }, [isActive]);

  async function activatePass(plan) {
    setPassActivating(true);
    const d = await apiFetch('/subscriptions/activate', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
    if (d.success) {
      onNotif(`${d.data.message}`);
      const passRes = await apiFetch('/subscriptions/me');
      if (passRes.success) setPassData(passRes.data);
    } else {
      onNotif(d.error || 'Could not activate pass');
    }
    setPassActivating(false);
  }

  async function cancelPass() {
    const d = await apiFetch('/subscriptions/cancel', { method: 'POST' });
    if (d.success) {
      onNotif(d.message);
      const passRes = await apiFetch('/subscriptions/me');
      if (passRes.success) setPassData(passRes.data);
    }
  }

  function copyReferral() {
    if (!wallet?.referralCode) return;
    navigator.clipboard.writeText(wallet.referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onNotif('Referral code copied!');
    });
  }

  async function checkPromo() {
    if (!promoInput.trim()) return;
    setPromoError('');
    setPromoResult(null);
    const d = await apiFetch('/promo/validate', {
      method: 'POST',
      body: JSON.stringify({ code: promoInput.trim() }),
    });
    if (d.success) setPromoResult(d.data);
    else setPromoError(d.error || 'Invalid code');
  }

  return (
    <section className={`screen ${isActive ? 'is-active' : ''}`} style={{ paddingBottom: 72 }}>
      <p className="kicker">My Wallet</p>
      <h2>Credits & Referral</h2>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>Loading...</p>
      ) : wallet ? (
        <>
          {/* MOVZZY Pass */}
          {passData?.active ? (
            <div style={{
              background: 'linear-gradient(135deg, #92400e, #b45309)',
              borderRadius: 16, padding: 16, color: '#fff', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Active Pass</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>✦ {passData.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                    {passData.discountPercent}% off every ride · No surge
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>Expires in</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{passData.daysRemaining}d</div>
                </div>
              </div>
              <button onClick={cancelPass} style={{
                marginTop: 12, background: 'rgba(255,255,255,0.15)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8,
                padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>Cancel Auto-Renew</button>
            </div>
          ) : passData?.plans ? (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>✦ MOVZZY Pass</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Ride more, pay less every month</div>
              </div>
              {passData.plans.map(plan => (
                <div key={plan.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #f9fafb', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1d35' }}>{plan.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{plan.description}</div>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0d1d35' }}>₹{plan.priceRupees}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>/month</div>
                  </div>
                  <button onClick={() => activatePass(plan.id)} disabled={passActivating} style={{
                    background: '#1e63c9', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', opacity: passActivating ? 0.5 : 1, whiteSpace: 'nowrap',
                  }}>Get</button>
                </div>
              ))}
            </div>
          ) : null}

          {/* Balance card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e63c9, #2d5da7)',
            borderRadius: 16, padding: '20px', color: '#fff', marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Available Credits</div>
            <div style={{ fontSize: 36, fontWeight: 800 }}>₹{wallet.balanceRupees}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Applied automatically at checkout</div>
          </div>

          {/* Referral */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Your Referral Code</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{
                flex: 1, background: '#f9fafb', border: '1px dashed #d1d5db',
                borderRadius: 8, padding: '8px 12px', fontSize: 16, fontWeight: 800,
                color: '#1e63c9', letterSpacing: '0.1em',
              }}>{wallet.referralCode}</div>
              <button onClick={copyReferral} style={{
                padding: '8px 14px', background: '#1e63c9', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12,
              }}>{copied ? '✓ Copied' : 'Copy'}</button>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
              {wallet.referralCount} friend{wallet.referralCount !== 1 ? 's' : ''} joined · You earn ₹50 per referral
            </div>
          </div>

          {/* Credits history */}
          {wallet.credits?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Credit History</div>
              {wallet.credits.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
                  <span style={{ color: '#374151' }}>{c.reason}</span>
                  <span style={{ fontWeight: 700, color: '#15803d' }}>+₹{rupees(c.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Promo code checker */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Check Promo Code</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={promoInput}
                onChange={e => setPromoInput(e.target.value.toUpperCase())}
                placeholder="MOVZZY50"
                style={{
                  flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb',
                  borderRadius: 8, fontSize: 14, letterSpacing: '0.05em',
                }}
              />
              <button onClick={checkPromo} style={{
                padding: '8px 14px', background: '#1e63c9', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12,
              }}>Check</button>
            </div>
            {promoResult && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#dcfce7', borderRadius: 8, fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                ✓ {promoResult.description}
              </div>
            )}
            {promoError && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>{promoError}</div>
            )}
          </div>
        </>
      ) : (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>Could not load wallet</p>
      )}
    </section>
  );
}

// ─── Profile Screen ────────────────────────────────────────

function ProfileScreen({ isActive, onNotif, accessibilityMode, setAccessibilityMode }) {
  const { phone, logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [addingFav, setAddingFav] = useState(false);
  const [favLabel, setFavLabel] = useState('');
  const [favName, setFavName] = useState('');

  useEffect(() => {
    if (!isActive) return;
    apiFetch('/users/me').then(d => {
      if (d.success) {
        setProfile(d.data);
        setName(d.data.name || '');
        setEmail(d.data.email || '');
      }
    });
    apiFetch('/users/me/favorites').then(d => {
      if (d.success) setFavorites(d.data);
    });
  }, [isActive]);

  async function saveProfile() {
    setSaving(true);
    const d = await apiFetch('/users/me', { method: 'PUT', body: JSON.stringify({ name, email }) });
    if (d.success) onNotif('Profile saved!');
    setSaving(false);
  }

  async function removeFav(id) {
    await apiFetch(`/users/me/favorites/${id}`, { method: 'DELETE' });
    setFavorites(f => f.filter(x => x.id !== id));
  }

  async function addFav() {
    if (!favLabel || !favName) return;
    const d = await apiFetch('/users/me/favorites', {
      method: 'POST',
      body: JSON.stringify({ label: favLabel, name: favName, lat: 13.0827, lng: 80.2707 }),
    });
    if (d.success) {
      setFavorites(f => [d.data, ...f.filter(x => x.label !== favLabel)]);
      setAddingFav(false);
      setFavLabel('');
      setFavName('');
    }
  }

  return (
    <section className={`screen ${isActive ? 'is-active' : ''}`} style={{ paddingBottom: 72 }}>
      <p className="kicker">Account</p>
      <h2>Profile</h2>

      {/* Phone */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Phone (verified)</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0d1d35' }}>{phone || profile?.phone}</div>
      </div>

      {/* Name & Email */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Personal Info</div>
        <label className="field compact" style={{ marginBottom: 8 }}>
          <span>Name</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </label>
        <label className="field compact" style={{ marginBottom: 10 }}>
          <span>Email</span>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" />
        </label>
        <button onClick={saveProfile} disabled={saving} style={{
          width: '100%', padding: '8px', background: '#1e63c9', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
        }}>{saving ? 'Saving...' : 'Save Changes'}</button>
      </div>

      {/* Favorites */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Favorite Locations</div>
          <button onClick={() => setAddingFav(a => !a)} style={{
            background: 'none', border: '1px solid #e5e7eb', borderRadius: 8,
            padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 700, color: '#1e63c9',
          }}>+ Add</button>
        </div>
        {favorites.map(f => (
          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{f.label}</span>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{f.name}</div>
            </div>
            <button onClick={() => removeFav(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14 }}>×</button>
          </div>
        ))}
        {favorites.length === 0 && !addingFav && (
          <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>No favorites yet</p>
        )}
        {addingFav && (
          <div style={{ marginTop: 8 }}>
            <select value={favLabel} onChange={e => setFavLabel(e.target.value)} style={{
              width: '100%', marginBottom: 6, padding: '7px 10px',
              border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13,
            }}>
              <option value="">Select label...</option>
              <option>Home</option>
              <option>Work</option>
              <option>Gym</option>
              <option>Other</option>
            </select>
            <input
              value={favName}
              onChange={e => setFavName(e.target.value)}
              placeholder="Place name"
              style={{ width: '100%', marginBottom: 6, padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}
            />
            <button onClick={addFav} style={{
              width: '100%', padding: '7px', background: '#1e63c9', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12,
            }}>Save Favorite</button>
          </div>
        )}
      </div>

      {/* Accessibility */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Accessibility Mode</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Larger text, high contrast</div>
          </div>
          <button onClick={() => { setAccessibilityMode(a => !a); onNotif(accessibilityMode ? 'Accessibility off' : 'Accessibility on'); }} style={{
            width: 46, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer',
            background: accessibilityMode ? '#1e63c9' : '#d1d5db', transition: 'background 0.2s',
            position: 'relative',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3, transition: 'left 0.2s',
              left: accessibilityMode ? 22 : 3,
            }} />
          </button>
        </div>
      </div>

      {/* Provider portal link */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #e5e7eb', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Are you a driver?</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>Access the provider portal to manage rides and earnings</div>
        <a href="/provider" style={{
          display: 'block', textAlign: 'center', padding: '8px',
          background: '#f0fdf4', color: '#15803d', borderRadius: 8,
          fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid #bbf7d0',
        }}>Open Driver Portal →</a>
      </div>

      {/* Logout */}
      <button onClick={logout} style={{
        width: '100%', padding: '10px', background: '#fee2e2', color: '#dc2626',
        border: '1px solid #fecaca', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13,
      }}>Sign Out</button>
    </section>
  );
}

// ─── Receipt Modal ─────────────────────────────────────────

function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '20px 20px 0 0', padding: 24,
        width: '100%', maxWidth: 470, margin: '0 auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <strong style={{ fontSize: 16 }}>Trip Receipt</strong>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af' }}>×</button>
        </div>
        <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Booking ID</div>
          <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{receipt.bookingId?.slice(-8).toUpperCase()}</div>
        </div>
        <Row label="From" value={receipt.pickup} />
        <Row label="To" value={receipt.dropoff} />
        <Row label="Mode" value={receipt.transportMode} />
        <Row label="Date" value={new Date(receipt.date).toLocaleString('en-IN')} />
        {receipt.provider && <Row label="Driver" value={`${receipt.provider.name} · ${receipt.provider.plate}`} />}
        {receipt.rating && <Row label="Your Rating" value={'★'.repeat(receipt.rating)} />}
        <div style={{ borderTop: '2px solid #f3f4f6', marginTop: 12, paddingTop: 12 }}>
          {receipt.promoCode && <Row label={`Promo (${receipt.promoCode})`} value={`−₹${receipt.promoDiscountRupees}`} color="#15803d" />}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16 }}>
            <span>Total</span>
            <span style={{ color: '#1e63c9' }}>₹{receipt.fareActualRupees || receipt.fareEstimateRupees}</span>
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{receipt.paymentMethod}</div>
        </div>
      </div>
    </div>
  );
}
function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
      <span style={{ color: '#9ca3af' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || '#0d1d35', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

// ─── Rating Modal ──────────────────────────────────────────

function RatingModal({ booking, onClose, onNotif }) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const d = await apiFetch(`/bookings/${booking.id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ score, comment }),
    });
    if (d.success) {
      onNotif('Thanks for your rating!');
      onClose();
    }
    setSubmitting(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '20px 20px 0 0', padding: 24,
        width: '100%', maxWidth: 470, margin: '0 auto',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: 4 }}>Rate Your Trip</h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>{booking.pickup} → {booking.dropoff}</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <StarRating value={score} onChange={setScore} size={36} />
        </div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Any feedback? (optional)"
          rows={3}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, resize: 'none' }}
        />
        <button onClick={submit} disabled={submitting} style={{
          width: '100%', marginTop: 12, padding: '12px',
          background: '#1e63c9', color: '#fff', border: 'none',
          borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14,
        }}>{submitting ? 'Submitting...' : 'Submit Rating'}</button>
      </div>
    </div>
  );
}

// ─── Chat Panel ────────────────────────────────────────────

function ChatPanel({ bookingId, socket, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    apiFetch(`/bookings/${bookingId}/chat`).then(d => {
      if (d.success) setMessages(d.data);
    });
  }, [bookingId]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      if (msg.bookingId === bookingId) setMessages(m => [...m, msg]);
    };
    socket.on('chat:message', handler);
    return () => socket.off('chat:message', handler);
  }, [socket, bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim()) return;
    const d = await apiFetch(`/bookings/${bookingId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message: input.trim() }),
    });
    if (d.success) setMessages(m => [...m, d.data]);
    setInput('');
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 500, background: '#fff',
      display: 'flex', flexDirection: 'column', borderRadius: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
        <strong style={{ fontSize: 14 }}>Chat with Driver</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af' }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 20 }}>No messages yet. Say hi!</p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
            background: m.sender === 'user' ? '#1e63c9' : '#f3f4f6',
            color: m.sender === 'user' ? '#fff' : '#0d1d35',
            borderRadius: m.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
            padding: '8px 12px', maxWidth: '75%', fontSize: 13,
          }}>
            {m.message}
            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2, textAlign: 'right' }}>
              {new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid #f3f4f6' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 20, fontSize: 13 }}
        />
        <button onClick={send} style={{
          padding: '8px 14px', background: '#1e63c9', color: '#fff',
          border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 12,
        }}>Send</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════

function App() {
  const [screen, setScreen] = useState("landing");
  const [activeTab, setActiveTab] = useState("home");
  const [transport, setTransport] = useState("cab");
  const [source, setSource] = useState("Pacifica Aurum 1 Block-B5");
  const [destination, setDestination] = useState("");
  const [sourceCoords, setSourceCoords] = useState({ lat: 13.0623, lng: 80.2100 });
  const [destCoords, setDestCoords] = useState(null);
  const [selectedRide, setSelectedRide] = useState(null);
  const [booked, setBooked] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [mapViewState, setMapViewState] = useState({ longitude: 80.2707, latitude: 13.0827, zoom: 11 });
  const [expandedBreakdown, setExpandedBreakdown] = useState(null);
  const [notif, setNotif] = useState('');

  // Section 2 state
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [stops, setStops] = useState([]); // multi-stop [{label, lat, lng}]
  const [showChat, setShowChat] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [splitData, setSplitData] = useState(null);
  const [splitParticipants, setSplitParticipants] = useState(2);
  const [ratingBooking, setRatingBooking] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [showSplitPanel, setShowSplitPanel] = useState(false);
  const [favorites, setFavorites] = useState([]);

  const isProcessing = useRef(false);
  const suggestDebounce = useRef(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);

  const { otpSent, phone, isAuthenticated, isLoading: isAuthLoading, error: authError, sendOTP, verifyOTP, loginWithOAuthToken } = useAuthStore();
  const { quotes, isLoading, error, fetchQuotes, createBooking, currentBooking, pollStatus, connectSocket, disconnectSocket, socket } = useBookingStore();

  function showNotif(msg) {
    setNotif(msg);
    setTimeout(() => setNotif(''), 3000);
  }

  // ── Accessibility: apply CSS variables ────────────────────
  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-scale', accessibilityMode ? '1.15' : '1');
    document.documentElement.style.setProperty('--contrast-bg', accessibilityMode ? '#000' : '');
  }, [accessibilityMode]);

  // ── Razorpay return handler ───────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('razorpay_payment_id');
    const linkId = params.get('razorpay_payment_link_id');
    const refId = params.get('razorpay_payment_link_reference_id');
    const status = params.get('razorpay_payment_link_status');
    const signature = params.get('razorpay_signature');
    if (!paymentId || !linkId || !refId || !signature) return;
    window.history.replaceState({}, '', window.location.pathname);
    const token = localStorage.getItem('movzzy_token');
    if (!token) return;
    setPaymentPending(true);
    fetch(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bookingId: refId, razorpayPaymentId: paymentId, razorpayPaymentLinkId: linkId, razorpayPaymentLinkRefId: refId, razorpayPaymentLinkStatus: status, razorpaySignature: signature }),
    }).then(r => r.json()).then(async data => {
      if (data.success) {
        await useBookingStore.getState().pollStatus(refId);
        setBooked(true);
        setScreen('results');
      } else {
        setPaymentError(data.error || 'Payment verification failed');
      }
    }).catch(() => setPaymentError('Payment verification failed. Please contact support.')).finally(() => setPaymentPending(false));
  }, []);

  // ── Load photo on auth ────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('movzzy_token');
    fetch(`${API_BASE}/upload/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success && d.data.photoUrl) setPhotoUrl(d.data.photoUrl); }).catch(() => {});
    apiFetch('/users/me/favorites').then(d => { if (d.success) setFavorites(d.data); });
  }, [isAuthenticated]);

  // ── Push notification permission ──────────────────────────
  useEffect(() => {
    if (isAuthenticated && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isAuthenticated]);

  // ── Socket: push notifs for booking state changes ─────────
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.state === 'CONFIRMED') {
        showNotif('Driver confirmed! On the way.');
        if (Notification.permission === 'granted') new Notification('MOVZZY', { body: 'Your driver is confirmed and on the way!' });
      } else if (data.state === 'IN_PROGRESS') {
        showNotif('Your ride has started.');
      } else if (data.state === 'COMPLETED') {
        showNotif('Ride completed! Rate your trip.');
      } else if (data.state === 'CANCELLED') {
        showNotif('Ride cancelled. Try again.');
      }
    };
    socket.on('booking:state_changed', handler);
    return () => socket.off('booking:state_changed', handler);
  }, [socket]);

  // ── Quotes update selectedRide ────────────────────────────
  useEffect(() => {
    if (quotes && quotes.length > 0) setSelectedRide(quotes[0]);
    else setSelectedRide(null);
  }, [quotes]);

  useEffect(() => {
    if (isAuthenticated && screen === "auth") moveTo("transport");
  }, [isAuthenticated, screen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('token');
    const oauthErr = params.get('auth_error');
    if (oauthToken) {
      loginWithOAuthToken(oauthToken);
      connectSocket(oauthToken);
      window.history.replaceState({}, '', window.location.pathname);
      moveTo('transport');
    } else if (oauthErr) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loginWithOAuthToken, connectSocket]);

  useEffect(() => {
    const token = localStorage.getItem('movzzy_token');
    if (token) connectSocket(token);
    return () => disconnectSocket();
  }, [connectSocket, disconnectSocket]);

  // ── Map pan ───────────────────────────────────────────────
  useEffect(() => {
    if (sourceCoords && destCoords) {
      setMapViewState({ longitude: (sourceCoords.lng + destCoords.lng) / 2, latitude: (sourceCoords.lat + destCoords.lat) / 2, zoom: 11 });
    } else if (destCoords) {
      setMapViewState({ longitude: destCoords.lng, latitude: destCoords.lat, zoom: 13 });
    } else if (sourceCoords) {
      setMapViewState({ longitude: sourceCoords.lng, latitude: sourceCoords.lat, zoom: 13 });
    }
  }, [sourceCoords, destCoords]);

  function moveTo(next) {
    const screens = ["landing", "auth", "transport", "destination", "results"];
    if (!screens.includes(next)) return;
    if (next === "results") setBooked(false);
    setScreen(next);
    setActiveTab("home");
  }

  async function fetchSuggestions(query) {
    if (!query || query.length < 3 || !MAPBOX_TOKEN) return [];
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=IN&proximity=${CHENNAI_PROXIMITY}&types=place,neighborhood,address,poi&limit=5&access_token=${MAPBOX_TOKEN}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      return (data.features || []).map(f => ({ placeName: f.place_name, lat: f.center[1], lng: f.center[0] }));
    } catch { return []; }
  }

  function handleSourceChange(val) {
    setSource(val); setSourceCoords(null);
    clearTimeout(suggestDebounce.current);
    suggestDebounce.current = setTimeout(async () => { setSourceSuggestions(await fetchSuggestions(val)); }, 300);
  }
  function handleDestChange(val) {
    setDestination(val); setDestCoords(null);
    clearTimeout(suggestDebounce.current);
    suggestDebounce.current = setTimeout(async () => { setDestSuggestions(await fetchSuggestions(val)); }, 300);
  }

  async function findRides() {
    if (!destination.trim()) return;
    setBooked(false);
    setPromoCode(''); setPromoDiscount(null); setPromoError('');
    setScreen("results");
    await fetchQuotes(source, destination, transport, sourceCoords?.lat, sourceCoords?.lng, destCoords?.lat, destCoords?.lng);
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const token = localStorage.getItem('movzzy_token');
      const presignRes = await fetch(`${API_BASE}/upload/presign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ purpose: 'profile', contentType: file.type }),
      }).then(r => r.json());
      if (!presignRes.success) throw new Error(presignRes.error);
      await fetch(presignRes.data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const saveRes = await fetch(`${API_BASE}/upload/users/me/photo`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: presignRes.data.key }),
      }).then(r => r.json());
      if (saveRes.success) setPhotoUrl(saveRes.data.photoUrl);
    } catch (err) { console.error('Photo upload failed:', err); } finally { setPhotoUploading(false); }
  }

  async function validatePromo() {
    if (!promoCode.trim() || !selectedRide) return;
    setPromoError('');
    const d = await apiFetch('/promo/validate', {
      method: 'POST',
      body: JSON.stringify({ code: promoCode.trim(), farePaise: selectedRide.farePaise }),
    });
    if (d.success) { setPromoDiscount(d.data); showNotif(`Promo applied: ${d.data.description}`); }
    else setPromoError(d.error);
  }

  async function bookRide() {
    if (!selectedRide) return;
    const success = await createBooking(
      source, destination, selectedRide.id,
      sourceCoords?.lat, sourceCoords?.lng,
      destCoords?.lat, destCoords?.lng,
    );
    if (!success) return;
    const booking = useBookingStore.getState().currentBooking;
    if (booking?.id && import.meta.env.VITE_RAZORPAY_KEY_ID) {
      setPaymentPending(true); setPaymentError(null);
      try {
        const token = localStorage.getItem('movzzy_token');
        const res = await fetch(`${API_BASE}/payments/create-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bookingId: booking.id }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to create payment link');
        window.location.href = data.data.shortUrl;
      } catch (err) { setPaymentError(err.message); setPaymentPending(false); }
    } else {
      setBooked(true);
    }
  }

  async function handleSOS() {
    if (!currentBooking?.id) return;
    await apiFetch(`/bookings/${currentBooking.id}/sos`, { method: 'POST' });
    showNotif('SOS alert sent! Operations team notified.');
  }

  async function handleShare() {
    if (!currentBooking?.id) return;
    const d = await apiFetch(`/bookings/${currentBooking.id}/share`, { method: 'POST' });
    if (d.success) {
      setShareUrl(d.data.shareUrl);
      navigator.clipboard.writeText(d.data.shareUrl).then(() => showNotif('Share link copied!')).catch(() => {});
    }
  }

  async function handleSplit() {
    if (!currentBooking?.id) return;
    const d = await apiFetch(`/bookings/${currentBooking.id}/split`, {
      method: 'POST',
      body: JSON.stringify({ participants: splitParticipants }),
    });
    if (d.success) {
      setSplitData(d.data);
      navigator.clipboard.writeText(d.data.splitUrl).then(() => showNotif(`Split link copied! ₹${d.data.perPersonRupees}/person`)).catch(() => {});
    }
  }

  async function loadReceipt(booking) {
    const d = await apiFetch(`/bookings/${booking.id}/receipt`);
    if (d.success) setReceiptData(d.data);
  }

  async function handleSendOTP() {
    if (!phoneNumber) return;
    await sendOTP(phoneNumber);
  }

  async function handleVerifyOTP() {
    if (isProcessing.current || isAuthenticated || !otpCode) return;
    isProcessing.current = true;
    try {
      const success = await verifyOTP(otpCode);
      if (success) {
        setOtpCode('');
        const token = localStorage.getItem('movzzy_token');
        if (token) connectSocket(token);
        moveTo("transport");
      }
    } finally { setTimeout(() => { isProcessing.current = false; }, 1000); }
  }

  const isHomeScreen = activeTab === 'home';
  const showBottomNav = isAuthenticated && screen !== 'landing' && screen !== 'auth';

  // Effective final price for selected ride
  const effectivePrice = selectedRide
    ? Math.max(0, selectedRide.price - (promoDiscount?.discountRupees || 0))
    : 0;

  // ─── Render ───────────────────────────────────────────────

  return (
    <main className="app-shell" style={{ fontSize: accessibilityMode ? '1.1em' : undefined }}>
      <section className="phone-frame">
        {/* Notification Banner */}
        <NotifBanner msg={notif} onClose={() => setNotif('')} />

        {/* Status bar */}
        <header className="status-row">
          <span>9:41</span>
          <span>MOVZZY</span>
          {isAuthenticated ? (
            <button
              onClick={() => photoInputRef.current?.click()}
              title={photoUploading ? 'Uploading…' : 'Change profile photo'}
              style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: photoUrl ? 'transparent' : 'var(--brand)', cursor: photoUploading ? 'wait' : 'pointer', padding: 0, overflow: 'hidden', flexShrink: 0, opacity: photoUploading ? 0.6 : 1 }}
            >
              {photoUrl
                ? <img src={photoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{(phone || '?').slice(-2)}</span>}
            </button>
          ) : <span>5G</span>}
          <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarUpload} />
        </header>

        {/* Chat overlay */}
        {showChat && currentBooking?.id && (
          <ChatPanel bookingId={currentBooking.id} socket={socket} onClose={() => setShowChat(false)} />
        )}

        {/* ── LANDING ── */}
        <section className={`screen landing-screen ${screen === "landing" && isHomeScreen ? "is-active" : ""}`}>
          <div className="landing-content">
            <div className="landing-topline" />
            <div className="brand-mark"><span>MOV</span><span>ZZ</span></div>
            <p className="kicker">Reliability-Orchestrated Mobility</p>
            <h1>Your ride should feel certain before it starts.</h1>
            <p className="copy">MOVZZY ranks transport options by completion confidence, dispatch speed, and fair pricing.</p>
            <div className="landing-editorial">
              <h3>Why MOVZZY</h3>
              <ul>
                <li>One booking flow across cab, bike taxi, auto, and metro.</li>
                <li>Automatic fallback if a provider fails after confirmation.</li>
                <li>Transparent ranking rationale before you commit to a ride.</li>
              </ul>
            </div>
          </div>
          <div className="landing-footer">
            <div className="moving-lane" aria-hidden="true">
              <div className="moving-lane-inner">
                {[...laneLabels, ...laneLabels].map((label, idx) => <span key={`${label}-${idx}`}>{label}</span>)}
              </div>
            </div>
            <div className="landing-cards">
              <article><strong>94%</strong><span>Avg reliability score</span></article>
              <article><strong>3x</strong><span>Parallel provider checks</span></article>
              <article><strong>&lt;30s</strong><span>Recovery re-attempt cycle</span></article>
            </div>
            <div className="action-dock">
              <button className="btn primary" onClick={() => moveTo(isAuthenticated ? "transport" : "auth")}>Start Ride</button>
            </div>
          </div>
        </section>

        {/* ── AUTH ── */}
        <section className={`screen ${screen === "auth" && isHomeScreen ? "is-active" : ""}`}>
          <p className="kicker">Authentication</p>
          <h2>Sign in to MOVZZY</h2>
          <p className="copy">Secure access with enterprise-grade onboarding flow.</p>
          <div className="auth-flow" style={{ marginTop: '2rem' }}>
            {authError && <p style={{ color: 'var(--warn)', marginBottom: '1rem' }}>{authError}</p>}
            {!otpSent ? (
              <>
                <label className="field">
                  <span>Phone Number</span>
                  <input type="tel" placeholder="9876543210" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                </label>
                <div className="action-dock">
                  <button className="btn primary" onClick={handleSendOTP} disabled={isAuthLoading || phoneNumber.length < 10}>
                    {isAuthLoading ? "Sending..." : "Send OTP"}
                  </button>
                </div>
                <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--ink-500)', margin: '0.75rem 0' }}>or</p>
                <button className="btn secondary" style={{ width: '100%' }} onClick={() => { window.location.href = `${API_BASE}/auth/google`; }}>
                  Continue with Google
                </button>
              </>
            ) : (
              <>
                <p style={{ marginBottom: '1rem', fontSize: '14px' }}>OTP sent to {phone}</p>
                <label className="field">
                  <span>Enter 6-digit OTP</span>
                  <input type="text" maxLength="6" placeholder="123456" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
                </label>
                <div className="action-dock">
                  <button className="btn primary" onClick={handleVerifyOTP} disabled={isAuthLoading || isAuthenticated || otpCode.length < 6}>
                    {isAuthLoading ? "Verifying..." : isAuthenticated ? "Verified!" : "Verify & Continue"}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── TRANSPORT ── */}
        <section className={`screen ${screen === "transport" && isHomeScreen ? "is-active" : ""}`} style={{ paddingBottom: showBottomNav ? 72 : undefined }}>
          <p className="kicker">Step 1</p>
          <h2>Select transport mode</h2>
          <p className="copy">Vertical selection with lane-specific orchestration intelligence.</p>
          <div className="mode-list">
            {transportModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button key={mode.id} className={`mode-item ${transport === mode.id ? "selected" : ""}`} onClick={() => setTransport(mode.id)}>
                  <span className="mode-icon"><Icon /></span>
                  <span className="mode-copy"><strong>{mode.label}</strong><small>{mode.desc}</small></span>
                  <span className="mode-check" aria-hidden="true">{transport === mode.id ? "●" : "○"}</span>
                </button>
              );
            })}
          </div>
          <div className="action-dock">
            <button className="btn primary" onClick={() => moveTo("destination")}>Next</button>
          </div>
        </section>

        {/* ── DESTINATION ── */}
        <section className={`screen ${screen === "destination" && isHomeScreen ? "is-active" : ""}`} style={{ paddingBottom: showBottomNav ? 72 : undefined }}>
          <p className="kicker">Step 2</p>
          <h2>Set pickup and destination</h2>
          <p className="copy">MOVZZY will return ranked options with reliability rationale.</p>
          <div className="route-editor">
            <div className="route-pin source" />
            <div className="route-pin destination" />
            <div className="route-line" />
            <div className="route-fields">
              <label className="field compact">
                <span>Pickup</span>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={source} onChange={(e) => handleSourceChange(e.target.value)} placeholder="Current location" />
                  {sourceSuggestions.length > 0 && (
                    <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: '#fff', border: '1px solid #ddd', borderRadius: '6px', margin: '2px 0 0', padding: 0, listStyle: 'none', maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      {sourceSuggestions.map((s, i) => (
                        <li key={i} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f0f0f0' }}
                          onMouseDown={() => { setSource(s.placeName); setSourceCoords({ lat: s.lat, lng: s.lng }); setSourceSuggestions([]); }}>
                          {s.placeName}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </label>
              <label className="field compact">
                <span>Drop location</span>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={destination} onChange={(e) => handleDestChange(e.target.value)} placeholder="Terminal 1, Chennai Airport" />
                  {destSuggestions.length > 0 && (
                    <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: '#fff', border: '1px solid #ddd', borderRadius: '6px', margin: '2px 0 0', padding: 0, listStyle: 'none', maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      {destSuggestions.map((s, i) => (
                        <li key={i} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f0f0f0' }}
                          onMouseDown={() => { setDestination(s.placeName); setDestCoords({ lat: s.lat, lng: s.lng }); setDestSuggestions([]); }}>
                          {s.placeName}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Multi-stop */}
          <div style={{ marginTop: 6 }}>
            {stops.map((stop, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#9ca3af', width: 40 }}>Stop {i+1}</span>
                <input
                  value={stop.label}
                  onChange={e => setStops(stops.map((s, j) => j === i ? { ...s, label: e.target.value } : s))}
                  placeholder="Add waypoint"
                  style={{ flex: 1, padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                />
                <button onClick={() => setStops(stops.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16 }}>×</button>
              </div>
            ))}
            <button onClick={() => setStops([...stops, { label: '', lat: null, lng: null }])} style={{
              background: 'none', border: '1px dashed #e5e7eb', borderRadius: 8,
              padding: '5px 10px', fontSize: 12, color: '#6b7280', cursor: 'pointer', width: '100%', marginBottom: 4,
            }}>+ Add Stop</button>
          </div>

          {/* Scheduled ride */}
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 3 }}>
              Schedule for later (optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={e => setScheduledFor(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}
            />
            {scheduledFor && (
              <button onClick={() => setScheduledFor('')} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>Clear schedule</button>
            )}
          </div>

          {/* Map */}
          <div style={{ borderRadius: '10px', overflow: 'hidden', margin: '8px 0', height: '160px' }}>
            <Map mapboxAccessToken={MAPBOX_TOKEN} {...mapViewState} onMove={(evt) => setMapViewState(evt.viewState)} mapStyle="mapbox://styles/mapbox/streets-v12" style={{ width: '100%', height: '100%' }}>
              {sourceCoords && <Marker longitude={sourceCoords.lng} latitude={sourceCoords.lat} color="#22c55e" />}
              {destCoords && <Marker longitude={destCoords.lng} latitude={destCoords.lat} color="#f97316" />}
            </Map>
          </div>

          {/* Favorite quick chips */}
          {favorites.length > 0 && (
            <div className="chips" style={{ marginBottom: 4 }}>
              {favorites.map(f => (
                <button key={f.id} className="chip" onClick={() => { setDestination(f.name); setDestCoords({ lat: f.lat, lng: f.lng }); }}>
                  ♥ {f.label}
                </button>
              ))}
            </div>
          )}

          <div className="chips">
            {sourceChips.map(chip => (
              <button key={chip.label} className="chip" onClick={() => { setSource(chip.label); setSourceCoords({ lat: chip.lat, lng: chip.lng }); }}>{chip.label}</button>
            ))}
          </div>
          <div className="chips">
            {destinationChips.map(chip => (
              <button key={chip.label} className="chip" onClick={() => { setDestination(chip.label); setDestCoords({ lat: chip.lat, lng: chip.lng }); }}>{chip.label}</button>
            ))}
          </div>

          <div className="action-dock">
            <button className="btn primary" onClick={findRides} disabled={!destination.trim()}>
              {scheduledFor ? 'Schedule Ride' : 'Find Reliable Rides'}
            </button>
          </div>
        </section>

        {/* ── RESULTS ── */}
        <section className={`screen ${screen === "results" && isHomeScreen ? "is-active" : ""}`} style={{ paddingBottom: showBottomNav ? 72 : undefined }}>

          {/* Route summary — always visible */}
          <div className="route-summary" style={{ marginBottom: booked ? 16 : undefined }}>
            <div className="route-pin source" /><div className="route-pin destination" /><div className="route-line" />
            <div className="route-text"><p>{source || "Current location"}</p><p>{destination || "Drop location"}</p></div>
          </div>

          {booked ? null : <>
          <p className="kicker">Top Ranked Options</p>
          <h2>Choose and book instantly</h2>
          {scheduledFor && (
            <div style={{ background: '#ede9fe', borderRadius: 8, padding: '6px 10px', marginBottom: 8, fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>
              📅 Scheduled: {new Date(scheduledFor).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
            </div>
          )}

          <div className="result-list">
            {isLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--ink-700)" }}>
                <p style={{ fontWeight: "bold" }}>Querying The Brain...</p>
                <small>Scoring providers for reliability</small>
              </div>
            ) : error ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--warn)" }}>
                <p>{error}</p>
                <button className="btn secondary" onClick={findRides}>Try Again</button>
              </div>
            ) : quotes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--ink-700)" }}>
                <p>No rides available right now.</p>
                <button className="btn secondary" onClick={() => setScreen("destination")}>Go Back</button>
              </div>
            ) : (
              quotes.map((item) => {
                const active = selectedRide?.id === item.id;
                const toneClass = getToneClass(item.tag);
                const tagLabel = getTagLabel(item.tag);
                const reliabilityPct = item.reliability ?? 0;
                const barColor = reliabilityPct >= 90 ? '#22c55e' : reliabilityPct >= 75 ? '#f59e0b' : '#ef4444';
                return (
                  <button className={`result-card ${toneClass} ${active ? "active" : ""}`} key={item.id} onClick={() => setSelectedRide(item)}>
                    {item.tag && (
                      <span className="tag" style={{
                        background: item.tag === 'BEST' ? '#dcfce7' : item.tag === 'CHEAPEST' ? '#dbeafe' : '#faf5ff',
                        color: item.tag === 'BEST' ? '#15803d' : item.tag === 'CHEAPEST' ? '#1d4ed8' : '#7c3aed',
                        border: `1px solid ${item.tag === 'BEST' ? '#86efac' : item.tag === 'CHEAPEST' ? '#93c5fd' : '#c4b5fd'}`,
                      }}>
                        {item.tag === 'BEST' ? '⚡ ' : item.tag === 'CHEAPEST' ? '💰 ' : '👑 '}{tagLabel}
                      </span>
                    )}
                    <div className="result-head">
                      <h3>{item.type || item.line}{item.provider ? ` via ${item.provider}` : ''}</h3>
                      <strong>₹{item.price}</strong>
                    </div>
                    <p className="result-meta">
                      ETA {item.eta} min
                      {item.surge && <span style={{ color: '#f59e0b', marginLeft: 6, fontSize: 11 }}>● Surge</span>}
                      {item.stations && ` • ${item.stations} stations`}
                    </p>
                    {item.reliability != null && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-600)', marginBottom: 3 }}>
                          <span>AI Reliability</span>
                          <span style={{ fontWeight: 700, color: barColor }}>{reliabilityPct}%</span>
                        </div>
                        <div style={{ height: 4, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${reliabilityPct}%`, height: '100%', background: barColor, borderRadius: 99, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    )}
                    {item.why && <p style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 6, lineHeight: 1.4, fontStyle: 'italic' }}>{item.why}</p>}
                    {item.score != null && (
                      <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--brand)', color: '#fff', borderRadius: 99, padding: '2px 7px', letterSpacing: '0.04em' }}>
                          MOVZZY {item.score}/100
                        </span>
                        {item.passApplied && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e', borderRadius: 99, padding: '2px 8px', border: '1px solid #fde68a' }}>
                            ✦ Pass {item.passPlan} −₹{item.passDiscountRupees}
                          </span>
                        )}
                      </div>
                    )}
                    {item.breakdown?.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={(e) => { e.stopPropagation(); setExpandedBreakdown(expandedBreakdown === item.id ? null : item.id); }}>
                          <span style={{ fontSize: 13 }}>ⓘ</span> Why this price?
                          <span style={{ fontSize: 10, marginLeft: 2 }}>{expandedBreakdown === item.id ? '▲' : '▼'}</span>
                        </button>
                        {expandedBreakdown === item.id && (
                          <div style={{ marginTop: 6, padding: '8px 10px', background: 'var(--surface-2, #f9fafb)', borderRadius: 8, fontSize: 12, color: 'var(--ink-700)' }}>
                            {item.baseFare != null && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--ink-500)' }}>
                                <span>Base fare</span><span>₹{item.baseFare}</span>
                              </div>
                            )}
                            {item.breakdown.map((b, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>{b.label}</span>
                                <span style={{ color: b.amountRupees > 0 ? '#f59e0b' : '#22c55e', fontWeight: 600 }}>
                                  {b.amountRupees > 0 ? `+₹${b.amountRupees}` : `-₹${Math.abs(b.amountRupees)}`}
                                </span>
                              </div>
                            ))}
                            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 4, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                              <span>Total</span><span>₹{item.price}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Promo code input */}
          {!booked && quotes.length > 0 && (
            <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
              <input
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoDiscount(null); setPromoError(''); }}
                placeholder="Promo code"
                style={{ flex: 1, padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, letterSpacing: '0.05em' }}
              />
              <button onClick={validatePromo} disabled={!promoCode.trim()} style={{
                padding: '7px 12px', background: '#1e63c9', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12,
              }}>Apply</button>
            </div>
          )}
          {promoDiscount && (
            <div style={{ background: '#dcfce7', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#15803d', fontWeight: 600, marginBottom: 6 }}>
              ✓ {promoDiscount.description} applied
            </div>
          )}
          {promoError && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>{promoError}</div>}

          <div className="action-dock">
            <button className="btn primary" onClick={bookRide} disabled={!selectedRide || booked || paymentPending}>
              {booked ? "Ride Booked ✓"
                : paymentPending ? "Processing Payment…"
                : promoDiscount
                  ? `Book for ₹${effectivePrice} (save ₹${promoDiscount.discountRupees})`
                  : `Book ${selectedRide?.type || selectedRide?.line || "Ride"} Now`}
            </button>
          </div>

          {paymentError && (
            <div className="booking-panel" style={{ borderLeft: '3px solid #ef4444' }}>
              <p style={{ color: '#ef4444', margin: 0 }}>Payment failed: {paymentError}</p>
            </div>
          )}
          </>}

          {booked && (
            <div className="booking-panel">
              {/* State badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: currentBooking?.state === 'CONFIRMED' || currentBooking?.state === 'IN_PROGRESS' ? '#22c55e'
                    : currentBooking?.state === 'FAILED' || currentBooking?.state === 'CANCELLED' ? '#ef4444' : '#f59e0b',
                  animation: (!currentBooking?.state || currentBooking?.state === 'SEARCHING') ? 'pulse 1.5s infinite' : 'none',
                }} />
                <strong style={{ fontSize: 13 }}>{currentBooking?.state || 'SEARCHING'}</strong>
                {currentBooking?.orchestrationStrategy && (
                  <span style={{ fontSize: 10, background: '#ede9fe', color: '#7c3aed', borderRadius: 99, padding: '2px 7px', fontWeight: 700 }}>
                    AI:{currentBooking.orchestrationStrategy}
                  </span>
                )}
              </div>

              <h4 style={{ margin: '0 0 4px' }}>
                {currentBooking?.state === 'COMPLETED' ? 'Ride completed'
                  : currentBooking?.state === 'FAILED' ? 'Booking failed'
                  : currentBooking?.state === 'CANCELLED' ? 'Booking cancelled'
                  : `${selectedRide?.type || selectedRide?.line || 'Your ride'} is on the way`}
              </h4>
              <span style={{ fontSize: 12, color: 'var(--ink-600)' }}>
                {currentBooking?.state === 'CONFIRMED' ? '✓ Driver assigned'
                  : currentBooking?.state === 'IN_PROGRESS' ? '🚗 En route to you'
                  : currentBooking?.state === 'COMPLETED' ? '✓ Trip complete — hope you enjoyed!'
                  : currentBooking?.state === 'FAILED' ? 'We could not find a driver. Please try again.'
                  : currentBooking?.state === 'CANCELLED' ? 'This booking was cancelled.'
                  : `Querying AI for reliable providers… • ETA ${selectedRide?.eta} min`}
              </span>

              {currentBooking?.aiReliabilityScore != null && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-500)' }}>
                  AI confidence: <strong style={{ color: '#22c55e' }}>{Math.round(currentBooking.aiReliabilityScore)}/100</strong>
                </div>
              )}

              {/* Driver card — shown when provider API returns driver details */}
              {currentBooking?.driverName && (
                <div style={{
                  marginTop: 10, background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 10, padding: '10px 12px', fontSize: 13,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>🚗 {currentBooking.driverName}</div>
                  {currentBooking.driverVehicle && (
                    <div style={{ color: 'var(--ink-600)', fontSize: 12 }}>{currentBooking.driverVehicle}</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    {currentBooking.driverEta != null && (
                      <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>
                        ETA: <strong style={{ color: '#15803d' }}>{currentBooking.driverEta} min</strong>
                      </span>
                    )}
                    {currentBooking.driverPhone && (
                      <a href={`tel:${currentBooking.driverPhone}`} style={{
                        color: '#15803d', fontWeight: 700, fontSize: 12, textDecoration: 'none',
                      }}>📞 Call Driver</a>
                    )}
                  </div>
                </div>
              )}

              {/* Section 2: Action buttons during active trip */}
              {(currentBooking?.state === 'CONFIRMED' || currentBooking?.state === 'IN_PROGRESS') && (
                <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {/* SOS */}
                  <button onClick={handleSOS} style={{
                    flex: 1, padding: '7px 6px', background: '#fee2e2', color: '#dc2626',
                    border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontWeight: 800, fontSize: 12,
                  }}>🆘 SOS</button>
                  {/* Chat */}
                  <button onClick={() => setShowChat(true)} style={{
                    flex: 1, padding: '7px 6px', background: '#dbeafe', color: '#1d4ed8',
                    border: '1px solid #93c5fd', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  }}>💬 Chat</button>
                  {/* Share */}
                  <button onClick={handleShare} style={{
                    flex: 1, padding: '7px 6px', background: '#f0fdf4', color: '#15803d',
                    border: '1px solid #bbf7d0', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  }}>🔗 Share</button>
                  {/* Split */}
                  <button onClick={() => setShowSplitPanel(s => !s)} style={{
                    flex: 1, padding: '7px 6px', background: '#fef3c7', color: '#92400e',
                    border: '1px solid #fde68a', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  }}>✂ Split</button>
                </div>
              )}

              {/* Split panel */}
              {showSplitPanel && (
                <div style={{ marginTop: 8, background: '#fef3c7', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Split fare with</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={splitParticipants} onChange={e => setSplitParticipants(parseInt(e.target.value))} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 13 }}>
                      {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} people</option>)}
                    </select>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      ₹{Math.ceil(rupees(currentBooking?.fareEstimate || selectedRide?.farePaise || 0) / splitParticipants)}/person
                    </span>
                    <button onClick={handleSplit} style={{ padding: '5px 10px', background: '#1e63c9', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                      Generate Link
                    </button>
                  </div>
                  {splitData && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#15803d', fontWeight: 600 }}>
                      ✓ Link copied! ₹{splitData.perPersonRupees}/person
                    </div>
                  )}
                </div>
              )}

              {shareUrl && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#15803d', background: '#f0fdf4', padding: '6px 8px', borderRadius: 6, fontWeight: 600 }}>
                  ✓ Share link copied to clipboard
                </div>
              )}

              {/* Receipt when completed */}
              {currentBooking?.state === 'COMPLETED' && (
                <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                  <button onClick={() => { setRatingBooking(currentBooking); }} style={{
                    flex: 1, padding: '8px', background: '#ede9fe', color: '#7c3aed',
                    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  }}>★ Rate Trip</button>
                  <button onClick={() => loadReceipt(currentBooking)} style={{
                    flex: 1, padding: '8px', background: '#f0fdf4', color: '#15803d',
                    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  }}>⬇ Receipt</button>
                </div>
              )}

              {/* Book new ride — shown when booking reached a terminal state */}
              {(currentBooking?.state === 'COMPLETED' || currentBooking?.state === 'FAILED' || currentBooking?.state === 'CANCELLED') && (
                <button
                  onClick={() => {
                    setBooked(false);
                    setSelectedRide(null);
                    setPromoCode('');
                    setPromoDiscount(null);
                    setScreen('destination');
                  }}
                  style={{
                    marginTop: 12, width: '100%', padding: '10px', background: 'var(--brand)',
                    color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
                    fontWeight: 700, fontSize: 14,
                  }}
                >
                  Book Another Ride
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── TRIPS TAB ── */}
        <TripsScreen
          isActive={activeTab === 'trips' && isAuthenticated}
          onRate={setRatingBooking}
          onReceipt={loadReceipt}
        />

        {/* ── WALLET TAB ── */}
        <WalletScreen
          isActive={activeTab === 'wallet' && isAuthenticated}
          onNotif={showNotif}
        />

        {/* ── PROFILE TAB ── */}
        <ProfileScreen
          isActive={activeTab === 'profile' && isAuthenticated}
          onNotif={showNotif}
          accessibilityMode={accessibilityMode}
          setAccessibilityMode={setAccessibilityMode}
        />

        {/* Bottom navigation */}
        {showBottomNav && (
          <BottomNav active={activeTab} onChange={tab => { setActiveTab(tab); if (tab === 'home' && screen === 'landing') setScreen('transport'); }} hasNotif={false} />
        )}
      </section>

      {/* Modals (outside phone-frame for fixed positioning) */}
      {ratingBooking && (
        <RatingModal
          booking={ratingBooking}
          onClose={() => setRatingBooking(null)}
          onNotif={showNotif}
        />
      )}
      {receiptData && (
        <ReceiptModal receipt={receiptData} onClose={() => setReceiptData(null)} />
      )}
    </main>
  );
}

// ─── Icons ────────────────────────────────────────────────

function CabIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Cab icon">
      <path d="M5 11h14v6H5z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 11l1.7-3h6.6l1.7 3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="8" cy="17" r="1.5" fill="currentColor" />
      <circle cx="16" cy="17" r="1.5" fill="currentColor" />
    </svg>
  );
}
function BikeIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Bike icon">
      <circle cx="7" cy="17" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17" cy="17" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 17l4-6h3l3 6M11 11l2-2" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function AutoIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Auto icon">
      <path d="M4.5 11h15v6h-15z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 11V8.5h6.5l2 2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="8" cy="17" r="1.5" fill="currentColor" />
      <circle cx="16" cy="17" r="1.5" fill="currentColor" />
    </svg>
  );
}
function MetroIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Metro icon">
      <rect x="6" y="4" width="12" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 8h2M13 8h2M9 12h6M10 18l-1.8 2M14 18l1.8 2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default App;
