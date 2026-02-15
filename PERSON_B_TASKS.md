# 🎨 Person B: Frontend Engineer - Task List

Your complete 4-week roadmap with checkboxes and code examples.

---

## 📊 Overview

**Role:** Frontend Engineer  
**Focus:** UI/UX, React Components, API Integration, User Experience  
**Total Hours:** 80 hours (20 hours/week)  
**Timeline:** 4 weeks

---

# WEEK 1: Setup & API Integration

## Day 1-2: Setup & API Layer (8 hours)

### ✅ Task 1.1: Development Environment (1 hour)

- [ ] Clone repository
- [ ] Install dependencies
- [ ] Start development server

```bash
cd MOVZZ  # or cd frontend
npm install
npm run dev
```

- [ ] Verify app loads at http://localhost:5173
- [ ] Review existing code structure

---

### ✅ Task 1.2: Create API Service Layer (4 hours)

- [ ] Create API configuration file

**File:** `src/config/api.js`

```javascript
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  timeout: 10000,
};

export const ENDPOINTS = {
  // Auth
  SEND_OTP: '/auth/send-otp',
  VERIFY_OTP: '/auth/verify-otp',
  REFRESH_TOKEN: '/auth/refresh-token',
  GET_ME: '/auth/me',
  
  // Bookings
  SEARCH_RIDES: '/bookings/search',
  CREATE_BOOKING: '/bookings/create',
  GET_BOOKINGS: '/bookings',
  GET_BOOKING: (id) => `/bookings/${id}`,
  CANCEL_BOOKING: (id) => `/bookings/${id}/cancel`,
  
  // Providers
  GET_PROVIDERS: '/providers/available',
  COMPARE_PROVIDERS: '/providers/compare',
  
  // Users
  GET_PROFILE: '/users/profile',
  UPDATE_PROFILE: '/users/profile',
  GET_SAVED_LOCATIONS: '/users/saved-locations',
  ADD_SAVED_LOCATION: '/users/saved-locations',
  DELETE_SAVED_LOCATION: (id) => `/users/saved-locations/${id}`,
};
```

- [ ] Create API service

**File:** `src/services/api.js`

```javascript
import { API_CONFIG, ENDPOINTS } from '../config/api';

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
  }

  // Helper method for making requests
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('accessToken');

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth APIs
  async sendOTP(phone) {
    return this.request(ENDPOINTS.SEND_OTP, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOTP(phone, code) {
    return this.request(ENDPOINTS.VERIFY_OTP, {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  }

  async getCurrentUser() {
    return this.request(ENDPOINTS.GET_ME);
  }

  // Booking APIs
  async searchRides(params) {
    return this.request(ENDPOINTS.SEARCH_RIDES, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async createBooking(data) {
    return this.request(ENDPOINTS.CREATE_BOOKING, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBookings(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`${ENDPOINTS.GET_BOOKINGS}?${query}`);
  }

  async getBooking(id) {
    return this.request(ENDPOINTS.GET_BOOKING(id));
  }

  async cancelBooking(id, reason) {
    return this.request(ENDPOINTS.CANCEL_BOOKING(id), {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  // User APIs
  async getProfile() {
    return this.request(ENDPOINTS.GET_PROFILE);
  }

  async updateProfile(data) {
    return this.request(ENDPOINTS.UPDATE_PROFILE, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getSavedLocations() {
    return this.request(ENDPOINTS.GET_SAVED_LOCATIONS);
  }

  async addSavedLocation(data) {
    return this.request(ENDPOINTS.ADD_SAVED_LOCATION, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSavedLocation(id) {
    return this.request(ENDPOINTS.DELETE_SAVED_LOCATION(id), {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
```

- [ ] Test API service with Postman collection from Person A

---

### ✅ Task 1.3: Authentication State Management (3 hours)

- [ ] Create auth context

**File:** `src/contexts/AuthContext.jsx`

