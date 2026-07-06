import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  PlusCircle, 
  Coins, 
  TrendingDown, 
  TrendingUp, 
  User, 
  Calendar, 
  Search, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Receipt,
  ArrowRight,
  HandCoins,
  History
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc, writeBatch, getDocs, where } from 'firebase/firestore';
import { Resident, Loan, LoanInstallment, Transaction } from '../types';

interface SavingsLoansSectionProps {
  residents: Resident[];
  isAdmin: boolean;
  onRefresh: () => void;
}

export const SavingsLoansSection: React.FC<SavingsLoansSectionProps> = ({
  residents,
  isAdmin,
  onRefresh
}) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installments, setInstallments] = useState<LoanInstallment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states - New Loan
  const [isLoanFormOpen, setIsLoanFormOpen] = useState(false);
  const [loanResidentId, setLoanResidentId] = useState('');
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [loanDate, setLoanDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [loanDueDate, setLoanDueDate] = useState<string>('');
  const [loanNotes, setLoanNotes] = useState('');

  // Form states - Installment
  const [isInstallmentFormOpen, setIsInstallmentFormOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState<number>(0);
  const [installmentDate, setInstallmentDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [installmentNotes, setInstallmentNotes] = useState('');

  // Real-time Listeners
  useEffect(() => {
    const qLoans = query(collection(db, 'loans'));
    const unsubscribeLoans = onSnapshot(qLoans, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
      list.sort((a, b) => new Date(b.loanDate).getTime() - new Date(a.loanDate).getTime());
      setLoans(list);
    }, (err) => {
      console.error("Error fetching loans:", err);
    });

    const qInstallments = query(collection(db, 'loan_installments'));
    const unsubscribeInstallments = onSnapshot(qInstallments, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoanInstallment));
      list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
      setInstallments(list);
    }, (err) => {
      console.error("Error fetching installments:", err);
    });

    return () => {
      unsubscribeLoans();
      unsubscribeInstallments();
    };
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  // Calculations
  const totalActiveLoansAmount = loans
    .filter(l => l.status === 'Belum Lunas')
    .reduce((sum, l) => sum + l.remainingAmount, 0);

  const totalGrantedLoansAmount = loans
    .reduce((sum, l) => sum + l.amount, 0);

  const totalPaidLoansAmount = totalGrantedLoansAmount - totalActiveLoansAmount;

  const activeBorrowersCount = Array.from(
    new Set(loans.filter(l => l.status === 'Belum Lunas').map(l => l.residentId))
  ).length;

  // Handlers - Submit Loan
  const handleSubmitLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanResidentId) {
      setMessage({ type: 'error', text: 'Silakan pilih warga peminjam terlebih dahulu!' });
      return;
    }
    if (loanAmount <= 0) {
      setMessage({ type: 'error', text: 'Jumlah pinjaman harus lebih besar dari Rp 0!' });
      return;
    }

    const resident = residents.find(r => r.id === loanResidentId);
    if (!resident) return;

    setLoading(true);
    setMessage(null);

    try {
      // 1. Save Loan Doc
      const newLoan: Omit<Loan, 'id'> = {
        residentId: resident.id,
        residentName: resident.name,
        houseNumber: resident.houseNumber,
        amount: loanAmount,
        remainingAmount: loanAmount,
        loanDate: new Date(loanDate).toISOString(),
        dueDate: loanDueDate ? new Date(loanDueDate).toISOString() : undefined,
        status: 'Belum Lunas',
        notes: loanNotes.trim()
      };

      await addDoc(collection(db, 'loans'), newLoan);

      // 2. Save Financial Transaction (Pengeluaran Simpan Pinjam)
      const txData: Omit<Transaction, 'id'> = {
        type: 'Pengeluaran',
        category: 'Simpan Pinjam',
        amount: loanAmount,
        date: new Date(loanDate).toISOString(),
        description: `Pinjaman Kas - ${resident.name} (Rumah ${resident.houseNumber})`,
        loggedBy: 'Bendahara (Otomatis)'
      };
      await addDoc(collection(db, 'transactions'), txData);

      setMessage({ 
        type: 'success', 
        text: `Berhasil mencatatkan pinjaman sebesar ${formatRupiah(loanAmount)} untuk ${resident.name}. Kas keuangan otomatis berkurang.` 
      });

      // Reset
      setLoanResidentId('');
      setLoanAmount(0);
      setLoanNotes('');
      setLoanDueDate('');
      setIsLoanFormOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: `Gagal mencatat pinjaman: ${errorMsg}` });
    } finally {
      setLoading(false);
    }
  };

  // Handlers - Submit Installment
  const handleSubmitInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId) {
      setMessage({ type: 'error', text: 'Silakan pilih catatan pinjaman terlebih dahulu!' });
      return;
    }
    if (installmentAmount <= 0) {
      setMessage({ type: 'error', text: 'Jumlah angsuran harus lebih besar dari Rp 0!' });
      return;
    }

    const targetLoan = loans.find(l => l.id === selectedLoanId);
    if (!targetLoan) return;

    if (installmentAmount > targetLoan.remainingAmount) {
      setMessage({ 
        type: 'error', 
        text: `Jumlah bayar (${formatRupiah(installmentAmount)}) tidak boleh melebihi sisa pinjaman (${formatRupiah(targetLoan.remainingAmount)})!` 
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // 1. Save Installment Document
      const newInstallment: Omit<LoanInstallment, 'id'> = {
        loanId: targetLoan.id,
        residentName: targetLoan.residentName,
        amount: installmentAmount,
        paymentDate: new Date(installmentDate).toISOString(),
        notes: installmentNotes.trim()
      };
      await addDoc(collection(db, 'loan_installments'), newInstallment);

      // 2. Update Loan remaining amount & status
      const newRemaining = targetLoan.remainingAmount - installmentAmount;
      const isSettled = newRemaining <= 0;
      const loanRef = doc(db, 'loans', targetLoan.id);
      await updateDoc(loanRef, {
        remainingAmount: newRemaining,
        status: isSettled ? 'Lunas' : 'Belum Lunas'
      });

      // 3. Log Financial Transaction (Pemasukan Simpan Pinjam)
      const txData: Omit<Transaction, 'id'> = {
        type: 'Pemasukan',
        category: 'Simpan Pinjam',
        amount: installmentAmount,
        date: new Date(installmentDate).toISOString(),
        description: `Angsuran/Pelunasan Pinjaman - ${targetLoan.residentName} (Rumah ${targetLoan.houseNumber})`,
        loggedBy: 'Bendahara (Otomatis)'
      };
      await addDoc(collection(db, 'transactions'), txData);

      setMessage({
        type: 'success',
        text: `Pemasukan angsuran sebesar ${formatRupiah(installmentAmount)} untuk ${targetLoan.residentName} berhasil disimpan. Kas keuangan otomatis bertambah.`
      });

      // Reset
      setSelectedLoanId('');
      setInstallmentAmount(0);
      setInstallmentNotes('');
      setIsInstallmentFormOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: `Gagal mencatat angsuran: ${errorMsg}` });
    } finally {
      setLoading(false);
    }
  };

  // Handlers - Delete Loan
  const handleDeleteLoan = async (id: string) => {
    const target = loans.find(l => l.id === id);
    if (!target) return;

    if (!window.confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus catatan pinjaman ${target.residentName} sebesar ${formatRupiah(target.amount)}? \n(Hal ini tidak mempengaruhi pencatatan kas secara otomatis, sisa pinjaman akan dihapus dari sistem.)`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'loans', id));
      setMessage({ type: 'success', text: `Berhasil menghapus catatan pinjaman ${target.residentName}.` });
      onRefresh();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal menghapus catatan pinjaman.' });
    } finally {
      setLoading(false);
    }
  };

  // Filter loans
  const filteredLoans = loans.filter(l => {
    const matchesSearch = l.residentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          l.houseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus ? l.status === filterStatus : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" id="savings-loans-section">
      {/* Header and Add Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold font-serif text-slate-800 flex items-center gap-2">
            <Coins className="text-emerald-700" size={22} />
            Sistem Simpan Pinjam Paguyuban
          </h2>
          <p className="text-slate-500 text-xs">
            Kelola dan pantau pinjaman kas mandiri warga, sisa cicilan, serta historis angsuran lunas.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setIsLoanFormOpen(!isLoanFormOpen);
                setIsInstallmentFormOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
            >
              <HandCoins size={14} />
              {isLoanFormOpen ? 'Tutup Formulir' : 'Catat Pinjaman Baru'}
            </button>
            <button
              onClick={() => {
                setIsInstallmentFormOpen(!isInstallmentFormOpen);
                setIsLoanFormOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
            >
              <Receipt size={14} />
              {isInstallmentFormOpen ? 'Tutup Formulir' : 'Catat Angsuran'}
            </button>
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

      {/* Forms Section */}
      {isLoanFormOpen && (
        <form onSubmit={handleSubmitLoan} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4 animate-fadeIn">
          <h3 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            🤝 Pencatatan Pinjaman Kas Baru
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Pilih Warga Peminjam *</label>
              <select
                value={loanResidentId}
                onChange={(e) => setLoanResidentId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
                required
              >
                <option value="">-- Pilih Warga --</option>
                {residents.map(r => (
                  <option key={r.id} value={r.id}>{r.name} (Rumah {r.houseNumber})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Jumlah Pinjaman (Rp) *</label>
              <input
                type="number"
                placeholder="Contoh: 1000000"
                value={loanAmount || ''}
                onChange={(e) => setLoanAmount(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Tanggal Pinjam *</label>
              <input
                type="date"
                value={loanDate}
                onChange={(e) => setLoanDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Tanggal Jatuh Tempo (Opsional)</label>
              <input
                type="date"
                value={loanDueDate}
                onChange={(e) => setLoanDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 block">Keterangan / Keperluan Pinjam</label>
            <input
              type="text"
              placeholder="Contoh: Pinjaman modal usaha mikro, keperluan darurat kesehatan"
              value={loanNotes}
              onChange={(e) => setLoanNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
            />
          </div>

          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 leading-relaxed">
            ⚠️ <strong>Perhatian:</strong> Menyimpan transaksi ini akan otomatis mengurangi uang kas RT sebesar total pinjaman dan menambah log pengeluaran dengan kategori "Simpan Pinjam".
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsLoanFormOpen(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-600 transition-colors"
            >
              Batalkan
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Simpan & Potong Kas'}
            </button>
          </div>
        </form>
      )}

      {isInstallmentFormOpen && (
        <form onSubmit={handleSubmitInstallment} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4 animate-fadeIn">
          <h3 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            💸 Pencatatan Angsuran / Pelunasan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Pilih Pinjaman Aktif *</label>
              <select
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
                required
              >
                <option value="">-- Pilih Pinjaman --</option>
                {loans.filter(l => l.status === 'Belum Lunas').map(l => (
                  <option key={l.id} value={l.id}>
                    {l.residentName} (Sisa: {formatRupiah(l.remainingAmount)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Jumlah Angsuran (Rp) *</label>
              <input
                type="number"
                placeholder="Contoh: 200000"
                value={installmentAmount || ''}
                onChange={(e) => setInstallmentAmount(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Tanggal Angsuran *</label>
              <input
                type="date"
                value={installmentDate}
                onChange={(e) => setInstallmentDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 block">Catatan Tambahan</label>
            <input
              type="text"
              placeholder="Contoh: Angsuran Bulan 1, Pelunasan Tunai"
              value={installmentNotes}
              onChange={(e) => setInstallmentNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
            />
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 leading-relaxed">
            💡 <strong>Perhatian:</strong> Pembayaran ini akan otomatis menambah uang kas RT dan tercatat sebagai "Pemasukan" pada kategori "Simpan Pinjam".
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInstallmentFormOpen(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-600 transition-colors"
            >
              Batalkan
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Simpan Angsuran'}
            </button>
          </div>
        </form>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pinjaman Aktif</p>
            <h3 className="text-lg font-extrabold text-rose-700 font-mono">{formatRupiah(totalActiveLoansAmount)}</h3>
            <p className="text-[10px] text-slate-500">Sisa dana yang harus dikembalikan</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-700 rounded-lg">
            <TrendingDown size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Pinjaman Diberikan</p>
            <h3 className="text-lg font-extrabold text-slate-700 font-mono">{formatRupiah(totalGrantedLoansAmount)}</h3>
            <p className="text-[10px] text-slate-500">Akumulasi total pinjaman bergulir</p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-lg">
            <Coins size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Angsuran Masuk</p>
            <h3 className="text-lg font-extrabold text-emerald-700 font-mono">{formatRupiah(totalPaidLoansAmount)}</h3>
            <p className="text-[10px] text-slate-500">Total dana kas yang telah kembali</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Warga Meminjam</p>
            <h3 className="text-xl font-extrabold text-slate-800">{activeBorrowersCount} Rumah</h3>
            <p className="text-[10px] text-slate-500">Peminjam aktif dengan sisa tagihan</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg">
            <User size={22} />
          </div>
        </div>
      </div>

      {/* Main List and History Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loans Table List */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              📋 Daftar Peminjam Kas Paguyuban
            </h3>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari peminjam..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs w-40 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
              >
                <option value="">Semua Status</option>
                <option value="Belum Lunas">Belum Lunas</option>
                <option value="Lunas">Lunas</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto flex-grow">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3">Nama / Rumah</th>
                  <th className="p-3">Tanggal Pinjam</th>
                  <th className="p-3 text-right">Total Pinjam</th>
                  <th className="p-3 text-right">Sisa Cicilan</th>
                  <th className="p-3 text-center">Status</th>
                  {isAdmin && <th className="p-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-slate-400">
                      Tidak ada catatan pinjaman kas yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  filteredLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{loan.residentName}</div>
                        <div className="text-[10px] text-emerald-800 font-mono font-bold">Rumah {loan.houseNumber}</div>
                        {loan.notes && <div className="text-[10px] text-slate-400 italic mt-0.5">Ket: {loan.notes}</div>}
                      </td>
                      <td className="p-3 text-slate-500 font-mono">
                        <div>Pinjam: {new Date(loan.loanDate).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                        {loan.dueDate && (
                          <div className="text-[10px] text-amber-700">Tempo: {new Date(loan.dueDate).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-700 font-mono">
                        {formatRupiah(loan.amount)}
                      </td>
                      <td className="p-3 text-right font-bold font-mono">
                        <span className={loan.remainingAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {formatRupiah(loan.remainingAmount)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${
                          loan.status === 'Lunas' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {loan.status === 'Lunas' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                          {loan.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteLoan(loan.id)}
                            className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                            title="Hapus Pinjaman"
                          >
                            <Trash2 size={14} />
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

        {/* Repayments / Installment Logs */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-1.5 mb-3">
            <History size={16} className="text-amber-600" />
            Riwayat Angsuran Masuk
          </h3>

          <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1 flex-grow">
            {installments.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-8">Belum ada riwayat angsuran.</p>
            ) : (
              installments.map((inst) => (
                <div key={inst.id} className="p-3 bg-slate-50 hover:bg-slate-100/50 transition-colors rounded-lg border border-slate-100 flex flex-col gap-1.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">{inst.residentName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(inst.paymentDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-700 font-mono">
                      +{formatRupiah(inst.amount)}
                    </span>
                  </div>
                  {inst.notes && (
                    <div className="text-[10px] text-slate-500 italic bg-white/60 px-2 py-1 rounded border border-slate-100">
                      {inst.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
