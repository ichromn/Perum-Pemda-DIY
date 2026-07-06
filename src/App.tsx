import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { checkAndSeedDatabase } from './utils/seed';
import { Resident, DuesPayment, Announcement, RondaSchedule, Transaction } from './types';

// Import components
import { OverviewSection } from './components/OverviewSection';
import { ResidentSection } from './components/ResidentSection';
import { DuesSection } from './components/DuesSection';
import { AnnouncementSection } from './components/AnnouncementSection';
import { RondaSection } from './components/RondaSection';
import { FinanceSection } from './components/FinanceSection';

// Icons
import { 
  Home, 
  Users, 
  DollarSign, 
  Megaphone, 
  Moon, 
  TrendingUp, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  MapPin, 
  PhoneCall,
  Loader2,
  Info
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // Default to viewer/penonton mode initially
  const [adminUsernameInput, setAdminUsernameInput] = useState<string>('');
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);

  // Firestore state
  const [residents, setResidents] = useState<Resident[]>([]);
  const [payments, setPayments] = useState<DuesPayment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [ronda, setRonda] = useState<RondaSchedule[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dbLoading, setDbLoading] = useState<boolean>(true);

  // Initialize and Seed Database
  useEffect(() => {
    async function initDb() {
      try {
        await checkAndSeedDatabase();
      } catch (err) {
        console.error("Failed to seed database:", err);
      }
    }
    initDb();
  }, []);

  // Real-time Firestore Listeners
  useEffect(() => {
    setDbLoading(true);

    // 1. Listen to Residents
    const resQuery = query(collection(db, 'residents'));
    const unsubscribeResidents = onSnapshot(resQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resident));
      // Sort by registered time descending
      list.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
      setResidents(list);
    }, (error) => {
      console.error("Error reading residents:", error);
    });

    // 2. Listen to Payments
    const payQuery = query(collection(db, 'payments'));
    const unsubscribePayments = onSnapshot(payQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DuesPayment));
      list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
      setPayments(list);
    }, (error) => {
      console.error("Error reading payments:", error);
    });

    // 3. Listen to Announcements
    const annQuery = query(collection(db, 'announcements'));
    const unsubscribeAnnouncements = onSnapshot(annQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAnnouncements(list);
    }, (error) => {
      console.error("Error reading announcements:", error);
    });

    // 4. Listen to Ronda Schedule
    const rondaQuery = query(collection(db, 'ronda'));
    const unsubscribeRonda = onSnapshot(rondaQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RondaSchedule));
      // Order days correctly
      const daysOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      list.sort((a, b) => daysOrder.indexOf(a.dayName) - daysOrder.indexOf(b.dayName));
      setRonda(list);
    }, (error) => {
      console.error("Error reading ronda:", error);
    });

    // 5. Listen to Transactions
    const txQuery = query(collection(db, 'transactions'));
    const unsubscribeTransactions = onSnapshot(txQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(list);
      setDbLoading(false);
    }, (error) => {
      console.error("Error reading transactions:", error);
      setDbLoading(false);
    });

    return () => {
      unsubscribeResidents();
      unsubscribePayments();
      unsubscribeAnnouncements();
      unsubscribeRonda();
      unsubscribeTransactions();
    };
  }, []);

  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const user = adminUsernameInput.trim();
    const pass = adminPasswordInput;
    if (user === 'admin' && (pass === 'perumpemdaDIY#' || pass === 'pemda123')) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminUsernameInput('');
      setAdminPasswordInput('');
    } else {
      alert('Username atau Password Pengurus salah! Silakan periksa kembali.');
    }
  };

  const forceTabRefresh = () => {
    // Simply to trigger a quick UI sync reference if needed by children
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" id="app-container">
      
      {/* Top Heritage Accent Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-800 via-amber-500 to-emerald-900"></div>

      {/* Main Navigation Header */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo/Brand */}
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-800 text-amber-300 rounded-lg flex items-center justify-center shadow-md">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <h1 className="text-md sm:text-lg font-serif font-bold text-emerald-900 leading-tight">
                  Perum Pemda DIY Banjardadap
                </h1>
                <p className="text-[10px] text-slate-500 font-mono tracking-wider font-semibold uppercase">
                  Daerah Istimewa Yogyakarta
                </p>
              </div>
            </div>

            {/* Admin Override Controller */}
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                  <span className="text-xs font-bold text-emerald-800 hidden sm:inline">PENGURUS / ADMIN</span>
                  <button 
                    onClick={() => setIsAdmin(false)}
                    className="text-[10px] bg-slate-200 hover:bg-slate-300 px-2 py-0.5 rounded text-slate-700 transition-colors font-bold"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300/60 text-amber-800 rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  <ShieldAlert size={14} /> Log Pengurus
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Admin Login Modal Overlay */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="text-emerald-700" size={20} />
              <h3 className="font-bold text-slate-800">Login Administrator Paguyuban</h3>
            </div>
            
            <form onSubmit={handleAdminVerify} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Silakan masuk menggunakan akun pengurus untuk mengelola data warga, iuran, jadwal ronda, pengumuman, dan keuangan.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Nama Pengguna (Username)</label>
                <input
                  type="text"
                  placeholder="Masukkan: admin"
                  value={adminUsernameInput}
                  onChange={(e) => setAdminUsernameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
                  autoFocus
                  required
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Kata Sandi (Password)</label>
                <input
                  type="password"
                  placeholder="Masukkan password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
                  required
                />
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] space-y-1 text-slate-500 font-mono">
                <div>• Username: <strong className="text-slate-800 font-sans">admin</strong></div>
                <div>• Password: <strong className="text-slate-800 font-sans">perumpemdaDIY#</strong></div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminLogin(false);
                    setAdminUsernameInput('');
                    setAdminPasswordInput('');
                  }}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  Masuk Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secondary Quick Contact Header */}
      <div className="bg-emerald-900 text-emerald-100/90 py-2 border-b border-emerald-800 text-center text-xs px-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 font-sans">
        <span className="flex items-center gap-1">
          <MapPin size={12} className="text-amber-400" />
          Perum Pemda DIY, Banjardadap, Potorono, Banguntapan, Bantul, D.I. Yogyakarta
        </span>
        <span className="hidden md:inline text-emerald-700">|</span>
        <span className="flex items-center gap-1">
          <PhoneCall size={12} className="text-amber-400" />
          Emergency Jaga Warga: 0811-300-3000
        </span>
      </div>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Real-time Loader State */}
        {dbLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white border border-slate-100 rounded-2xl shadow-xs">
            <Loader2 className="animate-spin text-emerald-700" size={40} />
            <p className="text-slate-500 font-medium text-sm">Menghubungkan ke Database Online Firestore...</p>
          </div>
        ) : (
          <>
            {/* Access Mode Notice Banner */}
            {!isAdmin ? (
              <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-800 rounded-lg flex items-center justify-center self-start sm:self-center">
                    <Info size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 font-serif">Mode Penonton (Warga / Tamu) Aktif</h4>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Anda sedang melihat portal dalam status <strong>Penonton</strong>. Anda dapat mengirimkan pendaftaran warga baru mandiri, melaporkan pembayaran iuran bulanan Anda, dan melihat transparansi kas. Untuk fitur edit/delete & kelola sistem penuh, laksanakan <strong>Login Pengurus</strong>.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="flex-shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-xs"
                >
                  Masuk Mode Pengurus
                </button>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/60 border border-emerald-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-800 rounded-lg flex items-center justify-center self-start sm:self-center animate-pulse">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 font-serif">🔑 Mode Pengurus (Administrator) Aktif</h4>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Selamat datang, Pengurus. Anda kini memiliki hak penuh untuk menyetujui/menolak pengajuan iuran warga, memplot jadwal ronda resmi, merilis pengumuman, dan menambah/mengedit database warga secara langsung.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsAdmin(false);
                    alert('Anda telah keluar dari Mode Pengurus.');
                  }}
                  className="flex-shrink-0 bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-xs"
                >
                  Keluar Mode Pengurus
                </button>
              </div>
            )}

            {/* Visual Navigation Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
              
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-emerald-800 text-amber-300 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Home size={16} /> Ringkasan
              </button>

              <button
                onClick={() => setActiveTab('residents')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'residents'
                    ? 'bg-emerald-800 text-amber-300 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users size={16} /> Data Warga
              </button>

              <button
                onClick={() => setActiveTab('dues')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'dues'
                    ? 'bg-emerald-800 text-amber-300 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <DollarSign size={16} /> Iuran Rutin
              </button>

              <button
                onClick={() => setActiveTab('announcements')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'announcements'
                    ? 'bg-emerald-800 text-amber-300 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Megaphone size={16} /> Pengumuman
              </button>

              <button
                onClick={() => setActiveTab('ronda')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'ronda'
                    ? 'bg-emerald-800 text-amber-300 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Moon size={16} /> Jadwal Ronda
              </button>

              <button
                onClick={() => setActiveTab('finance')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'finance'
                    ? 'bg-emerald-800 text-amber-300 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <TrendingUp size={16} /> Keuangan Kas
              </button>

            </div>

            {/* Tab Contents */}
            <div className="transition-all duration-300">
              {activeTab === 'overview' && (
                <OverviewSection 
                  residents={residents}
                  announcements={announcements}
                  payments={payments}
                  ronda={ronda}
                  transactions={transactions}
                  setActiveTab={setActiveTab}
                  isAdmin={isAdmin}
                />
              )}

              {activeTab === 'residents' && (
                <ResidentSection 
                  residents={residents}
                  isAdmin={isAdmin}
                  onRefresh={forceTabRefresh}
                />
              )}

              {activeTab === 'dues' && (
                <DuesSection 
                  payments={payments}
                  residents={residents}
                  isAdmin={isAdmin}
                  onRefresh={forceTabRefresh}
                />
              )}

              {activeTab === 'announcements' && (
                <AnnouncementSection 
                  announcements={announcements}
                  isAdmin={isAdmin}
                  onRefresh={forceTabRefresh}
                />
              )}

              {activeTab === 'ronda' && (
                <RondaSection 
                  ronda={ronda}
                  residents={residents}
                  isAdmin={isAdmin}
                  onRefresh={forceTabRefresh}
                />
              )}

              {activeTab === 'finance' && (
                <FinanceSection 
                  transactions={transactions}
                  isAdmin={isAdmin}
                  onRefresh={forceTabRefresh}
                />
              )}
            </div>
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <p className="font-serif font-bold text-slate-200">Paguyuban Perum Pemda DIY Banjardadap</p>
            <p>Sistem Informasi Layanan Warga Mandiri & Akuntabel • RT 02 Banjardadap</p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1 font-mono">
            <span>Powered by Google Firestore Online DB</span>
            <span>Version 2.5.0 (Yogyakarta Heritage Slate)</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
