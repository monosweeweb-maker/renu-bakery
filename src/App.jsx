import React, { useState, useEffect, useRef } from 'react';
import { Cake, ShoppingBag, Wand2, RefreshCw, Trash2, CheckCircle, ArrowRight, X, Instagram, Facebook, Lock, Truck, MapPin, User, Phone, Store, Download, Calendar, Clock, FileText, Plus, Minus, Upload, Image as ImageIcon, MessageCircle, LogIn, LogOut, History, UserPlus, ShieldAlert, Menu as MenuIcon, Leaf, ShieldCheck, Users, UserCog, Sparkles, Zap, Cpu, Layers, Heart } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc
} from "firebase/firestore";

// --- FIREBASE CONFIGURATION ---
// ⚠️ REPLACE WITH YOUR KEYS
const firebaseConfig = {
  apiKey: "AIzaSyBAxWmKrjUC_1QVxb_9ZvBgT8hXdVczy-4",
  authDomain: "renu-bakery-19.firebaseapp.com",
  projectId: "renu-bakery-19",
  storageBucket: "renu-bakery-19.firebasestorage.app",
  messagingSenderId: "244326249126",
  appId: "1:244326249126:web:e4ce59494b12e000c67a67"
};

// Initialize Firebase safely
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase config missing or invalid. App running in limited mode.");
}

// --- HELPERS ---
const formatPhoneNumber = (value) => {
  let raw = value.replace(/\D/g, '');
  if (raw.startsWith('91')) raw = raw.substring(2);
  raw = raw.slice(0, 10);

  let formatted = '+91 ';
  if (raw.length > 0) {
    if (raw.length > 5) {
      formatted += raw.substring(0, 5) + '-' + raw.substring(5);
    } else {
      formatted += raw;
    }
  }
  return formatted.trim();
};

const validatePasswordStrength = (password) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

const encryptPassword = (password) => {
  return "enc_" + btoa(password).substring(0, 10) + "...";
};

const addWatermark = (imageSource) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Allow external images
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(24, img.width * 0.05);
      ctx.font = `${fontSize}px 'Pacifico', cursive`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';

      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      const padding = img.width * 0.03;
      ctx.fillText('Renu Bakery', padding, img.height - padding);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSource); // Return original if canvas fails
    img.src = imageSource;
  });
};

const generateCakeImage = async (prompt) => {
  const apiKey = ""; // API Key injected by environment
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;

  const payload = {
    instances: [{ prompt: prompt }],
    parameters: { sampleCount: 1 }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data.predictions?.[0]?.bytesBase64Encoded) {
      return {
        image: `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`,
        source: 'Renu AI'
      };
    }
    throw new Error("No image data returned");
  } catch (error) {
    console.warn("AI Generation Failed. Using Fallback.", error);
    return {
      image: `https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80&auto=format&fit=crop&random=${Math.random()}`,
      source: 'Unsplash Stock (Fallback)'
    };
  }
};

// --- CONSTANTS ---
const TIME_SLOTS = [
  "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM", "12:00 PM - 01:00 PM", "01:00 PM - 02:00 PM",
  "02:00 PM - 03:00 PM", "03:00 PM - 04:00 PM", "04:00 PM - 05:00 PM", "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM", "07:00 PM - 08:00 PM"
];