```javascript
import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const response = await api.getCurrentUser();
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        logout();
      }
    }
    setLoading(false);
  };

  const login = async (phone, code) => {
    try {
      const response = await api.verifyOTP(phone, code);
      const { user, accessToken, refreshToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

- [ ] Wrap app with AuthProvider

**File:** `src/main.jsx`

```javascript
import { AuthProvider } from './contexts/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

---

## Day 3-5: Component Integration (12 hours)

### ✅ Task 1.4: Connect Login Screen (3 hours)

- [ ] Update login component to use real API

**File:** `src/components/Login.jsx` (update existing)

```javascript
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const Login = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.sendOTP(phone);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(phone, otp);
      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {step === 'phone' ? (
        <form onSubmit={handleSendOTP}>
          <h2>Enter Phone Number</h2>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP}>
          <h2>Enter OTP</h2>
          <p>Sent to {phone}</p>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            maxLength={6}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button type="button" onClick={() => setStep('phone')}>
            Change Number
          </button>
        </form>
      )}
    </div>
  );
};

export default Login;
```

- [ ] Test login flow end-to-end
- [ ] Handle errors gracefully
- [ ] Add loading states

---

### ✅ Task 1.5: Replace Mock Ride Data (4 hours)

- [ ] Update ride search to use real API

**File:** `src/App.jsx` (update search function)

```javascript
const [rides, setRides] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const searchRides = async () => {
  if (!pickup || !drop) {
    setError('Please select pickup and drop locations');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const response = await api.searchRides({
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropLat: drop.lat,
      dropLng: drop.lng,
      pickupAddress: pickup.address,
      dropAddress: drop.address,
      vehicleTypes: selectedVehicleTypes, // ['cab', 'bike', 'auto']
    });

    setRides(response.data.rides);
    setDistance(response.data.distance);
  } catch (err) {
    setError(err.message || 'Failed to search rides');
    console.error('Search error:', err);
  } finally {
    setLoading(false);
  }
};
```

- [ ] Add loading skeleton
- [ ] Show error messages
- [ ] Display real ride options

---

### ✅ Task 1.6: Implement Booking Creation (3 hours)

- [ ] Create booking when user selects ride

```javascript
const handleBookRide = async (selectedRide) => {
  setLoading(true);
  setError(null);

  try {
    const response = await api.createBooking({
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropLat: drop.lat,
      dropLng: drop.lng,
      pickupAddress: pickup.address,
      dropAddress: drop.address,
      provider: selectedRide.provider,
      vehicleType: selectedRide.vehicleType,
      rideType: selectedRide.rideType,
      estimatedPrice: selectedRide.estimatedPrice,
      paymentMethod: 'cash', // or selected payment method
    });

    const booking = response.data;
    
    // Navigate to booking details
    setCurrentScreen('booking-details');
    setCurrentBooking(booking);
  } catch (err) {
    setError(err.message || 'Failed to create booking');
  } finally {
    setLoading(false);
  }
};
```

- [ ] Show booking confirmation
- [ ] Handle booking errors
- [ ] Navigate to tracking screen

---

### ✅ Task 1.7: Add Loading States (2 hours)

- [ ] Create loading components

**File:** `src/components/LoadingStates.jsx`

```javascript
export const SkeletonRideCard = () => (
  <div className="skeleton-ride-card">
    <div className="skeleton-icon"></div>
    <div className="skeleton-text"></div>
    <div className="skeleton-price"></div>
  </div>
);

export const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Loading...</p>
  </div>
);

export const SearchingRides = () => (
  <div className="searching-animation">
    <div className="pulse-circle"></div>
    <p>Searching for best rides...</p>
  </div>
);
```

- [ ] Add CSS animations
- [ ] Use throughout app
- [ ] Test on slow connections

---

# WEEK 2: Payment & Real-time Features

## Day 1-2: Payment Integration (8 hours)

### ✅ Task 2.1: Razorpay Setup (2 hours)

- [ ] Install Razorpay SDK

```bash
npm install razorpay
```

