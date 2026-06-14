import React, { useState, useEffect, useMemo } from 'react';
import { 
  Gamepad2, CalendarCheck, Clock, ShieldCheck, Truck, MessageSquare, 
  ChevronRight, Calendar, Info, X, Check, CheckCircle2, Lock, Tag 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp 
} from 'firebase/firestore';

// --- Firebase Initialization ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "mock-key", projectId: "mock-project"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'apex-gaming-default';

export default function App() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '', // Added Address Field
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '15:00',
    duration: '5 Hours'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [availabilityDate, setAvailabilityDate] = useState(new Date().toISOString().split('T')[0]);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [originalPrice, setOriginalPrice] = useState(0);

  // Calculate today's date in YYYY-MM-DD format for the 'min' attribute
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Pricing Data (Numbers instead of strings for calculation)
  const pricingData = {
    special: { '1 Hour': 100, '5 Hours': 450, '10 Hours': 800 },
    normal: { '1 Hour': 150, '5 Hours': 500, '10 Hours': 950 },
    daily: { '1 Day': 1150, '2 Days': 1750, '3 Days': 2500, '1 Week': 3500 }
  };

  // Helper to determine if a date is Wed or Fri
  const isSpecialDay = (dateString) => {
    if (!dateString) return false;
    const dayOfWeek = new Date(dateString).getDay();
    return dayOfWeek === 3 || dayOfWeek === 5; // 3 = Wednesday, 5 = Friday
  };

  // Calculate Price Effect
  useEffect(() => {
    let price = 0;
    let normal = 0;
    const duration = formData.duration;
    
    if (duration.includes('Day') || duration.includes('Week')) {
      price = pricingData.daily[duration] || 0;
      normal = price;
    } else {
      normal = pricingData.normal[duration] || 0;
      // It's an hourly plan. Check if the date qualifies for the special rate.
      if (isSpecialDay(formData.date)) {
        price = pricingData.special[duration] || 0;
      } else {
        price = normal;
      }
    }
    setCalculatedPrice(price);
    setOriginalPrice(normal);
  }, [formData.duration, formData.date]);

  // Auto-calculate End Time based on Start Time and Duration
  useEffect(() => {
    if (!formData.startTime || !formData.duration) return;

    const [hoursStr, minutesStr] = formData.startTime.split(':');
    let startHours = parseInt(hoursStr, 10);
    const startMinutes = parseInt(minutesStr, 10);

    let hoursToAdd = 0;
    const duration = formData.duration;

    if (duration === '1 Hour') hoursToAdd = 1;
    else if (duration === '5 Hours') hoursToAdd = 5;
    else if (duration === '10 Hours') hoursToAdd = 10;
    else if (duration.includes('Day') || duration.includes('Week')) {
      // For multi-day or week, the end time is typically the same time of day on the end date.
      // We don't automatically update the date here, but we'll set the end time to be the same as the start time.
      hoursToAdd = 0; 
    }

    if (hoursToAdd > 0 || duration.includes('Day') || duration.includes('Week')) {
      let endHours = startHours + hoursToAdd;
      
      // Handle crossing midnight (e.g., starting at 10 PM + 5 hours = 3 AM)
      endHours = endHours % 24;

      const formattedEndHours = String(endHours).padStart(2, '0');
      const formattedEndMinutes = String(startMinutes).padStart(2, '0');
      
      setFormData(prev => ({ ...prev, endTime: `${formattedEndHours}:${formattedEndMinutes}` }));
    }
  }, [formData.startTime, formData.duration]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error('Auth error:', error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const bookingsRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
    const unsubscribe = onSnapshot(bookingsRef, 
      (snapshot) => {
        const fetchedBookings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        fetchedBookings.sort((a, b) => new Date(a.date) - new Date(b.date));
        setBookings(fetchedBookings);
      },
      (error) => {
        console.error("Error fetching bookings:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      const bookingsRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
      await addDoc(bookingsRef, {
        userId: user.uid,
        ...formData,
        calculatedPrice,
        status: 'Pending',
        createdAt: serverTimestamp()
      });

      // Prepare WhatsApp Message
      const businessPhone = "917736689545";
      const message = `*New Booking Request - Apex Gaming Rentals*%0A%0A` +
        `*Name:* ${formData.name}%0A` +
        `*Phone:* ${formData.phone}%0A` +
        `*Address:* ${formData.address}%0A` +
        `*Date:* ${formData.date}%0A` +
        `*Start Time:* ${formatTime12Hr(formData.startTime)}%0A` +
        `*End Time:* ${formatTime12Hr(formData.endTime)}%0A` +
        `*Duration:* ${formData.duration}%0A` +
        `*Total Price:* ₹${calculatedPrice}%0A%0A` +
        `_Sent from Website_`;

      const whatsappUrl = `https://wa.me/${businessPhone}?text=${message}`;
      
      setBookingSuccess(true);
      // Reset form
      setFormData({
        name: '', phone: '', address: '', date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '15:00', duration: '5 Hours'
      });
      
      // Open WhatsApp in new tab
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        setIsSubmitting(false);
        setTimeout(() => setBookingSuccess(false), 5000);
      }, 1000);

    } catch (error) {
      console.error("Booking Error:", error);
      setIsSubmitting(false);
    }
  };

  const updateBookingStatus = async (id, newStatus) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'bookings', id);
      await updateDoc(docRef, { status: newStatus });
    } catch (error) {
      console.error("Status Update Error:", error);
    }
  };

  const formatTime12Hr = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const getDayBookings = useMemo(() => {
    return bookings.filter(b => b.date === availabilityDate && b.status === 'Approved');
  }, [bookings, availabilityDate]);

  if (isAdminView) {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
            <h1 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
              <ShieldCheck /> Admin Dashboard
            </h1>
            <button 
              onClick={() => setIsAdminView(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
            >
              Exit Admin
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stats Column */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <h3 className="text-slate-400 font-medium mb-1">Total Requests</h3>
                <p className="text-4xl font-bold">{bookings.length}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <h3 className="text-slate-400 font-medium mb-1">Pending Approval</h3>
                <p className="text-4xl font-bold text-yellow-500">
                  {bookings.filter(b => b.status === 'Pending').length}
                </p>
              </div>
            </div>

            {/* Bookings List */}
            <div className="md:col-span-2 space-y-4">
              <h2 className="text-xl font-semibold mb-4">All Bookings</h2>
              {bookings.length === 0 ? (
                <div className="text-slate-500 p-8 text-center bg-slate-900 rounded-xl border border-slate-800">
                  No bookings found.
                </div>
              ) : (
                [...bookings].reverse().map((booking) => (
                  <div key={booking.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{booking.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          booking.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' :
                          booking.status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm mb-1">📞 {booking.phone}</p>
                      <p className="text-slate-400 text-sm mb-1">📍 {booking.address}</p>
                      <p className="text-slate-300 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-cyan-400" /> {booking.date}
                      </p>
                      <p className="text-slate-300 text-sm flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4 text-cyan-400" /> 
                        {formatTime12Hr(booking.startTime)} - {formatTime12Hr(booking.endTime)} ({booking.duration})
                      </p>
                      <p className="text-cyan-400 text-sm font-bold mt-2">
                        Total: ₹{booking.calculatedPrice}
                      </p>
                    </div>
                    
                    <div className="flex sm:flex-col gap-2 justify-center">
                      {booking.status === 'Pending' && (
                        <>
                          <button 
                            onClick={() => updateBookingStatus(booking.id, 'Approved')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => updateBookingStatus(booking.id, 'Rejected')}
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {booking.status === 'Approved' && (
                        <button 
                            onClick={() => updateBookingStatus(booking.id, 'Pending')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors"
                          >
                            Revert to Pending
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-cyan-900/30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-8 h-8 text-cyan-400" />
            <span className="text-xl font-bold tracking-tight text-white">APEX <span className="text-cyan-400">GAMING</span></span>
          </div>
          <a href="#book" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-5 py-2 rounded-full font-semibold text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            Book Now
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617] -z-10" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Serving Kambil, Kannur
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight">
            Play More, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Pay Less.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            Premium PS4 rentals delivered straight to your doorstep. Experience next-gen gaming without the upfront cost.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8">
            <a href="#availability" className="w-full sm:w-auto px-8 py-4 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-700">
              <CalendarCheck className="w-5 h-5" /> Check Availability
            </a>
            <a href="#book" className="w-full sm:w-auto px-8 py-4 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <MessageSquare className="w-5 h-5" /> Book on WhatsApp
            </a>
          </div>
        </div>
      </header>

      {}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">How It <span className="text-cyan-400">Works</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: CalendarCheck, title: "Step 1: Check", desc: "View real-time slot availability for your preferred date." },
              { icon: MessageSquare, title: "Step 2: Book", desc: "Fill the form and securely request via WhatsApp." },
              { icon: Truck, title: "Step 3: Delivery", desc: "Get the PS4 delivered directly to your doorstep in Kambil." },
              { icon: Gamepad2, title: "Step 4: Play", desc: "Enjoy your premium gaming session stress-free." }
            ].map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-cyan-500/30 transition-colors">
                <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-cyan-400 border border-slate-700">
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {}
      <section id="availability" className="py-20 px-4">
        <div className="max-w-4xl mx-auto bg-slate-900 rounded-3xl border border-slate-800 p-6 md:p-10 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1 space-y-4">
              <h2 className="text-3xl font-bold text-white">Live <span className="text-cyan-400">Availability</span></h2>
              <p className="text-slate-400">Select a date to see currently booked time slots. If a time isn't listed, it's likely available!</p>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Date to Check</label>
                <input 
                  type="date" 
                  min={minDate}
                  value={availabilityDate}
                  onChange={(e) => setAvailabilityDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all color-scheme-dark"
                />
              </div>
            </div>

            <div className="flex-1 w-full bg-slate-950 rounded-2xl border border-slate-800 p-5 h-full min-h-[250px]">
              <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" /> Confirmed Bookings
              </h3>
              
              {getDayBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 opacity-50" />
                  <p className="text-emerald-400 font-medium">All slots available!</p>
                  <p className="text-xs text-slate-500 mt-1">Ready to book for {new Date(availabilityDate).toLocaleDateString()}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getDayBookings.map((b, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">
                        {formatTime12Hr(b.startTime)} - {formatTime12Hr(b.endTime)}
                      </span>
                      <span className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded-md border border-red-500/20">
                        Booked
                      </span>
                    </div>
                  ))}
                  <div className="pt-4 mt-4 border-t border-slate-800">
                    <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1">
                      <Info className="w-3 h-3" /> Other times on this date are available.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {}
      <section className="py-20 px-4 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Rental <span className="text-cyan-400">Plans</span></h2>
            <p className="text-slate-400">Flexible pricing tailored for every type of gamer.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Normal Rates */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 hover:-translate-y-1 transition-transform">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" /> Standard Hourly
              </h3>
              <ul className="space-y-4">
                {Object.entries(pricingData.normal).map(([duration, price], i) => (
                  <li key={i} className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-300">{duration}</span>
                    <span className="font-bold text-white">₹{price}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Special Offers */}
            <div className="bg-gradient-to-b from-cyan-950/40 to-slate-900 border border-cyan-500/30 rounded-2xl p-8 relative hover:-translate-y-1 transition-transform shadow-[0_0_30px_rgba(6,182,212,0.1)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cyan-500 text-slate-950 font-bold px-4 py-1 rounded-full text-sm">
                Wed & Fri Special
              </div>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 mt-2">
                <Gamepad2 className="w-5 h-5 text-cyan-400" /> Special Hourly
              </h3>
              <ul className="space-y-4">
                {Object.entries(pricingData.special).map(([duration, price], i) => (
                  <li key={i} className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                    <span className="text-slate-300">{duration}</span>
                    <span className="font-bold text-cyan-400 text-lg">₹{price}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Daily Rates */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 hover:-translate-y-1 transition-transform">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" /> Multi-Day
              </h3>
              <ul className="space-y-4">
                {Object.entries(pricingData.daily).map(([duration, price], i) => (
                  <li key={i} className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-300">{duration}</span>
                    <span className="font-bold text-white">₹{price}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {}
      <section id="book" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900 rounded-3xl p-8 md:p-10 border border-cyan-900/50 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
            
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-[80px] pointer-events-none" />

            {bookingSuccess ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Request Received!</h3>
                <p className="text-slate-400 max-w-md mx-auto">
                  Thank you for booking with Apex Gaming Rentals. We are opening WhatsApp to finalize your request. We will contact you shortly to confirm your reservation.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-10 text-center">
                  <h2 className="text-3xl font-bold text-white mb-3">Reserve Your <span className="text-cyan-400">Console</span></h2>
                  <p className="text-slate-400 text-sm">Fill in your details below to calculate price and book.</p>
                </div>

                <form onSubmit={submitBooking} className="space-y-6 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Info */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Full Name</label>
                      <input 
                        required
                        type="text" 
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-600"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Phone Number (WhatsApp)</label>
                      <input 
                        required
                        type="tel" 
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+91 98765 43210"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-600"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-slate-300">Delivery Address</label>
                      <textarea 
                        required
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Full address in/around Kambil"
                        rows="2"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-600 resize-none"
                      />
                    </div>

                    {/* Date & Duration */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Rental Date</label>
                      <input 
                        required
                        type="date" 
                        name="date"
                        min={minDate}
                        value={formData.date}
                        onChange={handleInputChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors color-scheme-dark"
                      />
                      {isSpecialDay(formData.date) && (
                        <p className="text-xs text-cyan-400 mt-1 flex items-center gap-1">
                          <Tag className="w-3 h-3" /> Special Day Pricing Active
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Duration Plan</label>
                      <select 
                        required
                        name="duration"
                        value={formData.duration}
                        onChange={handleInputChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors appearance-none"
                      >
                        <optgroup label="Hourly Plans">
                          <option value="1 Hour">1 Hour</option>
                          <option value="5 Hours">5 Hours</option>
                          <option value="10 Hours">10 Hours</option>
                        </optgroup>
                        <optgroup label="Multi-Day Plans">
                          <option value="1 Day">1 Day</option>
                          <option value="2 Days">2 Days</option>
                          <option value="3 Days">3 Days</option>
                          <option value="1 Week">1 Week</option>
                        </optgroup>
                      </select>
                    </div>

                    {/* Start & End Times */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Starting Time</label>
                      <input 
                        required
                        type="time" 
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleInputChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors color-scheme-dark"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Ending Time (Auto-Calculated)</label>
                      <input 
                        readOnly
                        type="time" 
                        name="endTime"
                        value={formData.endTime}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-400 cursor-not-allowed focus:outline-none transition-colors color-scheme-dark"
                      />
                    </div>
                  </div>

                  {/* Price Summary */}
                  <div className="mt-8 bg-slate-950 border border-cyan-900/50 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                      <h4 className="text-slate-400 font-medium">Estimated Total Price</h4>
                      <p className="text-sm text-slate-500">Based on {formData.duration} {isSpecialDay(formData.date) ? '(Special Rate Applied!)' : '(Standard Rate)'}</p>
                    </div>
                    <div className="text-4xl font-bold flex items-center gap-3">
                      {isSpecialDay(formData.date) && originalPrice > calculatedPrice ? (
                        <>
                          <span className="text-2xl text-slate-600 line-through decoration-red-500 transition-all">₹{originalPrice}</span>
                          <span className="text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">₹{calculatedPrice}</span>
                        </>
                      ) : (
                        <span className="text-white">₹{calculatedPrice}</span>
                      )}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full mt-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-lg font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <span className="animate-pulse">Processing...</span>
                    ) : (
                      <>Book Now for ₹{calculatedPrice} <ChevronRight className="w-5 h-5" /></>
                    )}
                  </button>
                  <p className="text-xs text-center text-slate-500 mt-4">
                    By submitting, you will be redirected to WhatsApp to confirm your booking. Payment is collected upon delivery.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      {}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 px-4 mt-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-cyan-400" />
            <span className="text-lg font-bold text-white tracking-tight">APEX <span className="text-cyan-400">GAMING</span></span>
          </div>

          <div className="text-center md:text-left text-slate-400 text-sm space-y-1">
            <p>Based in Kambil, Kannur, Kerala</p>
            <p>WhatsApp: +91 7736689545</p>
          </div>

          <div className="text-slate-500 text-sm flex flex-col items-center md:items-end gap-2">
            <p>&copy; {new Date().getFullYear()} Apex Gaming Rentals. All rights reserved.</p>
            
            {/* Admin Access Toggle (Hidden visually but accessible) */}
            <div className="flex items-center gap-2 mt-2">
              <input 
                type="password" 
                placeholder="Admin PIN" 
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs w-24 text-center focus:outline-none focus:border-slate-600"
              />
              <button 
                onClick={() => {
                  if(adminPin === '1234') { 
                    setIsAdminView(true); 
                    setAdminPin(''); 
                  } else {
                    alert('Invalid PIN. Use 1234 for demo.');
                  }
                }}
                className="text-slate-600 hover:text-cyan-400 transition-colors"
                title="Admin Access (PIN: 1234)"
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}
