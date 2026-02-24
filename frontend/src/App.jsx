import React, { useEffect, useState } from "react";
import { useBookingStore } from './stores/bookingStore';

const transportModes = [
  { id: "cab", label: "Cab", icon: CabIcon, desc: "Doorstep comfort and AC ride" },
  { id: "bike", label: "Bike Taxi", icon: BikeIcon, desc: "Fastest for tight city lanes" },
  { id: "auto", label: "Auto", icon: AutoIcon, desc: "Balanced fare with quick pickup" },
  { id: "metro", label: "Metro", icon: MetroIcon, desc: "Most predictable commute window" }
];

const destinationChips = ["Chennai Airport T1", "T Nagar", "OMR Tech Park", "Guindy"];
const sourceChips = ["Pacifica Aurum 1 Block-B5", "Anna Nagar", "Velachery"];
const laneLabels = ["Cab", "Bike", "Auto", "Metro", "Reliable", "Parallel", "Safe ETA"];

const screens = ["landing", "auth", "transport", "destination", "results"];

function App() {
  const [screen, setScreen] = useState("landing");
  const [authTab, setAuthTab] = useState("signin");
  const [transport, setTransport] = useState("cab");
  const [source, setSource] = useState("Pacifica Aurum 1 Block-B5");
  const [destination, setDestination] = useState("");
  const [selectedRide, setSelectedRide] = useState(null);
  const [booked, setBooked] = useState(false);

  // Hook into our backend data store!
  const { quotes, isLoading, error, fetchQuotes, createBooking } = useBookingStore();

  // Reset selected ride when quotes change
  useEffect(() => {
    if (quotes && quotes.length > 0) {
      setSelectedRide(quotes[0]);
    } else {
      setSelectedRide(null);
    }
  }, [quotes]);

  function moveTo(next) {
    if (!screens.includes(next)) return;
    if (next === "results") {
      setBooked(false);
    }
    setScreen(next);
  }

  async function findRides() {
    if (!destination.trim()) return;
    setBooked(false);
    setScreen("results");
    
    // Fetch real data from the backend!
    await fetchQuotes(source, destination, transport);
  }

  async function bookRide() {
    if (!selectedRide) return;
    
    // Call the backend to create the booking!
    const success = await createBooking(source, destination);
    
    // If the database successfully creates the ride, show the success panel
    if (success) {
      setBooked(true);
    }
  }
  
  return (
    <main className="app-shell">
      <section className="phone-frame">
        <header className="status-row">
          <span>9:41</span>
          <span>MOVZZ</span>
          <span>5G</span>
        </header>

        <section className={`screen landing-screen ${screen === "landing" ? "is-active" : ""}`}>
          <div className="landing-content">
            <div className="landing-topline" />
            <div className="brand-mark">
              <span>MOV</span>
              <span>ZZ</span>
            </div>
            <p className="kicker">Reliability-Orchestrated Mobility</p>
            <h1>Your ride should feel certain before it starts.</h1>
            <p className="copy">
              MOVZZ ranks transport options by completion confidence, dispatch speed, and fair pricing.
            </p>
            <div className="landing-editorial">
              <h3>Why MOVZZ</h3>
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
                {[...laneLabels, ...laneLabels].map((label, idx) => (
                  <span key={`${label}-${idx}`}>{label}</span>
                ))}
              </div>
            </div>
            <div className="landing-cards">
              <article>
                <strong>94%</strong>
                <span>Avg reliability score</span>
              </article>
              <article>
                <strong>3x</strong>
                <span>Parallel provider checks</span>
              </article>
              <article>
                <strong>&lt;30s</strong>
                <span>Recovery re-attempt cycle</span>
              </article>
            </div>
            <div className="action-dock">
              <button className="btn primary" onClick={() => moveTo("auth")}>Start Ride</button>
            </div>
          </div>
        </section>

        <section className={`screen ${screen === "auth" ? "is-active" : ""}`}>
          <p className="kicker">Authentication</p>
          <h2>Sign in to MOVZZ</h2>
          <p className="copy">Secure access with enterprise-grade onboarding flow.</p>

          <div className="auth-tabs">
            <button
              className={`tab ${authTab === "signin" ? "active" : ""}`}
              onClick={() => setAuthTab("signin")}
            >
              Sign In
            </button>
            <button
              className={`tab ${authTab === "signup" ? "active" : ""}`}
              onClick={() => setAuthTab("signup")}
            >
              Sign Up
            </button>
          </div>

          <label className="field">
            <span>{authTab === "signin" ? "Email" : "Work Email"}</span>
            <input type="email" placeholder="name@company.com" />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" placeholder="••••••••" />
          </label>

          <div className="stack">
            <button className="btn provider">Continue with Google</button>
            <button className="btn provider">Continue with Apple</button>
            <button className="btn provider">Continue with Phone Number</button>
          </div>

          <div className="action-dock">
            <button className="btn primary" onClick={() => moveTo("transport")}>Continue</button>
          </div>
        </section>

        <section className={`screen ${screen === "transport" ? "is-active" : ""}`}>
          <p className="kicker">Step 1</p>
          <h2>Select transport mode</h2>
          <p className="copy">Vertical selection with lane-specific orchestration intelligence.</p>

          <div className="mode-list">
            {transportModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  className={`mode-item ${transport === mode.id ? "selected" : ""}`}
                  onClick={() => setTransport(mode.id)}
                >
                  <span className="mode-icon">
                    <Icon />
                  </span>
                  <span className="mode-copy">
                    <strong>{mode.label}</strong>
                    <small>{mode.desc}</small>
                  </span>
                  <span className="mode-check" aria-hidden="true">{transport === mode.id ? "●" : "○"}</span>
                </button>
              );
            })}
          </div>

          <div className="action-dock">
            <button className="btn primary" onClick={() => moveTo("destination")}>Next</button>
          </div>
        </section>

        <section className={`screen ${screen === "destination" ? "is-active" : ""}`}>
          <p className="kicker">Step 2</p>
          <h2>Set pickup and destination</h2>
          <p className="copy">MOVZZ will return ranked options with reliability rationale.</p>

          <div className="route-editor">
            <div className="route-pin source" />
            <div className="route-pin destination" />
            <div className="route-line" />
            <div className="route-fields">
              <label className="field compact">
                <span>Pickup</span>
                <input
                  type="text"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="Current location"
                />
              </label>
              <label className="field compact">
                <span>Drop location</span>
                <input
                  type="text"
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="Terminal 1, Chennai Airport"
                />
              </label>
            </div>
          </div>

          <div className="chips">
            {sourceChips.map((chip) => (
              <button key={chip} className="chip" onClick={() => setSource(chip)}>
                {chip}
              </button>
            ))}
          </div>
          <div className="chips">
            {destinationChips.map((chip) => (
              <button key={chip} className="chip" onClick={() => setDestination(chip)}>
                {chip}
              </button>
            ))}
          </div>

          <div className="action-dock">
            <button className="btn primary" onClick={findRides} disabled={!destination.trim()}>
              Find Reliable Rides
            </button>
          </div>
        </section>

        <section className={`screen ${screen === "results" ? "is-active" : ""}`}>
          <p className="kicker">Top Ranked Options</p>
          <h2>Choose and book instantly</h2>

          <div className="route-summary">
            <div className="route-pin source" />
            <div className="route-pin destination" />
            <div className="route-line" />
            <div className="route-text">
              <p>{source || "Current location"}</p>
              <p>{destination || "Drop location"}</p>
            </div>
          </div>

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
                // Map the backend tag to the CSS classes
                const toneClass = item.tag === 'Cheapest' ? 'cheap' : item.tag === 'Premium' ? 'high' : 'best';
                
                return (
                  <button
                    className={`result-card ${toneClass} ${active ? "active" : ""}`}
                    key={item.id}
                    onClick={() => setSelectedRide(item)}
                  >
                    {item.tag && <span className="tag">{item.tag}</span>}
                    <div className="result-head">
                      <h3>{item.type || item.line} {item.provider ? `via ${item.provider}` : ''}</h3>
                      <strong>Rs {item.price}</strong>
                    </div>
                    <p className="result-meta">
                      {item.reliability ? `Reliability ${item.reliability}%` : `${item.stations} stations`} • ETA {item.eta} min
                    </p>
                    {item.score && (
                      <p className="reason">Match Score: {item.score}/100</p>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="action-dock">
            <button className="btn primary" onClick={bookRide} disabled={!selectedRide || booked}>
              {booked ? "Ride Booked" : `Book ${selectedRide?.type || selectedRide?.line || "Ride"} Now`}
            </button>
          </div>

          {booked && (
            <div className="booking-panel">
              <p>Confirmed</p>
              <h4>{selectedRide?.type || selectedRide?.line} is on the way</h4>
              <span>{selectedRide?.provider ? `Driver assigned (${selectedRide?.provider})` : `Metro route confirmed`} • ETA {selectedRide?.eta} min • Live tracking enabled</span>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

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