- [ ] Add Razorpay script to index.html

**File:** `index.html`

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

- [ ] Create payment service

**File:** `src/services/payment.js`

```javascript
import { api } from './api';

export const initiatePayment = async (bookingId, amount) => {
  try {
    // Create order on backend
    const orderResponse = await api.createPaymentOrder(bookingId, amount);
    const { orderId, keyId } = orderResponse.data;

    // Open Razorpay checkout
    return new Promise((resolve, reject) => {
      const options = {
        key: keyId,
        amount: amount * 100,
        currency: 'INR',
        name: 'MOVZZ',
        description: 'Ride Payment',
        order_id: orderId,
        handler: async (response) => {
          try {
            // Verify payment on backend
            const verifyResponse = await api.verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            resolve(verifyResponse);
          } catch (error) {
            reject(error);
          }
        },
        prefill: {
          contact: user.phone,
          email: user.email,
        },
        theme: {
          color: '#2D7FF9',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        reject(new Error(response.error.description));
      });
      rzp.open();
    });
  } catch (error) {
    throw error;
  }
};
```

---

### ✅ Task 2.2: Payment UI Component (4 hours)

- [ ] Create payment modal

**File:** `src/components/PaymentModal.jsx`

```javascript
import { useState } from 'react';
import { initiatePayment } from '../services/payment';

const PaymentModal = ({ booking, onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

  const handlePayment = async () => {
    if (paymentMethod === 'cash') {
      onSuccess();
      return;
    }

    setLoading(true);
    setError('');

    try {
      await initiatePayment(booking.id, booking.estimatedPrice);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-modal">
      <div className="modal-content">
        <h2>Payment</h2>
        
        <div className="booking-summary">
          <p>From: {booking.pickupAddress}</p>
          <p>To: {booking.dropAddress}</p>
          <p className="amount">₹{booking.estimatedPrice}</p>
        </div>

        <div className="payment-methods">
          <label>
            <input
              type="radio"
              value="razorpay"
              checked={paymentMethod === 'razorpay'}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            Pay Online (Card/UPI/Wallet)
          </label>
          
          <label>
            <input
              type="radio"
              value="cash"
              checked={paymentMethod === 'cash'}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            Cash on Delivery
          </label>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button onClick={handlePayment} disabled={loading}>
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
```

- [ ] Style payment modal
- [ ] Test with Razorpay test cards
- [ ] Handle payment success/failure

---

### ✅ Task 2.3: Payment Flow Integration (2 hours)

- [ ] Integrate payment into booking flow
- [ ] Show payment modal after booking creation
- [ ] Navigate to tracking after payment

---

## Day 3-5: Real-time Features (12 hours)

### ✅ Task 2.4: WebSocket Setup (3 hours)

- [ ] Install Socket.io client

```bash
npm install socket.io-client
```

- [ ] Create WebSocket service

**File:** `src/services/socket.js`

```javascript
import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(userId) {
    if (this.socket?.connected) return;

    this.socket = io('http://localhost:5000', {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.socket.emit('join', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (!this.socket) return;
    
    this.socket.on(event, callback);
    
    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  emit(event, data) {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }

  joinBooking(bookingId) {
    this.emit('join-booking', bookingId);
  }
}

export const socketService = new SocketService();
```

---

### ✅ Task 2.5: Live Tracking Screen (6 hours)

- [ ] Create tracking component

**File:** `src/components/LiveTracking.jsx`

