import React, { useState } from 'react';
import { DollarSign, Filter, CreditCard, RefreshCw, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Resident, DuesPayment, Transaction } from '../types';

interface DuesSectionProps {
  payments: DuesPayment[];
  residents: Resident[];
  isAdmin: boolean;
  onRefresh: () => void;
}

export const DuesSection: React.FC<DuesSectionProps> = ({
  payments,
  residents,
  isAdmin,
  onRefresh
}) => {
  // Filter states
  const [filterResidentId, setFilterResidentId] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('2026');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [duesType, setDuesType] = useState<'Kebersihan' | 'Keamanan' | 'Sosial' | 'Kas Paguyuban' | 'Lainnya'>('Keamanan');
  const [amount, setAmount] = useState<number>(40000);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const getDuesStandardAmount = (type: string) => {
    switch (type) {
      case 'Keamanan': return 40000;
      case 'Kebersihan': return 25000;
      case 'Sosial': return 20000;
      case 'Kas Paguyuban': return 30000;
      default: return 50000;
    }
  };

  const handleDuesTypeChange = (type: string) => {
    setDuesType(type as any);
    setAmount(getDuesStandardAmount(type));
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResidentId) {
      setMessage({ type: 'error', text: 'Silakan pilih nama warga terlebih dahulu!' });
      return;
    }

    const resident = residents.find(r => r.id === selectedResidentId);
    if (!resident) return;

    setLoading(true);
    setMessage(null);

    try {
      // Create dues payment record
      // If submitted by Admin, we can directly set it as "Selesai" and log transaction.
      // If submitted by normal Warga, set status as "Pending".
      const initialStatus = isAdmin ? 'Selesai' : 'Pending';

      const paymentData: Omit<DuesPayment, 'id'> = {
        residentId: resident.id,
        residentName: resident.name,
        houseNumber: resident.houseNumber,
        type: duesType,
        amount,
        month,
        year,
        paymentDate: new Date().toISOString(),
        status: initialStatus,
        notes: notes.trim()
      };

      const payDocRef = await addDoc(collection(db, 'payments'), paymentData);

      // If finished (Selesai), write matching financial transaction
      if (initialStatus === 'Selesai') {
        const txData: Omit<Transaction, 'id'> = {
          type: 'Pemasukan',
          category: 'Iuran Bulanan',
          amount,
          date: new Date().toISOString(),
          description: `Iuran ${duesType} Bln ${month}/${year} - Rumah ${resident.houseNumber} (${resident.name})`,
          loggedBy: 'Sistem (Otomatis)'
        };
        await addDoc(collection(db, 'transactions'), txData);
      }

      setMessage({
        type: 'success',
        text: isAdmin 
          ? `Pembayaran iuran ${duesType} sebesar ${formatRupiah(amount)} untuk ${resident.name} berhasil disimpan dan diverifikasi!`
          : `Pembayaran iuran berhasil diajukan! Menunggu verifikasi oleh Bendahara.`
      });

      // Reset form
      setSelectedResidentId('');
      setNotes('');
      setIsFormOpen(false);
      onRefresh();
    } catch (err) {
      console.error("Error logging dues payment: ", err);
      setMessage({ type: 'error', text: 'Gagal mengajukan iuran. Silakan coba kembali.' });
    } finally {
      setLoading(false);
    }
  };

  // Verify pending payment (Admin only)
  const handleVerify = async (payment: DuesPayment, newStatus: 'Selesai' | 'Ditolak') => {
    try {
      setLoading(true);
      const payRef = doc(db, 'payments', payment.id);
      await updateDoc(payRef, { status: newStatus });

      if (newStatus === 'Selesai') {
        // Log transaction
        const txData: Omit<Transaction, 'id'> = {
          type: 'Pemasukan',
          category: 'Iuran Bulanan',
          amount: payment.amount,
          date: new Date().toISOString(),
          description: `Iuran ${payment.type} Bln ${payment.month}/${payment.year} - Rumah ${payment.houseNumber} (${payment.residentName})`,
          loggedBy: 'Bendahara'
        };
        await addDoc(collection(db, 'transactions'), txData);
        setMessage({ type: 'success', text: `Iuran ${payment.residentName} berhasil diverifikasi!` });
      } else {
        setMessage({ type: 'success', text: `Iuran ${payment.residentName} ditolak.` });
      }
      
      onRefresh();
    } catch (err) {
      console.error("Error verifying payment: ", err);
      setMessage({ type: 'error', text: 'Gagal memverifikasi pembayaran.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!window.confirm("Hapus data pembayaran iuran ini? (Uang kas tidak terpengaruh secara otomatis)")) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'payments', id));
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Months name array
  const monthsInd = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Filtering payments
  const filteredPayments = payments.filter(pay => {
    if (filterResidentId && pay.residentId !== filterResidentId) return false;
    if (filterMonth && pay.month !== parseInt(filterMonth)) return false;
    if (filterYear && pay.year !== parseInt(filterYear)) return false;
    if (filterType && pay.type !== filterType) return false;
    if (filterStatus && pay.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6" id="dues-section">
      {/* Header and Add Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold font-serif text-slate-800 flex items-center gap-2">
            <DollarSign className="text-emerald-700" size={22} />
            Pembayaran Iuran Rutin Warga
          </h2>
          <p className="text-slate-500 text-xs">
            Log iuran rutin seperti Keamanan, Kebersihan, Kas RT, dan dana Sosial secara real-time.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
        >
          <CreditCard size={16} /> {isFormOpen ? 'Tutup Formulir' : 'Bayar Iuran Rutin'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center justify-between text-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
      )}

      {/* Payment Entry Form */}
      {isFormOpen && (
        <form onSubmit={handleSubmitPayment} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4 animate-fadeIn">
          <h3 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            📝 {isAdmin ? 'Catat Iuran Warga (Langsung Selesai)' : 'Ajukan Pembayaran Iuran Warga'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Pilih Nama Warga / Rumah *</label>
              <select
                value={selectedResidentId}
                onChange={(e) => setSelectedResidentId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50"
                required
              >
                <option value="">-- Pilih Warga --</option>
                {residents.map(res => (
                  <option key={res.id} value={res.id}>
                    {res.name} (Rumah: {res.houseNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Jenis Iuran *</label>
              <select
                value={duesType}
                onChange={(e) => handleDuesTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50"
                required
              >
                <option value="Keamanan">Keamanan (Rp 40.000)</option>
                <option value="Kebersihan">Kebersihan (Rp 25.000)</option>
                <option value="Sosial">Sosial (Rp 20.000)</option>
                <option value="Kas Paguyuban">Kas Paguyuban (Rp 30.000)</option>
                <option value="Lainnya">Lainnya (Manual)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Jumlah Bayar (Rp) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                disabled={duesType !== 'Lainnya'}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50 disabled:opacity-80 disabled:bg-slate-100"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Untuk Bulan *</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50"
              >
                {monthsInd.map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Tahun *</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Catatan Transfer / Penerima</label>
              <input
                type="text"
                placeholder="Contoh: Transfer Bank BPD, Kas Tunai"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50"
              />
            </div>
          </div>

          {!isAdmin && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 leading-relaxed">
              💡 <strong>Perhatian:</strong> Karena Anda masuk sebagai Warga, pengajuan pembayaran Anda akan tersimpan dalam status <strong>"Pending"</strong>. Pembayaran akan terdaftar resmi di Laporan Keuangan real-time setelah dikonfirmasi & diverifikasi oleh pengurus/Bendahara.
            </div>
          )}

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
              {loading ? 'Memproses...' : (isAdmin ? 'Catat & Konfirmasi' : 'Ajukan Pembayaran')}
            </button>
          </div>
        </form>
      )}

      {/* Filter Section */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs uppercase tracking-wider">
          <Filter size={16} className="text-emerald-700" />
          Filter Iuran:
        </div>

        <select
          value={filterResidentId}
          onChange={(e) => setFilterResidentId(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
        >
          <option value="">Semua Warga</option>
          {residents.map(res => (
            <option key={res.id} value={res.id}>{res.name}</option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
        >
          <option value="">Semua Jenis Iuran</option>
          <option value="Keamanan">Keamanan</option>
          <option value="Kebersihan">Kebersihan</option>
          <option value="Sosial">Sosial</option>
          <option value="Kas Paguyuban">Kas Paguyuban</option>
          <option value="Lainnya">Lainnya</option>
        </select>

        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
        >
          <option value="">Semua Bulan</option>
          {monthsInd.map((m, idx) => (
            <option key={idx} value={idx + 1}>{m}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
        >
          <option value="">Semua Status</option>
          <option value="Selesai">Lunas / Selesai</option>
          <option value="Pending">Menunggu Verifikasi (Pending)</option>
          <option value="Ditolak">Ditolak</option>
        </select>

        <button
          onClick={() => {
            setFilterResidentId('');
            setFilterMonth('');
            setFilterType('');
            setFilterStatus('');
          }}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-colors ml-auto"
        >
          Reset Filter
        </button>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <th className="p-4">Tanggal Input</th>
                <th className="p-4">Nama Warga / Rumah</th>
                <th className="p-4">Jenis Iuran</th>
                <th className="p-4">Bulan / Tahun</th>
                <th className="p-4 text-right">Jumlah</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    Tidak ada catatan pembayaran iuran warga yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-4 font-mono text-xs text-slate-500">
                      {new Date(pay.paymentDate).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{pay.residentName}</div>
                      <div className="text-[10px] text-emerald-800 font-mono font-bold">Rumah: {pay.houseNumber}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        pay.type === 'Keamanan' ? 'bg-indigo-50 text-indigo-700' :
                        pay.type === 'Kebersihan' ? 'bg-emerald-50 text-emerald-700' :
                        pay.type === 'Sosial' ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {pay.type}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-600 text-xs">
                      {monthsInd[pay.month - 1]} {pay.year}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-slate-800">
                      {formatRupiah(pay.amount)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 border ${
                        pay.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        pay.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {pay.status === 'Selesai' && <CheckCircle2 size={12} />}
                        {pay.status === 'Pending' && <AlertCircle size={12} />}
                        {pay.status === 'Ditolak' && <XCircle size={12} />}
                        {pay.status === 'Selesai' ? 'Lunas / Terverifikasi' : pay.status === 'Pending' ? 'Perlu Verifikasi' : 'Ditolak'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {pay.status === 'Pending' && isAdmin && (
                          <>
                            <button
                              onClick={() => handleVerify(pay, 'Selesai')}
                              disabled={loading}
                              className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold transition-colors"
                            >
                              Selesai (Verifikasi)
                            </button>
                            <button
                              onClick={() => handleVerify(pay, 'Ditolak')}
                              disabled={loading}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold transition-colors"
                            >
                              Tolak
                            </button>
                          </>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeletePayment(pay.id)}
                            className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                            title="Hapus Record"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
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
