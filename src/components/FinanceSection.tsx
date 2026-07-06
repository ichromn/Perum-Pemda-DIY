import React, { useState } from 'react';
import { DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Plus, Search, Calendar, User, FileText, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { Transaction } from '../types';

interface FinanceSectionProps {
  transactions: Transaction[];
  isAdmin: boolean;
  onRefresh: () => void;
}

export const FinanceSection: React.FC<FinanceSectionProps> = ({
  transactions,
  isAdmin,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [type, setType] = useState<'Pemasukan' | 'Pengeluaran'>('Pemasukan');
  const [category, setCategory] = useState('Iuran Bulanan');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [loggedBy, setLoggedBy] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Formatting currency
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  // Calculations
  const totalIncome = transactions
    .filter(t => t.type === 'Pemasukan')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'Pengeluaran')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = totalIncome - totalExpense;

  // Categories by transaction type
  const incomeCategories = ['Iuran Bulanan', 'Sumbangan Donatur', 'Sponsor Kegiatan', 'Kas Sosial', 'Lain-lain'];
  const expenseCategories = ['Gaji Satpam / Petugas', 'Pengangkutan Sampah', 'Perbaikan & Perawatan Jalan', 'Listrik Pos Keamanan', 'Dana Sosial Santunan', 'Konsumsi Musyawarah', 'Peralatan Pos Ronda', 'Lain-lain'];

  const handleTypeChange = (newType: 'Pemasukan' | 'Pengeluaran') => {
    setType(newType);
    setCategory(newType === 'Pemasukan' ? incomeCategories[0] : expenseCategories[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description || !loggedBy) {
      setMessage({ type: 'error', text: 'Jumlah uang harus di atas 0, deskripsi & pencatat wajib diisi!' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const txData: Omit<Transaction, 'id'> = {
        type,
        category,
        amount,
        date: new Date().toISOString(),
        description: description.trim(),
        loggedBy: loggedBy.trim()
      };

      await addDoc(collection(db, 'transactions'), txData);
      setMessage({ type: 'success', text: `Transaksi ${type} sebesar ${formatRupiah(amount)} berhasil dicatat!` });

      // Reset
      setAmount(0);
      setDescription('');
      setLoggedBy('');
      setIsFormOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal menyimpan transaksi keuangan.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, desc: string, amt: number) => {
    if (!window.confirm(`Hapus pencatatan transaksi keuangan "${desc}" sebesar ${formatRupiah(amt)}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'transactions', id));
      setMessage({ type: 'success', text: 'Catatan keuangan berhasil dihapus.' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Group transaction amounts by category to make an interactive custom visual chart
  const categorySummary: Record<string, number> = {};
  transactions.forEach(t => {
    const key = `${t.type}:${t.category}`;
    categorySummary[key] = (categorySummary[key] || 0) + t.amount;
  });

  const incomeCategoriesData = incomeCategories.map(cat => ({
    name: cat,
    value: categorySummary[`Pemasukan:${cat}`] || 0
  })).filter(item => item.value > 0);

  const expenseCategoriesData = expenseCategories.map(cat => ({
    name: cat,
    value: categorySummary[`Pengeluaran:${cat}`] || 0
  })).filter(item => item.value > 0);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType ? t.type === filterType : true;
    return matchesSearch && matchesType;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6" id="finance-section">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold font-serif text-slate-800 flex items-center gap-2">
            <Wallet className="text-emerald-700" size={22} />
            Laporan Keuangan Transparan (Real-Time)
          </h2>
          <p className="text-slate-500 text-xs">
            Akses neraca pemasukan dan pengeluaran kas Paguyuban Banjardadap secara transparan, akuntabel, dan real-time.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => {
              handleTypeChange('Pemasukan');
              setIsFormOpen(!isFormOpen);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
          >
            <Plus size={16} /> {isFormOpen ? 'Tutup Formulir' : 'Catat Kas Masuk/Keluar'}
          </button>
        ) : (
          <div className="text-xs bg-slate-100 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg leading-relaxed">
            📢 <strong>Transparansi Publik:</strong> Seluruh warga berhak mengaudit kas. Tombol pencatatan kas dinonaktifkan di luar mode pengurus.
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center justify-between text-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
      )}

      {/* Admin Log Entry Form */}
      {isFormOpen && isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4 animate-fadeIn">
          <h3 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2">
            💰 Catat Arus Kas Baru (Pemasukan / Pengeluaran)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Tipe Arus Kas *</label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => handleTypeChange('Pemasukan')}
                  className={`w-1/2 py-2 text-center transition-colors ${type === 'Pemasukan' ? 'bg-emerald-700 text-white' : 'bg-slate-50 text-slate-600'}`}
                >
                  Pemasukan (In)
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('Pengeluaran')}
                  className={`w-1/2 py-2 text-center transition-colors ${type === 'Pengeluaran' ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                >
                  Pengeluaran (Out)
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Kategori Transaksi *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
              >
                {type === 'Pemasukan' 
                  ? incomeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                  : expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                }
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Nominal Rupiah (Rp) *</label>
              <input
                type="number"
                placeholder="Misal: 100000"
                value={amount || ''}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50 font-mono font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Nama Pencatat / Bendahara *</label>
              <input
                type="text"
                placeholder="Misal: Bu Joko / Bendahara"
                value={loggedBy}
                onChange={(e) => setLoggedBy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
                required
              />
            </div>

            <div className="space-y-1 md:col-span-2 lg:col-span-4">
              <label className="text-xs font-semibold text-slate-600 block">Deskripsi / Keterangan Transaksi *</label>
              <input
                type="text"
                placeholder="Contoh: Pembayaran iuran satpam bulanan untuk 4 unit petugas jaga malam"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-600 transition-colors"
            >
              Batalkan
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      )}

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Saldo Card */}
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-955 text-white rounded-xl p-6 shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <DollarSign size={100} />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200">Saldo Kas Tersedia</span>
            <h3 className="text-3xl font-bold font-mono text-amber-300">{formatRupiah(currentBalance)}</h3>
          </div>
          <p className="text-[11px] text-emerald-100/90 leading-relaxed">
            Sisa uang kas Paguyuban Banjardadap yang saat ini berada di tabungan bank & kas tunai bendahara.
          </p>
        </div>

        {/* Total Pemasukan Card */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm flex items-start justify-between">
          <div className="space-y-3">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Pemasukan Kas</span>
              <h3 className="text-2xl font-bold font-mono text-emerald-700">{formatRupiah(totalIncome)}</h3>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-md w-fit">
              <ArrowUpRight size={14} /> Real-time iuran & donatur
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
            <ArrowUpRight size={22} />
          </div>
        </div>

        {/* Total Pengeluaran Card */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm flex items-start justify-between">
          <div className="space-y-3">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Pengeluaran Kas</span>
              <h3 className="text-2xl font-bold font-mono text-rose-600">{formatRupiah(totalExpense)}</h3>
            </div>
            <div className="flex items-center gap-1 text-xs text-rose-600 font-semibold bg-rose-50 px-2 py-1 rounded-md w-fit">
              <ArrowDownRight size={14} /> Gaji satpam & operasional
            </div>
          </div>
          <div className="p-3 bg-rose-50 text-rose-700 rounded-lg">
            <ArrowDownRight size={22} />
          </div>
        </div>
      </div>

      {/* Grid: Charts & Visual Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Breakdown Chart */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-800 font-serif border-b border-slate-100 pb-2">
            📈 Distribusi Pemasukan Kas
          </h4>

          {incomeCategoriesData.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs italic">
              Belum ada data pemasukan kas tercatat.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {incomeCategoriesData.map((item, idx) => {
                const percentage = totalIncome > 0 ? (item.value / totalIncome) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                      <span>{item.name}</span>
                      <span className="font-mono">{formatRupiah(item.value)} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expense Breakdown Chart */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-800 font-serif border-b border-slate-100 pb-2">
            📉 Penggunaan / Pengeluaran Kas
          </h4>

          {expenseCategoriesData.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs italic">
              Belum ada data pengeluaran kas tercatat.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {expenseCategoriesData.map((item, idx) => {
                const percentage = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                      <span>{item.name}</span>
                      <span className="font-mono text-rose-700">{formatRupiah(item.value)} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transaction History Logs */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-slate-800 font-serif">
            📜 Riwayat Aliran Kas (Buku Ledger Kas)
          </h3>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Cari deskripsi, kategori..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
            >
              <option value="">Semua Aliran</option>
              <option value="Pemasukan">Pemasukan (+)</option>
              <option value="Pengeluaran">Pengeluaran (-)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <th className="p-4">Tanggal Log</th>
                <th className="p-4">Tipe</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Keterangan Transaksi</th>
                <th className="p-4 text-right">Nominal</th>
                <th className="p-4 text-center">Pencatat</th>
                {isAdmin && <th className="p-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-slate-400 text-xs">
                    Belum ada riwayat transaksi keuangan kas.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-mono text-xs text-slate-500">
                      {new Date(tx.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-0.5 ${
                        tx.type === 'Pemasukan' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {tx.type === 'Pemasukan' ? 'In' : 'Out'}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-600">{tx.category}</td>
                    <td className="p-4 text-xs text-slate-700 leading-relaxed font-sans">{tx.description}</td>
                    <td className={`p-4 text-right font-mono font-bold ${
                      tx.type === 'Pemasukan' ? 'text-emerald-700' : 'text-rose-600'
                    }`}>
                      {tx.type === 'Pemasukan' ? '+' : '-'}{formatRupiah(tx.amount)}
                    </td>
                    <td className="p-4 text-center text-slate-500 text-xs font-medium">{tx.loggedBy}</td>
                    {isAdmin && (
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDelete(tx.id, tx.description, tx.amount)}
                          className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                          title="Hapus Log Transaksi"
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