```javascript
import { useState, useEffect } from 'react';
import { socketService } from '../services/socket';
import { api } from '../services/api';

const LiveTracking = ({ bookingId }) => {
  const [booking, setBooking] = useState(null);
  const [driver, setDriver] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [status, setStatus] = useState('PENDING');

  useEffect(() => {
    loadBooking();
    setupWebSocket();

    return () => {
      // Cleanup
      socketService.off('booking:updated');
      socketService.off('driver:assigned');
      socketService.off('driver:location');
      socketService.off('eta:updated');
    };
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      const response = await api.getBooking(bookingId);
      setBooking(response.data);
      setStatus(response.data.status);
    } catch (error) {
      console.error('Failed to load booking:', error);
    }
  };

  const setupWebSocket = () => {
    socketService.joinBooking(bookingId);

    socketService.on('booking:updated', (data) => {
      console.log('Booking updated:', data);
      setStatus(data.status);
    });

    socketService.on('driver:assigned', (data) => {
      console.log('Driver assigned:', data);
      setDriver(data.driver);
      setDriverLocation(data.driver.location);
      setStatus('DRIVER_ASSIGNED');
    });

    socketService.on('driver:location', (data) => {
      console.log('Driver location:', data);
      setDriverLocation(data.location);
    });

    socketService.on('eta:updated', (data) => {
      console.log('ETA updated:', data);
      setEta(data.eta);
    });
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'PENDING':
        return 'Confirming your booking...';
      case 'SEARCHING':
        return 'Finding a driver for you...';
      case 'DRIVER_ASSIGNED':
        return 'Driver assigned!';
      case 'DRIVER_ARRIVED':
        return 'Driver has arrived';
      case 'IN_PROGRESS':
        return 'Trip in progress';
      case 'COMPLETED':
        return 'Trip completed';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="live-tracking">
      <div className="status-header">
        <h2>{getStatusMessage()}</h2>
        {eta && <p className="eta">ETA: {Math.ceil(eta / 60)} minutes</p>}
      </div>

      {driver && (
        <div className="driver-card">
          <div className="driver-info">
            <h3>{driver.name}</h3>
            <p>⭐ {driver.rating}</p>
            <p>{driver.vehicle.model}</p>
            <p>{driver.vehicle.number}</p>
          </div>
          <a href={`tel:${driver.phone}`} className="call-button">
            📞 Call Driver
          </a>
        </div>
      )}

      <div className="map-container">
        {/* TODO: Add Google Maps with driver location */}
        <div className="map-placeholder">
          <p>Map showing driver location</p>
          {driverLocation && (
            <p>
              Lat: {driverLocation.lat.toFixed(4)}, 
              Lng: {driverLocation.lng.toFixed(4)}
            </p>
          )}
        </div>
      </div>

      <div className="trip-details">
        <div className="location">
          <span className="icon">📍</span>
          <div>
            <p className="label">Pickup</p>
            <p className="address">{booking?.pickupAddress}</p>
          </div>
        </div>
        <div className="location">
          <span className="icon">🎯</span>
          <div>
            <p className="label">Drop</p>
            <p className="address">{booking?.dropAddress}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;
```

- [ ] Add map integration (Google Maps)
- [ ] Show driver marker on map
- [ ] Update driver position in real-time
- [ ] Style tracking screen

---

### ✅ Task 2.6: Status Updates UI (3 hours)

- [ ] Create status timeline component
- [ ] Show booking progress
- [ ] Add animations for status changes

---

# WEEK 3: User Features & Polish

## Day 1-3: User Experience Features (12 hours)

### ✅ Task 3.1: Saved Locations (4 hours)

- [ ] Create saved locations screen

**File:** `src/components/SavedLocations.jsx`

```javascript
import { useState, useEffect } from 'react';
import { api } from '../services/api';

const SavedLocations = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const response = await api.getSavedLocations();
      setLocations(response.data);
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async (location) => {
    try {
      await api.addSavedLocation(location);
      loadLocations();
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add location:', error);
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!confirm('Delete this location?')) return;

    try {
      await api.deleteSavedLocation(id);
      loadLocations();
    } catch (error) {
      console.error('Failed to delete location:', error);
    }
  };

  return (
    <div className="saved-locations">
      <h2>Saved Locations</h2>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="locations-list">
          {locations.map((loc) => (
            <div key={loc.id} className="location-card">
              <div className="location-info">
                <h3>{loc.label}</h3>
                <p>{loc.address}</p>
              </div>
              <button onClick={() => handleDeleteLocation(loc.id)}>
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setShowAddModal(true)}>
        + Add Location
      </button>

      {showAddModal && (
        <AddLocationModal
          onAdd={handleAddLocation}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};

export default SavedLocations;
```

