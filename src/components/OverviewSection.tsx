import React from 'react';
import { Users, FileText, Wallet, Moon, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';
import { Resident, DuesPayment, Announcement, RondaSchedule, Transaction } from '../types';

interface OverviewSectionProps {
  residents: Resident[];
  announcements: Announcement[];
  payments: DuesPayment[];
  ronda: RondaSchedule[];
  transactions: Transaction[];
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  residents,
  announcements,
  payments,
  ronda,
  transactions,
  setActiveTab,
  isAdmin
}) => {
  // Calculate stats
  const totalResidents = residents.length;
  const activeResidents = residents.filter(r => r.status === 'Aktif').length;
  
  // Calculate total cash
  const income = transactions
    .filter(t => t.type === 'Pemasukan')
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions
    .filter(t => t.type === 'Pengeluaran')
    .reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = income - expense;

  // Format currency
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  // Get current day name in Indonesian
  const daysEngToInd: Record<string, string> = {
    'Sunday': 'Minggu', 'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu',
    'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu'
  };
  const currentDayEng = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const currentDayInd = daysEngToInd[currentDayEng] || 'Senin';

  // Get tonight's ronda team
  const tonightRonda = ronda.find(r => r.dayName === currentDayInd);

  // Get recent announcements
  const recentAnnouncements = [...announcements]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // Get pending iuran payments
  const pendingPayments = payments.filter(p => p.status === 'Pending');

  return (
    <div className="space-y-6" id="overview-section">
      {/* Hero Welcome Header */}
      <div className="relative bg-emerald-900 text-white rounded-2xl p-6 md:p-8 overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles size={120} className="text-amber-400 animate-pulse" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="bg-emerald-800 text-amber-300 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase">
            Sistem Informasi Warga
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-amber-50">
            Paguyuban Perum Pemda DIY Banjardadap
          </h1>
          <p className="text-emerald-100 text-sm md:text-base leading-relaxed">
            Mewujudkan lingkungan perumahan yang guyub, rukun, aman, sejahtera, dan transparan. Selamat datang di portal resmi kepengurusan warga Banjardadap.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-xs bg-emerald-800/60 border border-emerald-700/80 px-2.5 py-1 rounded-md text-emerald-200">
              📍 Banjardadap, Yogyakarta
            </span>
            <span className="text-xs bg-emerald-800/60 border border-emerald-700/80 px-2.5 py-1 rounded-md text-emerald-200">
              🕒 Real-time Database Online
            </span>
            {isAdmin && (
              <span className="text-xs bg-amber-500/20 border border-amber-500/50 px-2.5 py-1 rounded-md text-amber-300 font-medium">
                🔑 Mode Pengurus Aktif
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Dashboard Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat: Total Kas */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Saldo Kas Paguyuban</p>
            <h3 className="text-2xl font-bold font-mono text-slate-800">{formatRupiah(currentBalance)}</h3>
            <div className="flex items-center gap-1.5 pt-2 text-xs">
              <span className="text-emerald-600 font-semibold">{formatRupiah(income)} masuk</span>
              <span className="text-slate-300">|</span>
              <span className="text-rose-600 font-semibold">{formatRupiah(expense)} keluar</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700">
            <Wallet size={20} />
          </div>
        </div>

        {/* Stat: Residents */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Jumlah Warga</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalResidents} Rumah</h3>
            <p className="text-slate-400 text-xs pt-2">
              <span className="text-emerald-600 font-medium">{activeResidents} Aktif</span> • {totalResidents - activeResidents} Pasif
            </p>
          </div>
          <div className="p-3 rounded-lg bg-indigo-50 text-indigo-700">
            <Users size={20} />
          </div>
        </div>

        {/* Stat: Ronda Malam Ini */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Ronda Malam Ini ({currentDayInd})</p>
            <h3 className="text-lg font-semibold text-slate-800 truncate max-w-[180px]">
              {tonightRonda && tonightRonda.participants.length > 0 
                ? tonightRonda.participants.slice(0, 2).join(', ') + (tonightRonda.participants.length > 2 ? '...' : '')
                : 'Belum Terjadwal'}
            </h3>
            <p className="text-slate-400 text-xs pt-2">
              Jam 22:00 - selesai
            </p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 text-amber-700">
            <Moon size={20} />
          </div>
        </div>

        {/* Stat: Total Pengumuman */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Informasi Komunitas</p>
            <h3 className="text-2xl font-bold text-slate-800">{announcements.length} Pengumuman</h3>
            <p className="text-emerald-600 text-xs font-medium pt-2">
              {announcements.filter(a => a.isPinned).length} Pinned info
            </p>
          </div>
          <div className="p-3 rounded-lg bg-orange-50 text-orange-700">
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* Grid: Announcements, Pending Dues, Tonight's Ronda Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Announcements Board */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 font-serif">Papan Pengumuman Terbaru</h2>
            <button 
              onClick={() => setActiveTab('announcements')}
              className="text-emerald-700 hover:text-emerald-800 font-semibold text-xs flex items-center gap-1 transition-colors"
            >
              Lihat Semua <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {recentAnnouncements.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Belum ada pengumuman yang dirilis.
              </div>
            ) : (
              recentAnnouncements.map(ann => (
                <div key={ann.id} className="p-4 rounded-lg bg-slate-50 border border-slate-100/80 space-y-2 hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        ann.category === 'Urgent' ? 'bg-rose-100 text-rose-700' :
                        ann.category === 'Undangan' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {ann.category}
                      </span>
                      <h4 className="font-bold text-sm text-slate-800 pt-1">{ann.title}</h4>
                    </div>
                    {ann.isPinned && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        📌 Pinned
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                    {ann.content}
                  </p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
                    <span>Oleh: {ann.author}</span>
                    <span>{new Date(ann.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Tasks / Quick Action / Pending Payments */}
        <div className="space-y-6">
          {/* Tonight's Ronda List */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h3 className="text-md font-bold text-slate-800 flex items-center gap-2 font-serif">
              <Moon size={18} className="text-amber-500" />
              Petugas Ronda Malam Ini
            </h3>

            {tonightRonda && tonightRonda.participants.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {tonightRonda.participants.map((person, idx) => (
                    <span key={idx} className="bg-amber-50 text-amber-800 border border-amber-200/50 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm">
                      👤 {person}
                    </span>
                  ))}
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100/80 text-[11px] text-slate-500 leading-relaxed">
                  <strong>Catatan:</strong> {tonightRonda.notes || "Harap hadir tepat waktu dan mengisi buku absensi di pos ronda."}
                </div>
                <button 
                  onClick={() => setActiveTab('ronda')}
                  className="w-full text-center py-2 border border-slate-200 hover:border-emerald-700 hover:text-emerald-800 rounded-lg text-xs font-semibold text-slate-600 transition-all bg-white"
                >
                  Ubah / Lihat Jadwal Pekanan
                </button>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-sm">
                Tidak ada ronda terjadwal malam ini.
              </div>
            )}
          </div>

          {/* Pending Verification Notice for Admins */}
          {isAdmin && (
            <div className="bg-amber-50/50 rounded-xl border border-amber-200/60 p-5 space-y-3">
              <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                <AlertCircle size={16} />
                Iuran Menunggu Verifikasi
              </h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Ada <strong className="text-amber-800 font-bold">{pendingPayments.length} pembayaran iuran</strong> warga yang perlu dikonfirmasi agar masuk ke laporan keuangan kas.
              </p>
              <button 
                onClick={() => setActiveTab('dues')}
                className="w-full text-center py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                Buka Verifikasi Iuran
              </button>
            </div>
          )}

          {/* Citizen Quick Info */}
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 space-y-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700 uppercase tracking-wider block mb-1">Informasi Layanan RT</span>
            <p>☎️ Keamanan Kompleks: 0811-XXXX-YYYY</p>
            <p>💡 Gangguan PLN/Air: 0812-XXXX-ZZZZ</p>
            <p>🏠 Balai Pertemuan: Banjardadap RT 02</p>
          </div>
        </div>
      </div>
    </div>
  );
};