const PRE_DESIGNED_CAKES = [
  { id: 'c1', name: 'Belgian Chocolate Truffle', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800', price: 550, description: 'Rich dark chocolate ganache.' },
  { id: 'c2', name: 'Classic Black Forest', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800', price: 450, description: 'Layers of chocolate sponge & cherries.' },
  { id: 'c3', name: 'Fresh Pineapple', image: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=800', price: 400, description: 'Light vanilla sponge with fresh pineapple.' },
  { id: 'c4', name: 'Red Velvet Supreme', image: 'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=800', price: 600, description: 'Authentic cream cheese frosting.' },
  { id: 'c5', name: 'Butterscotch Crunch', image: 'https://images.unsplash.com/photo-1562440499-64c9a111f713?w=800', price: 480, description: 'Crunchy praline and caramel.' },
  { id: 'c6', name: 'Blueberry Glaze', image: 'https://images.unsplash.com/photo-1488477304112-4944851de03d?w=800', price: 580, description: 'Exotic blueberry filling.' },
];

// --- COMPONENTS ---

const Navbar = ({ cartCount, setPage, activePage, toggleCart, currentUser, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  return (
    <nav className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 transition-all duration-300 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center">
            <button className="md:hidden p-2 text-gray-600 mr-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X /> : <MenuIcon />}
            </button>
            <div className="flex items-center cursor-pointer group" onClick={() => setPage('home')}>
              <div className="bg-pink-50 p-2 rounded-full group-hover:bg-pink-100 transition-colors">
                <Cake className="h-8 w-8 text-pink-600" />
              </div>
              <span className="ml-3 text-2xl font-bold text-gray-800 font-serif tracking-tight">Renu Bakery</span>
            </div>
          </div>

          <div className="hidden md:flex space-x-2">
            {['home', 'menu', 'ai-builder'].map((page) => (
              <button
                key={page}
                onClick={() => setPage(page)}
                className={`px-5 py-2 rounded-full font-medium transition-all ${activePage === page ? 'bg-pink-600 text-white shadow-md' : 'text-gray-600 hover:bg-pink-50 hover:text-pink-600'}`}
              >
                {page === 'ai-builder' ? 'Renu AI' : page.charAt(0).toUpperCase() + page.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-2">
                {(currentUser.role === 'admin' || currentUser.role === 'superadmin') && (
                  <button onClick={() => setPage('admin-dashboard')} className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full hover:bg-purple-100 border border-purple-200">
                    Dashboard
                  </button>
                )}
                {currentUser.role === 'customer' && (
                  <button onClick={() => setPage('my-orders')} className="hidden sm:flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200">
                    <History className="w-4 h-4 mr-1.5" /> My Orders
                  </button>
                )}

                <button onClick={onLogout} title="Logout" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button onClick={() => setPage('login')} className="flex items-center px-5 py-2 text-sm font-bold text-pink-600 border-2 border-pink-600 rounded-full hover:bg-pink-600 hover:text-white transition-all">
                <LogIn className="w-4 h-4 mr-2" /> Login
              </button>
            )}
            <button onClick={toggleCart} className="relative p-2.5 text-gray-600 hover:text-pink-600 transition-colors">
              <ShoppingBag className="h-6 w-6" />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">{cartCount}</span>}
            </button>
          </div>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full animate-fade-in z-40">
          <div className="px-4 py-2 space-y-1">
            {['home', 'menu', 'ai-builder'].map((page) => (
              <button key={page} onClick={() => { setPage(page); setIsMobileMenuOpen(false) }} className="block w-full text-left px-4 py-3 text-gray-600 font-medium hover:bg-pink-50 hover:text-pink-600 rounded-lg">
                {page === 'ai-builder' ? 'Renu AI' : page.charAt(0).toUpperCase() + page.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

const Hero = ({ setPage }) => (
  <div className="relative bg-gray-900 overflow-hidden min-h-[85vh] flex items-center">
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1626803775151-61d756612f97?q=80&w=2070')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/80 to-gray-900"></div>

      <div className="absolute top-20 right-10 animate-pulse delay-100 opacity-20">
        <Sparkles className="w-24 h-24 text-pink-400" />
      </div>
      <div className="absolute bottom-20 left-10 animate-bounce delay-700 opacity-20">
        <Cake className="w-16 h-16 text-purple-400" />
      </div>
    </div>

    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between w-full">
      <div className="text-center md:text-left md:w-1/2 space-y-8">
        <div className="inline-flex items-center px-4 py-2 rounded-full border border-pink-500/30 bg-pink-500/10 backdrop-blur-md text-pink-300 text-sm font-semibold uppercase tracking-wider mb-4 animate-fade-in">
          <Zap className="w-4 h-4 mr-2" /> The Future of Baking
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
          Design Your <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">
            Dream Cake
          </span>
        </h1>
        <p className="text-xl text-gray-300 max-w-xl leading-relaxed">
          Experience <strong>Renu AI</strong>. Describe your imagination, and watch our AI bake it into reality before you order. 100% Vegetarian, 100% Innovative.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4">
          <button
            onClick={() => setPage('ai-builder')}
            className="group relative px-8 py-4 bg-pink-600 rounded-full font-bold text-white shadow-[0_0_20px_rgba(219,39,119,0.5)] hover:shadow-[0_0_30px_rgba(219,39,119,0.8)] transition-all transform hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <span className="flex items-center"><Wand2 className="w-5 h-5 mr-2" /> Launch Renu AI</span>
          </button>
          <button
            onClick={() => setPage('menu')}
            className="px-8 py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-full font-bold text-white hover:bg-white/10 transition-all transform hover:-translate-y-1 flex items-center justify-center"
          >
            Explore Menu <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>

      <div className="md:w-1/2 mt-12 md:mt-0 relative">
        <div className="relative w-full max-w-lg mx-auto">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gray-800/50 backdrop-blur-sm">
            <img src="https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=800&q=80" alt="AI Cake" className="w-full h-auto hover:scale-105 transition-transform duration-700" />
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
              <p className="text-pink-400 font-mono text-sm mb-1">@Generated_By_Renu_AI</p>
              <p className="text-white font-bold">Futuristic Strawberry Glaze</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ProcessSection = () => (
  <div className="py-24 bg-gray-900 text-white relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="text-center mb-16">
        <h2 className="text-base text-pink-500 font-bold tracking-widest uppercase">How It Works</h2>
        <p className="mt-2 text-3xl md:text-4xl font-extrabold">From Imagination to Celebration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 hover:border-pink-500/50 transition-all group">
          <div className="w-14 h-14 bg-gray-700 rounded-xl flex items-center justify-center mb-6 group-hover:bg-pink-600 transition-colors">
            <Cpu className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-3">1. Describe with AI</h3>
          <p className="text-gray-400">Type your prompt: "A neon-cyberpunk birthday cake with blue drip." Our Renu AI visualizes it instantly.</p>
        </div>
        <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 hover:border-pink-500/50 transition-all group">
          <div className="w-14 h-14 bg-gray-700 rounded-xl flex items-center justify-center mb-6 group-hover:bg-pink-600 transition-colors">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-3">2. Customize Details</h3>
          <p className="text-gray-400">Choose your flavor, size (lbs), and tiers. Add a personal message. It's 100% customizable.</p>
        </div>
        <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 hover:border-pink-500/50 transition-all group">
          <div className="w-14 h-14 bg-gray-700 rounded-xl flex items-center justify-center mb-6 group-hover:bg-pink-600 transition-colors">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-3">3. Bake & Deliver</h3>
          <p className="text-gray-400">Our chefs bring the AI design to life with fresh, eggless ingredients. Delivered to your door.</p>
        </div>
      </div>
    </div>
  </div>
);

const GallerySection = () => (
  <div className="py-24 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">Trending AI Designs</h2>
          <p className="mt-2 text-gray-500">Generated by our community of cake lovers.</p>
        </div>
        <button className="hidden md:flex items-center font-bold text-pink-600 hover:text-pink-700">
          View Gallery <ArrowRight className="ml-2 w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500',
          'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=500',
          'https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?w=500',
          'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=500'
        ].map((src, i) => (
          <div key={i} className={`relative group overflow-hidden rounded-2xl ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}>
            <img src={src} alt="Trending Cake" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-6">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0">
                <p className="text-white font-bold">Design #{1000 + i}</p>
                <div className="flex items-center text-pink-300 text-xs mt-1">
                  <Heart className="w-3 h-3 mr-1 fill-current" /> {240 + i * 15} Likes
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const MenuPage = ({ addToCart }) => {
  const [selectedCake, setSelectedCake] = useState(null);
  const [customOptions, setCustomOptions] = useState({ weight: 1, occasion: 'Birthday', message: '' });

  const handleAdd = () => {
    if (!selectedCake) return;
    addToCart({
      id: Date.now(),
      theme: selectedCake.name,
      flavor: selectedCake.name,
      image: selectedCake.image,
      price: selectedCake.price * customOptions.weight,
      tiers: 1,
      occasion: customOptions.occasion,
      specialRequests: `Message: "${customOptions.message}" - ${customOptions.weight} lb`,
      requiresPrepTime: false
    });
    setSelectedCake(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold text-gray-900">Our Signature Menu</h2>
        <p className="mt-2 text-gray-500">Click on a cake to customize weight and message.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PRE_DESIGNED_CAKES.map(cake => (
          <div key={cake.id} className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all cursor-pointer" onClick={() => setSelectedCake(cake)}>
            <div className="h-64 overflow-hidden relative">
              <img src={cake.image} alt={cake.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <span className="absolute top-3 right-3 bg-white/90 text-green-700 text-xs font-bold px-2 py-1 rounded-full shadow-sm flex items-center"><Leaf className="w-3 h-3 mr-1" /> 100% Veg</span>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-gray-900">{cake.name}</h3>
                <span className="text-pink-600 font-bold">₹{cake.price}/lb</span>
              </div>
              <p className="text-sm text-gray-500">{cake.description}</p>
              <button className="mt-4 w-full bg-pink-50 text-pink-600 font-semibold py-2 rounded-lg group-hover:bg-pink-600 group-hover:text-white transition-colors">Add to Order</button>
            </div>
          </div>
        ))}
      </div>

      {selectedCake && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{selectedCake.name}</h3>
              <button onClick={() => setSelectedCake(null)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                <div className="flex items-center space-x-4">
                  <button onClick={() => setCustomOptions(p => ({ ...p, weight: Math.max(1, p.weight - 0.5) }))} className="p-2 bg-gray-100 rounded-full"><Minus className="w-4 h-4" /></button>
                  <span className="font-bold text-lg w-12 text-center">{customOptions.weight} lb</span>
                  <button onClick={() => setCustomOptions(p => ({ ...p, weight: Math.min(10, p.weight + 0.5) }))} className="p-2 bg-gray-100 rounded-full"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Occasion</label>
                <select className="w-full p-2 border rounded-lg" onChange={e => setCustomOptions(p => ({ ...p, occasion: e.target.value }))}>
                  <option>Birthday</option><option>Anniversary</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <input type="text" className="w-full p-2 border rounded-lg" placeholder="Happy Birthday..." onChange={e => setCustomOptions(p => ({ ...p, message: e.target.value }))} />
              </div>
              <div className="pt-4 border-t flex justify-between items-center">
                <span className="text-xl font-bold text-pink-600">Total: ₹{selectedCake.price * customOptions.weight}</span>
                <button onClick={handleAdd} className="bg-pink-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-pink-700">Add to Cart</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AICakeBuilder = ({ addToCart }) => {
  const [mode, setMode] = useState('ai');
  const [formData, setFormData] = useState({ flavor: 'Vanilla', tiers: 1, size: '2 Pounds', color: 'Pastel', theme: 'Floral', occasion: 'Birthday', specialRequests: '' });
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageSource, setImageSource] = useState(null);
  const fileRef = useRef(null);

  const handleGenerate = async () => {
    setLoading(true);
    setImageSource(null);
    try {
      const requestLower = formData.specialRequests.toLowerCase();
      const wantsCut = requestLower.includes('cut') || requestLower.includes('slice') || requestLower.includes('inside');
      const tierCount = parseInt(formData.tiers);

      let prompt = `Professional high-res food photography of a cake with exactly ${tierCount} tier${tierCount > 1 ? 's' : ''}. The cake must have ${tierCount} distinct layer(s). `;
      prompt += `Theme: ${formData.theme}. Flavor appearance: ${formData.flavor}. Color scheme: ${formData.color}. Occasion style: ${formData.occasion}. `;

      if (wantsCut) {
        prompt += "Show a slice cut out revealing the inside texture/layers. ";
      } else {
        prompt += "Show the WHOLE cake. Completely intact, round, uncut. No slices removed. Exterior decoration only. ";
      }

      const result = await generateCakeImage(prompt);
      const watermarkedImg = await addWatermark(result.image);
      setGeneratedImage(watermarkedImg);
      setImageSource(result.source);
    } catch (e) {
      // Fallback is already handled in generateCakeImage returning an object
      // But if something else fails:
      setLoading(false);
    }
    setLoading(false);
  };

  const handleAddToCart = () => {
    if (!generatedImage) return;
    addToCart({
      ...formData,
      image: generatedImage,
      price: 1500 + (formData.tiers * 800),
      id: Date.now(),
      requiresPrepTime: true // Custom/AI cakes require 3h prep
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Renu AI Custom Cake Builder</h2>
        <p className="text-gray-500 mt-2">Surprise your loved ones with personalised theme cake that's designed only for them...</p>
        <div className="flex justify-center gap-4 mt-6">
          <button onClick={() => setMode('ai')} className={`px-6 py-2 rounded-full font-bold ${mode === 'ai' ? 'bg-pink-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600'}`}>Renu AI Generator</button>
          <button onClick={() => setMode('upload')} className={`px-6 py-2 rounded-full font-bold ${mode === 'upload' ? 'bg-pink-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600'}`}>Upload Design</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 space-y-4">
          {mode === 'upload' && (
            <div className="border-2 border-dashed p-8 text-center rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => fileRef.current.click()}>
              <input type="file" ref={fileRef} className="hidden" onChange={(e) => {
                const reader = new FileReader();
                reader.onload = () => setGeneratedImage(reader.result);
                if (e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
              }} accept="image/*" />
              <Upload className="mx-auto text-gray-400 mb-2 h-10 w-10" />
              <p className="font-medium text-gray-600">Click to Upload Reference Image</p>
              <p className="text-xs text-gray-400 mt-1">We need at least 3 hours to bake this.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Flavor</label>
              <select className="w-full p-2 border rounded mt-1" onChange={e => setFormData({ ...formData, flavor: e.target.value })}>
                <option>Vanilla Bean</option><option>Dark Chocolate</option><option>Red Velvet</option><option>Butterscotch</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Size (Weight)</label>
              <select className="w-full p-2 border rounded mt-1" onChange={e => setFormData({ ...formData, size: e.target.value })}>
                <option>1 Pound</option><option>2 Pounds</option><option>3 Pounds</option><option>4 Pounds</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Tiers</label>
              <select className="w-full p-2 border rounded mt-1" value={formData.tiers} onChange={e => setFormData({ ...formData, tiers: parseInt(e.target.value) })}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} Tier{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Occasion</label>
              <select className="w-full p-2 border rounded mt-1" onChange={e => setFormData({ ...formData, occasion: e.target.value })}>
                <option>Birthday</option><option>Wedding</option><option>Anniversary</option><option>Other</option>
              </select>
            </div>
          </div>

          {mode === 'ai' && (
            <>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Theme</label>
                <input className="w-full p-2 border rounded mt-1" placeholder="e.g. Spiderman, Floral..." onChange={e => setFormData({ ...formData, theme: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Color Palette</label>
                <input className="w-full p-2 border rounded mt-1" placeholder="e.g. Pastel Pink & Gold" onChange={e => setFormData({ ...formData, color: e.target.value })} />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Any other details?</label>
            <textarea className="w-full p-2 border rounded mt-1" rows="2" placeholder="e.g. Write name in blue..." onChange={e => setFormData({ ...formData, specialRequests: e.target.value })} />
          </div>

          {mode === 'ai' && <button onClick={handleGenerate} disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-bold flex justify-center items-center shadow-md hover:shadow-lg transition-all">{loading ? <RefreshCw className="animate-spin" /> : <><Wand2 className="mr-2" /> Generate Design</>}</button>}
          {mode === 'upload' && generatedImage && <button onClick={handleAddToCart} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-green-700 transition-all">Confirm & Add Design</button>}
        </div>

        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center min-h-[400px] relative overflow-hidden">
          {generatedImage ? (
            <div className="relative w-full h-full flex flex-col">
              {/* Disclaimer Banner */}
              {imageSource && imageSource !== 'Renu AI' && (
                <div className="absolute top-0 left-0 right-0 bg-yellow-500/90 text-white text-xs py-1 px-2 text-center z-20 backdrop-blur-sm font-medium">
                  Note: Renu AI is currently down. Showing result from {imageSource}.
                </div>
              )}

              <img src={generatedImage} className="w-full h-full object-contain bg-gray-100" />
              {mode === 'ai' && (
                <div className="p-4 bg-white border-t">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">Estimated Price</p>
                      <span className="font-bold text-xl text-gray-900">₹{1500 + (formData.tiers * 800)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleGenerate} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Redesign</button>
                      <button onClick={handleAddToCart} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow">Add to Cart</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400">
              <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-20" />
              <p>Preview will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CheckoutSuccess = ({ setPage, orderId }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div className="bg-green-50 rounded-full p-6 mb-6 animate-bounce">
      <CheckCircle className="h-20 w-20 text-green-500" />
    </div>
    <h2 className="text-4xl font-extrabold text-gray-900 mb-4 text-center">Order Confirmed!</h2>
    {orderId && <p className="text-pink-600 font-bold mb-4 text-lg">Order #{orderId.slice(-6)}</p>}
    <p className="text-lg text-gray-600 text-center max-w-lg mb-2">
      You will receive a confirmation message/call from Renu Bakery soon.
    </p>
    <p className="text-md text-gray-500 text-center max-w-lg mb-8">
      Thanks for your order! We hope to serve you again.
    </p>
    <button
      onClick={() => setPage('home')}
      className="flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-full text-white bg-pink-600 hover:bg-pink-700 shadow-lg transition-all transform hover:-translate-y-1"
    >
      Back to Home
    </button>
  </div>
);

const AuthModal = ({ isOpen, onClose, onGuest, onLogin, setPage }) => {
  const [step, setStep] = useState('prompt');
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '', phone: '+91 ', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');

  const handlePhone = (e) => setForm({ ...form, phone: formatPhoneNumber(e.target.value) });

  const handleLogin = async () => {
    try {
      if (form.username === 'admin' && form.password === 'admin123') {
        onLogin({ uid: 'admin-1', displayName: 'Admin', role: 'admin' });
        onClose();
        return;
      }
      if (form.username === 'superadmin' && form.password === 'super123') {
        onLogin({ uid: 'super-1', displayName: 'Super Admin', role: 'superadmin' });
        onClose();
        return;
      }

      if (!auth) throw new Error("Authentication service not available.");
      const email = `${form.username.replace(/\s+/g, '').toLowerCase()}@renubakery.com`;
      const userCred = await signInWithEmailAndPassword(auth, email, form.password);
      onLogin({ ...userCred.user, role: 'customer' });
      onClose();
    } catch (e) { setError(e.message || "Invalid Username or Password"); }
  };

  const handleSignup = async () => {
    if (!validatePasswordStrength(form.password)) { setError("Password needs Upper, Lower, Number, Special char & 8+ length."); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.phone.length < 15) { setError("Invalid Phone Number"); return; }
    if (form.otp !== '1234') { setError("Invalid OTP (Correct: 1234)"); return; }

    try {
      if (!db || !auth) throw new Error("Database connection failed");

      const email = `${form.username.replace(/\s+/g, '').toLowerCase()}@renubakery.com`;
      const userCred = await createUserWithEmailAndPassword(auth, email, form.password);
      await updateProfile(userCred.user, { displayName: form.username });
      await setDoc(doc(db, "users", userCred.user.uid), {
        username: form.username,
        phone: form.phone,
        role: 'customer',
        joinDate: new Date().toISOString()
      });
      onLogin({ ...userCred.user, role: 'customer' });
      onClose();
    } catch (e) { setError(e.message); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>

        <div className="mb-6 inline-flex p-4 bg-pink-50 rounded-full">
          <User className="w-8 h-8 text-pink-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {step === 'prompt' ? 'Checkout' : step === 'login' ? 'Login' : 'Sign Up'}
        </h3>

        {step === 'prompt' ? (
          <div className="space-y-3">
            <p className="text-gray-500 mb-6">Log in to track your order or continue as guest.</p>
            <button onClick={() => setStep('login')} className="w-full py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700 shadow-lg transition-all">
              Login / Sign Up
            </button>
            <button onClick={onGuest} className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-all">
              Continue as Guest
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <input className="w-full p-3 border rounded-lg" placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />

            {step === 'signup' && (
              <>
                <div className="flex gap-2">
                  <input className="w-full p-3 border rounded-lg" placeholder="Mobile (+91..)" value={form.phone} onChange={handlePhone} />
                  {!otpSent ? <button onClick={() => setOtpSent(true)} className="bg-gray-800 text-white px-3 rounded-lg text-xs">Send OTP</button>
                    : <input className="w-20 p-3 border rounded-lg text-center" placeholder="OTP" maxLength={4} onChange={e => setForm({ ...form, otp: e.target.value })} />}
                </div>
                <input className="w-full p-3 border rounded-lg" type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <input className="w-full p-3 border rounded-lg" type="password" placeholder="Confirm Password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
              </>
            )}

            {step === 'login' && (
              <input className="w-full p-3 border rounded-lg" type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            )}

            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}

            <button onClick={step === 'login' ? handleLogin : handleSignup} className="w-full bg-pink-600 text-white py-3 rounded-lg font-bold hover:bg-pink-700">
              {step === 'login' ? 'Sign In & Checkout' : 'Create & Checkout'}
            </button>

            <div className="text-xs mt-4">
              {step === 'login' ? (
                <p>New? <button onClick={() => setStep('signup')} className="text-pink-600 font-bold">Create Account</button></p>
              ) : (
                <p>Have account? <button onClick={() => setStep('login')} className="text-pink-600 font-bold">Login</button></p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = ({ onLogout, currentUser }) => {
  const [activeTab, setActiveTab] = useState('orders');
  const [data, setData] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuper, setIsSuper] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const checkRole = async () => {
      if (currentUser) {
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
          setIsAdmin(true);
          if (currentUser.role === 'superadmin') setIsSuper(true);
          return;
        }
      }
    };
    checkRole();
  }, [currentUser]);

  useEffect(() => {
    if (!isAdmin || !db) return;

    let unsubscribe;
    if (activeTab === 'orders') {
      const q = query(collection(db, "orders"), orderBy("date", "desc"));
      unsubscribe = onSnapshot(q, (snap) => {
        setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    } else if (activeTab === 'customers' || activeTab === 'admins') {
      const q = collection(db, "users");
      unsubscribe = onSnapshot(q, (snap) => {
        const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (activeTab === 'customers') {
          setUsers(allUsers.filter(u => u.role === 'customer'));
        } else {
          setUsers(allUsers.filter(u => u.role === 'admin' || u.role === 'superadmin'));
        }
      });
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [activeTab, isAdmin]);

  const handleStatus = async (id, status) => {
    if (db) await updateDoc(doc(db, "orders", id), { status });
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm("Delete user permanently?") && db) await deleteDoc(doc(db, "users", id));
  };

  const handleRoleUpdate = async (userId, newRole) => {
    if (db) await updateDoc(doc(db, "users", userId), { role: newRole });
  };

  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center text-gray-500">Access Denied / Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <span className={`text-xs px-2 py-1 rounded-full ${isSuper ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
            {isSuper ? 'Super Admin' : 'Admin'}
          </span>
        </div>
        <button onClick={onLogout} className="text-red-500 font-bold border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">Logout</button>
      </div>

      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab('orders')} className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'orders' ? 'border-b-2 border-pink-600 text-pink-600' : 'text-gray-500 hover:text-gray-700'}`}>Orders</button>
        {isSuper && (
          <>
            <button onClick={() => setActiveTab('customers')} className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'customers' ? 'border-b-2 border-pink-600 text-pink-600' : 'text-gray-500 hover:text-gray-700'}`}>Customer Management</button>
            <button onClick={() => setActiveTab('admins')} className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'admins' ? 'border-b-2 border-pink-600 text-pink-600' : 'text-gray-500 hover:text-gray-700'}`}>Admin Management</button>
          </>
        )}
      </div>

      {activeTab === 'orders' ? (
        <div className="space-y-4">
          {data.map(o => (
            <div key={o.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-lg text-gray-800">#{o.id.slice(-6)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${o.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : o.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{o.status}</span>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">{o.customer.name} • {o.customer.phone}</p>
                </div>
                <div className="mt-2 md:mt-0 text-right">
                  <p className="font-bold text-xl text-pink-600">₹{o.total}</p>
                  <p className="text-xs text-gray-400">{new Date(o.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-lg mb-4">
                <div>
                  <p className="text-gray-500 uppercase text-xs font-bold">Delivery</p>
                  <p className="font-medium capitalize">{o.customer.deliveryMode}</p>
                  {o.customer.deliveryMode === 'delivery' && <p className="text-gray-600 text-xs">{o.customer.address}, {o.customer.pincode}</p>}
                </div>
                <div>
                  <p className="text-gray-500 uppercase text-xs font-bold">Schedule</p>
                  <p className="font-medium">{o.customer.date}</p>
                  <p className="text-gray-600">{o.customer.time}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase text-xs font-bold">Items</p>
                  <ul className="list-disc pl-4 text-gray-600">
                    {o.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between items-center">
                        <span>{i.theme} ({i.tiers} tier)</span>
                        {i.image && i.image.startsWith('data') && (
                          <a href={i.image} download={`Renu_Bakery_order_${o.customer.name.replace(/\s/g, '_')}_${o.id}_Item${idx + 1}.png`} className="text-blue-500 hover:underline ml-2 text-xs flex items-center"><Download className="w-3 h-3 mr-1" />Img</a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex justify-end items-center gap-3 border-t pt-4">
                <span className="text-sm text-gray-500">Update Status:</span>
                <select className="border rounded-lg p-2 text-sm bg-white hover:border-pink-300 cursor-pointer" value={o.status} onChange={(e) => handleStatus(o.id, e.target.value)}>
                  <option>Pending</option><option>Confirmed</option><option>In Baking</option><option>Ready</option><option>Completed</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr><th className="p-4 font-medium text-gray-500">Name</th><th className="p-4 font-medium text-gray-500">Phone</th><th className="p-4 font-medium text-gray-500">Role</th><th className="p-4 font-medium text-gray-500 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium">{u.username}</td>
                  <td className="p-4 text-gray-600">{u.phone}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'superadmin' ? 'bg-pink-100 text-pink-700' : 'bg-green-100 text-green-700'}`}>{u.role}</span></td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    {u.id !== currentUser.uid && u.role !== 'superadmin' && (
                      <>
                        {activeTab === 'customers' && (
                          <button onClick={() => handleRoleUpdate(u.id, 'admin')} title="Promote to Admin" className="text-blue-500 hover:bg-blue-50 p-2 rounded-full"><UserPlus className="w-4 h-4" /></button>
                        )}
                        {activeTab === 'admins' && (
                          <button onClick={() => handleRoleUpdate(u.id, 'customer')} title="Revoke Admin" className="text-orange-500 hover:bg-orange-50 p-2 rounded-full"><UserCog className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => handleDeleteUser(u.id)} title="Delete User" className="text-red-500 hover:bg-red-50 p-2 rounded-full"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-400">No users found in this category.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const OrderHistory = ({ userId }) => {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "orders"), where("userId", "==", userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [userId]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 min-h-screen">
      <h2 className="text-3xl font-bold mb-8 text-gray-900">My Orders</h2>
      {orders.length === 0 ? <p className="text-gray-500 text-center">No past orders found.</p> : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <div>
                  <p className="font-bold text-gray-800 text-lg">#{order.id.slice(-6)}</p>
                  <p className="text-xs text-gray-500">{new Date(order.date).toDateString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{order.status}</span>
              </div>
              <div className="space-y-2 mb-4">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.theme} ({item.flavor})</span>
                    <span className="font-medium">₹{item.price}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-xl">
                <span className="text-gray-600 text-sm">Total Amount</span>
                <span className="font-bold text-xl text-gray-900">₹{order.total}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CartDrawer = ({ isOpen, onClose, cartItems, removeItem, onCheckoutSubmit, currentUser }) => {
  const [details, setDetails] = useState({ name: '', phone: '+91 ', deliveryMode: 'pickup', address: '', pincode: '', date: '', time: '', specialNote: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
  const total = subtotal + (details.deliveryMode === 'delivery' ? 80 : 0);

  useEffect(() => {
    if (currentUser && currentUser.role === 'customer') {
      setDetails(prev => ({ ...prev, name: currentUser.displayName || '', phone: currentUser.phoneNumber || '+91 ' }));
    }
  }, [currentUser]);

  const getAvailableSlots = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const isToday = details.date === todayStr;
    const currentHour = now.getHours();

    const needsPrep = cartItems.some(i => i.requiresPrepTime);
    const buffer = needsPrep ? 3 : 0;
    const minHour = isToday ? currentHour + buffer : 0;

    return TIME_SLOTS.filter(slot => {
      const parts = slot.split(' ')[0].split(':');
      let h = parseInt(parts[0]);
      const ampm = slot.split(' ')[1];

      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;

      return h > minHour;
    });
  };

  const handlePhoneChange = (e) => setDetails({ ...details, phone: formatPhoneNumber(e.target.value) });
  const handlePincodeChange = (e) => setDetails({ ...details, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) });

  const handleSubmit = () => {
    if (!details.name || details.phone.length < 15 || !details.date || !details.time) {
      setError("Please fill all fields correctly."); return;
    }

    const selectedDate = new Date(details.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) { setError("Cannot select past dates."); return; }

    if (details.deliveryMode === 'delivery' && (details.pincode.length !== 6 || !details.address)) {
      setError("Valid address & 6-digit pincode required."); return;
    }

    onCheckoutSubmit(details, !currentUser);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
        <div className="p-4 border-b flex justify-between items-center bg-pink-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center"><ShoppingBag className="mr-2 h-5 w-5" /> Your Cart</h2>
          <button onClick={onClose}><X className="text-gray-500 hover:text-red-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {cartItems.length === 0 && <div className="text-center text-gray-500 py-20">Your cart is empty <br /><button onClick={onClose} className="text-pink-600 underline mt-2">Start Shopping</button></div>}
          {cartItems.map(item => (
            <div key={item.id} className="flex gap-4 border-b pb-4 last:border-0">
              <img src={item.image} className="w-20 h-20 object-cover rounded-lg bg-gray-100 border" />
              <div className="flex-1">
                <div className="flex justify-between font-bold text-gray-800"><span>{item.theme}</span><span>₹{item.price}</span></div>
                <p className="text-xs text-gray-500">{item.flavor} • {item.tiers} Tier</p>
                {item.requiresPrepTime && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full mt-1 inline-block">Custom Order (3h prep)</span>}
                <button onClick={() => removeItem(item.id)} className="block text-xs text-red-500 hover:text-red-700 mt-2 font-medium flex items-center"><Trash2 className="w-3 h-3 mr-1" /> Remove</button>
              </div>
            </div>
          ))}

          {cartItems.length > 0 && (
            <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-100">
              <h3 className="font-bold text-sm uppercase text-gray-500 tracking-wide flex items-center"><User className="w-4 h-4 mr-1" /> Customer Info</h3>
              <input placeholder="Name" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-200 outline-none" value={details.name} onChange={e => setDetails({ ...details, name: e.target.value })} />
              <input placeholder="Phone (+91...)" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-200 outline-none" value={details.phone} onChange={handlePhoneChange} />

              <div className="pt-2">
                <h3 className="font-bold text-sm uppercase text-gray-500 tracking-wide mb-2 flex items-center"><Truck className="w-4 h-4 mr-1" /> Delivery Method</h3>
                <div className="flex gap-3">
                  <button onClick={() => setDetails({ ...details, deliveryMode: 'pickup' })} className={`flex-1 p-3 text-sm font-bold rounded-lg border transition-all ${details.deliveryMode === 'pickup' ? 'bg-pink-600 text-white border-pink-600 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}>Pickup (Free)</button>
                  <button onClick={() => setDetails({ ...details, deliveryMode: 'delivery' })} className={`flex-1 p-3 text-sm font-bold rounded-lg border transition-all ${details.deliveryMode === 'delivery' ? 'bg-pink-600 text-white border-pink-600 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}>Delivery (+₹80)</button>
                </div>
              </div>

              {details.deliveryMode === 'pickup' && (
                <div className="text-xs text-gray-600 bg-white p-3 rounded-lg border border-pink-100">
                  <p className="font-bold text-pink-600 mb-1">Pickup Location:</p>
                  <p>Near Binny's showroom, Janiganj Bazar, Kanakpur, Silchar, Assam 788001</p>
                  <p className="mt-1"><strong>Phone:</strong> +91-94355-66125</p>
                  <p><strong>Timings:</strong> 10 am - 8 pm</p>
                </div>
              )}

              {details.deliveryMode === 'delivery' && (
                <div className="space-y-2 animate-fade-in">
                  <textarea placeholder="Street Address, House No..." className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-200 outline-none" value={details.address} onChange={e => setDetails({ ...details, address: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Pincode (6 digits)" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-200 outline-none" value={details.pincode} onChange={handlePincodeChange} maxLength={6} />
                    <input placeholder="Landmark" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-200 outline-none" onChange={e => setDetails({ ...details, landmark: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <h3 className="font-bold text-sm uppercase text-gray-500 tracking-wide mb-2 flex items-center"><Clock className="w-4 h-4 mr-1" /> Date & Time</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" className="p-3 border rounded-lg focus:ring-2 focus:ring-pink-200 outline-none" min={new Date().toISOString().split('T')[0]} value={details.date} onChange={e => setDetails({ ...details, date: e.target.value })} />
                  <select className="p-3 border rounded-lg focus:ring-2 focus:ring-pink-200 outline-none" value={details.time} onChange={e => setDetails({ ...details, time: e.target.value })}>
                    <option value="">Select Slot</option>
                    {getAvailableSlots().map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <textarea placeholder="Special Requirements (e.g. Eggless is default, write name...)" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-200 outline-none" rows="2" onChange={e => setDetails({ ...details, specialNote: e.target.value })} />

              {error && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg flex items-center"><ShieldAlert className="w-4 h-4 mr-2" />{error}</div>}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-5 border-t bg-white shadow-inner">
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-gray-600">Subtotal</span><span>₹{subtotal}</span>
            </div>
            {details.deliveryMode === 'delivery' && (
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-gray-600">Delivery Fee</span><span>₹80</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-extrabold text-gray-900 mb-4">
              <span>Total</span><span>₹{total}</span>
            </div>
            <button onClick={handleSubmit} className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3.5 rounded-xl font-bold hover:from-pink-700 hover:to-purple-700 shadow-lg transform active:scale-95 transition-all">
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const AuthPage = ({ onLogin, setPage }) => {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '', phone: '+91 ', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');

  const handlePhone = (e) => setForm({ ...form, phone: formatPhoneNumber(e.target.value) });

  const handleSignup = async () => {
    if (!validatePasswordStrength(form.password)) { setError("Weak Password (Need Upper, Lower, Number, Special, 8+ chars)"); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.phone.length < 15) { setError("Invalid Phone Number"); return; }
    if (form.otp !== '1234') { setError("Invalid OTP (Mock: use 1234)"); return; }

    try {
      // Check username existence
      const q = query(collection(db, "users"), where("username", "==", form.username));
      const snap = await getDocs(q);
      if (!snap.empty) { setError("Username already exists"); return; }

      const email = `${form.username.replace(/\s+/g, '').toLowerCase()}@renubakery.com`;
      const userCred = await createUserWithEmailAndPassword(auth, email, form.password);
      await updateProfile(userCred.user, { displayName: form.username });
      await setDoc(doc(db, "users", userCred.user.uid), {
        username: form.username,
        phone: form.phone,
        role: 'customer',
        joinDate: new Date().toISOString()
      });
      onLogin({ ...userCred.user, role: 'customer' });
    } catch (e) { setError(e.message); }
  };

  const handleLogin = async () => {
    // Check for Hardcoded Admins FIRST
    if (form.username === 'admin' && form.password === 'admin123') {
      onLogin({ uid: 'admin-1', displayName: 'Admin', role: 'admin' });
      return;
    }
    if (form.username === 'superadmin' && form.password === 'super123') {
      onLogin({ uid: 'super-1', displayName: 'Super Admin', role: 'superadmin' });
      return;
    }

    const email = `${form.username.replace(/\s+/g, '').toLowerCase()}@renubakery.com`;
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, form.password);
      onLogin({ ...userCred.user, role: 'customer' });
    } catch (e) { setError("Invalid Username or Password"); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-pink-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-pink-100">
        <div className="text-center mb-6">
          <div className="inline-block p-3 bg-pink-100 rounded-full mb-2"><User className="w-8 h-8 text-pink-600" /></div>
          <h2 className="text-2xl font-bold text-gray-800 capitalize">{mode}</h2>
        </div>

        <div className="space-y-4">
          <input className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-200 outline-none" placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />

          {mode !== 'login' && (
            <div className="flex gap-2">
              <input className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-200 outline-none" placeholder="Mobile (+91..)" value={form.phone} onChange={handlePhone} />
              {!otpSent ? <button onClick={() => setOtpSent(true)} className="bg-gray-800 text-white px-4 rounded-lg text-sm whitespace-nowrap hover:bg-gray-700">Send OTP</button>
                : <input className="w-24 p-3 border rounded-lg text-center" placeholder="OTP" maxLength={4} onChange={e => setForm({ ...form, otp: e.target.value })} />}
            </div>
          )}

          <input className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-200 outline-none" type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />

          {mode !== 'login' && (
            <input className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-200 outline-none" type="password" placeholder="Confirm Password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
          )}

          {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded font-medium">{error}</p>}

          <button onClick={mode === 'login' ? handleLogin : handleSignup} className="w-full bg-pink-600 text-white py-3 rounded-lg font-bold hover:bg-pink-700 shadow-lg transition-all">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <div className="text-center text-sm text-gray-500 space-y-3 pt-4 border-t">
            {mode === 'login' ? (
              <>
                <p>New here? <button onClick={() => setMode('signup')} className="font-bold text-gray-800 hover:text-pink-600">Sign Up</button></p>
              </>
            ) : (
              <p>Have account? <button onClick={() => setMode('login')} className="font-bold text-gray-800 hover:text-pink-600">Login</button></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Footer = ({ onAdminClick, onPrivacyClick }) => (
  <footer className="bg-gray-900 text-white pt-16 pb-8">
    <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-12 border-b border-gray-800 pb-12">
      <div className="space-y-4">
        <h3 className="text-2xl font-bold font-serif flex items-center"><Cake className="mr-2 text-pink-500" />Renu Bakery</h3>
        <p className="text-gray-400 text-sm leading-relaxed">Baking memories since 2024. We are dedicated to serving the finest, 100% vegetarian cakes with a touch of love and AI innovation.</p>
      </div>
      <div>
        <h4 className="font-bold text-lg mb-6 text-pink-500">Visit Us</h4>
        <div className="space-y-4 text-gray-400">
          <p className="flex items-start"><MapPin className="w-5 h-5 mr-3 text-gray-500 mt-1" /> <span>Near Binny's showroom, Janiganj Bazar, Kanakpur, Silchar, Assam 788001</span></p>
          <p className="flex items-center"><Phone className="w-5 h-5 mr-3 text-gray-500" /> +91 94355-66125</p>
          <p className="flex items-center"><Clock className="w-5 h-5 mr-3 text-gray-500" /> 10:00 AM - 8:00 PM</p>
        </div>
      </div>
      <div>
        <h4 className="font-bold text-lg mb-6 text-pink-500">Quick Links</h4>
        <ul className="space-y-2 text-gray-400 mb-6">
          <li><button onClick={onPrivacyClick} className="hover:text-white transition-colors">Privacy Policy</button></li>
          <li><button onClick={onAdminClick} className="hover:text-white transition-colors">Admin Login</button></li>
        </ul>
        <div className="flex space-x-4">
          <a href="https://api.whatsapp.com/send?phone=919435566125" target="_blank" className="bg-green-500 p-2 rounded-full hover:bg-green-600 transition-colors text-white shadow-lg hover:-translate-y-1 transform duration-200">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
          </a>
          <a href="https://www.instagram.com/renubakery/" target="_blank" className="bg-gray-800 p-2 rounded-full hover:bg-pink-600 transition-colors text-white"><Instagram className="w-5 h-5" /></a>
          <a href="https://www.facebook.com/convectionwithconfection/" target="_blank" className="bg-gray-800 p-2 rounded-full hover:bg-blue-600 transition-colors text-white"><Facebook className="w-5 h-5" /></a>
        </div>
      </div>
    </div>
    <div className="text-center text-gray-600 text-sm pt-8">
      &copy; 2024 Renu Bakery. All Rights Reserved.
    </div>
  </footer>
);

const App = () => {
  const [page, setPage] = useState('home');
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingCheckoutDetails, setPendingCheckoutDetails] = useState(null);
  const [lastOrderID, setLastOrderID] = useState(null);

  // Auth Listener for Firebase (Regular Customers)
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if this user is actually an admin defined in Firestore, 
        // OR if we have locally set a hardcoded admin (which won't trigger this, but protects state overwrite)
        if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin')) return;

        // Fetch role from Firestore if needed, defaulting to customer
        setCurrentUser({ ...user, role: 'customer' });
      } else {
        // Only clear if we aren't logged in as a hardcoded admin
        if (!currentUser || currentUser.uid.startsWith('firebase')) {
          setCurrentUser(null);
        }
      }
    });
    return () => unsub();
  }, [currentUser]);

  const addToCart = (item) => { setCartItems([...cartItems, item]); setCartOpen(true); };
  const removeFromCart = (id) => setCartItems(cartItems.filter(i => i.id !== id));

  const handleCheckoutSubmit = async (details, needsAuth) => {
    if (needsAuth) {
      setPendingCheckoutDetails(details);
      setShowAuthModal(true);
    } else {
      processOrder(details, currentUser ? currentUser.uid : 'guest');
    }
  };

  const processOrder = async (details, userId) => {
    // If db is missing (prototype mode), just simulate success to avoid breaking flow
    if (!db) {
      console.warn("Database not initialized. Simulating order success.");
      const fakeId = "ORD-" + Date.now();
      setLastOrderID(fakeId);
      setCartItems([]);
      setCartOpen(false);
      setPage('success');
      return;
    }

    const sub = cartItems.reduce((a, b) => a + b.price, 0);
    const total = sub + (details.deliveryMode === 'delivery' ? 80 : 0);

    try {
      const docRef = await addDoc(collection(db, "orders"), {
        userId: userId,
        customer: details,
        items: cartItems,
        total,
        status: 'Pending',
        date: new Date().toISOString()
      });
      setLastOrderID(docRef.id);
      setCartItems([]);
      setCartOpen(false);
      setPage('success');
    } catch (e) {
      alert("Order failed: " + e.message);
    }
  };

  const handleGuestContinue = () => {
    setShowAuthModal(false);
    if (pendingCheckoutDetails) processOrder(pendingCheckoutDetails, 'guest');
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (page === 'login') setPage('home');
    if (user.role === 'admin' || user.role === 'superadmin') setPage('admin-dashboard');

    // If coming from cart checkout login
    if (showAuthModal && pendingCheckoutDetails) {
      setShowAuthModal(false);
      processOrder(pendingCheckoutDetails, user.uid);
    }
  };

  const handleLogout = async () => {
    if (auth) await signOut(auth);
    setCurrentUser(null);
    setPage('home');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
      <Navbar cartCount={cartItems.length} setPage={setPage} activePage={page} toggleCart={() => setCartOpen(true)} currentUser={currentUser} onLogout={handleLogout} />

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} cartItems={cartItems} removeItem={removeFromCart} onCheckoutSubmit={handleCheckoutSubmit} currentUser={currentUser} />

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onGuest={handleGuestContinue} onLogin={handleLoginSuccess} setPage={setPage} />

      <div className="flex-grow">
        {page === 'home' && (
          <>
            <Hero setPage={setPage} />
            <ProcessSection />
            <GallerySection />
          </>
        )}
        {page === 'menu' && <MenuPage addToCart={addToCart} />}
        {page === 'ai-builder' && <AICakeBuilder addToCart={addToCart} />}
        {page === 'login' && <AuthPage onLogin={handleLoginSuccess} setPage={setPage} />}
        {page === 'my-orders' && currentUser && <OrderHistory userId={currentUser.uid} />}
        {page === 'admin-dashboard' && <AdminDashboard onLogout={handleLogout} currentUser={currentUser} />}
        {page === 'success' && <CheckoutSuccess setPage={setPage} orderId={lastOrderID} />}
        {page === 'privacy' && <PrivacyPolicy setPage={setPage} />}
      </div>

      <Footer
        onAdminClick={() => setPage('login')}
        onPrivacyClick={() => setPage('privacy')}
      />
    </div>
  );
};

export default App;