---

### ✅ Task 3.2: Booking History (4 hours)

- [ ] Create booking history screen
- [ ] Show past bookings
- [ ] Add filters (status, date)
- [ ] Implement pagination

---

### ✅ Task 3.3: User Profile (4 hours)

- [ ] Create profile screen
- [ ] Edit profile form
- [ ] Update profile picture
- [ ] Logout functionality

---

## Day 4-5: Polish & Optimization (8 hours)

### ✅ Task 3.4: Performance Optimization (4 hours)

- [ ] Code splitting
- [ ] Lazy loading components
- [ ] Image optimization
- [ ] Bundle size reduction

```javascript
// Lazy load heavy components
const LiveTracking = lazy(() => import('./components/LiveTracking'));
const BookingHistory = lazy(() => import('./components/BookingHistory'));
```

---

### ✅ Task 3.5: Responsive Design (2 hours)

- [ ] Test on mobile devices
- [ ] Fix layout issues
- [ ] Optimize for tablets
- [ ] Test on different screen sizes

---

### ✅ Task 3.6: Accessibility (2 hours)

- [ ] Add ARIA labels
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Color contrast check

---

# WEEK 4: Testing & Deployment

## Day 1-2: Production Build (8 hours)

### ✅ Task 4.1: Build Optimization (4 hours)

- [ ] Optimize production build
- [ ] Analyze bundle size
- [ ] Remove unused code
- [ ] Minify assets

```bash
npm run build
npm run analyze  # if available
```

---

### ✅ Task 4.2: Environment Configuration (2 hours)

- [ ] Set up environment variables
- [ ] Configure production API URL
- [ ] Add Razorpay production keys
- [ ] Configure Google Maps API

**File:** `.env.production`

```env
VITE_API_URL=https://api.movzz.com/api/v1
VITE_RAZORPAY_KEY=rzp_live_xxxxx
VITE_GOOGLE_MAPS_KEY=your_production_key
```

---

### ✅ Task 4.3: Deploy Frontend (2 hours)

**Option 1: Vercel**
```bash
npm install -g vercel
vercel --prod
```

**Option 2: Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

- [ ] Configure custom domain
- [ ] Enable HTTPS
- [ ] Set up redirects

---

## Day 3-5: Testing & Launch (12 hours)

### ✅ Task 4.4: User Testing (6 hours)

- [ ] Recruit 5-10 beta testers
- [ ] Create test scenarios
- [ ] Collect feedback
- [ ] Fix critical bugs

**Test Scenarios:**
1. Complete booking flow
2. Payment with different methods
3. Real-time tracking
4. Saved locations
5. Profile management

---

### ✅ Task 4.5: Final Polish (4 hours)

- [ ] Fix UI bugs
- [ ] Improve animations
- [ ] Add loading states
- [ ] Polish error messages

---

### ✅ Task 4.6: Launch Preparation (2 hours)

- [ ] Create demo video
- [ ] Take screenshots
- [ ] Write launch announcement
- [ ] Prepare social media posts

---

# 📊 Progress Tracking

## Week 1
- [ ] API service layer complete
- [ ] Authentication working
- [ ] Ride search with real data
- [ ] Booking creation working

## Week 2
- [ ] Payment integration complete
- [ ] WebSocket connected
- [ ] Live tracking screen
- [ ] Real-time updates working

## Week 3
- [ ] Saved locations feature
- [ ] Booking history
- [ ] User profile
- [ ] Performance optimized

## Week 4
- [ ] Production build ready
- [ ] Frontend deployed
- [ ] Beta testing complete
- [ ] Ready to launch

---

**Total Tasks:** 45+  
**Estimated Hours:** 80 hours  
**Timeline:** 4 weeks  

**You got this! 💪**
