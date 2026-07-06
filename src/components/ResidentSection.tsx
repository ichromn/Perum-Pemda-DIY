import React, { useState } from 'react';
import { Search, UserPlus, Edit2, Trash2, Check, X, ShieldAlert, Users } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Resident } from '../types';

interface ResidentSectionProps {
  residents: Resident[];
  isAdmin: boolean;
  onRefresh: () => void;
}

export const ResidentSection: React.FC<ResidentSectionProps> = ({
  residents,
  isAdmin,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [familySize, setFamilySize] = useState<number>(3);
  const [status, setStatus] = useState<'Aktif' | 'Pasif'>('Aktif');
  const [occupation, setOccupation] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const resetForm = () => {
    setName('');
    setHouseNumber('');
    setPhoneNumber('');
    setFamilySize(3);
    setStatus('Aktif');
    setOccupation('');
    setEditingId(null);
  };

  const handleEditClick = (resident: Resident) => {
    setName(resident.name);
    setHouseNumber(resident.houseNumber);
    setPhoneNumber(resident.phoneNumber);
    setFamilySize(resident.familySize);
    setStatus(resident.status);
    setOccupation(resident.occupation);
    setEditingId(resident.id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !houseNumber || !phoneNumber) {
      setMessage({ type: 'error', text: 'Nama, No Rumah, dan No Telepon wajib diisi!' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const data = {
        name,
        houseNumber,
        phoneNumber,
        familySize,
        status,
        occupation,
        registeredAt: new Date().toISOString()
      };

      if (editingId) {
        // Update existing
        const docRef = doc(db, 'residents', editingId);
        await updateDoc(docRef, data);
        setMessage({ type: 'success', text: `Data warga "${name}" berhasil diperbarui!` });
      } else {
        // Add new
        await addDoc(collection(db, 'residents'), data);
        setMessage({ type: 'success', text: `Warga "${name}" berhasil didaftarkan!` });
      }

      resetForm();
      setIsFormOpen(false);
      onRefresh();
    } catch (error) {
      console.error("Error writing resident: ", error);
      setMessage({ type: 'error', text: 'Gagal memproses data. Silakan coba lagi.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, citizenName: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data warga "${citizenName}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'residents', id));
      setMessage({ type: 'success', text: `Data warga "${citizenName}" berhasil dihapus.` });
      onRefresh();
    } catch (error) {
      console.error("Error deleting resident: ", error);
      setMessage({ type: 'error', text: 'Gagal menghapus data warga.' });
    }
  };

  // Filtered list
  const filteredResidents = residents.filter(res => {
    const term = searchTerm.toLowerCase();
    return (
      res.name.toLowerCase().includes(term) ||
      res.houseNumber.toLowerCase().includes(term) ||
      res.occupation.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6" id="resident-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold font-serif text-slate-800 flex items-center gap-2">
            <Users className="text-emerald-700" size={22} />
            Pendaftaran & Database Warga
          </h2>
          <p className="text-slate-500 text-xs">
            Manajemen database dan pendaftaran warga Perum Pemda DIY Banjardadap secara online dan transparan.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsFormOpen(!isFormOpen);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
        >
          {isFormOpen ? (
            <>
              <X size={16} /> Tutup Form
            </>
          ) : (
            <>
              <UserPlus size={16} /> Daftar Warga Baru
            </>
          )}
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

      {/* Form Section */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4 animate-fadeIn">
          <h3 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2">
            {editingId ? 'Edit Data Warga' : 'Formulir Pendaftaran Warga Baru'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Nama Lengkap Warga *</label>
              <input
                type="text"
                placeholder="Contoh: Budi Santoso"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Nomor Rumah *</label>
              <input
                type="text"
                placeholder="Contoh: A-12, B-4, dll."
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Nomor HP / WhatsApp *</label>
              <input
                type="tel"
                placeholder="Contoh: 08123456789"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Pekerjaan</label>
              <input
                type="text"
                placeholder="Contoh: PNS, Karyawan Swasta, Wiraswasta"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Jumlah Anggota Keluarga (Rumah Tangga)</label>
              <input
                type="number"
                min={1}
                value={familySize}
                onChange={(e) => setFamilySize(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Status Keaktifan Warga</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Aktif' | 'Pasif')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50"
              >
                <option value="Aktif">Aktif (Bertempat Tinggal Tetap)</option>
                <option value="Pasif">Pasif (Kontrak / Kos / Tidak Menetap)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsFormOpen(false);
              }}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-600 transition-colors"
            >
              Batalkan
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Daftarkan Warga')}
            </button>
          </div>
        </form>
      )}

      {/* Search & Listing Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4 flex-wrap">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama, no rumah, pekerjaan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Menampilkan: <strong>{filteredResidents.length}</strong> / {residents.length} warga terdaftar
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <th className="p-4">Nama Lengkap</th>
                <th className="p-4">No Rumah</th>
                <th className="p-4">No Telepon</th>
                <th className="p-4">Pekerjaan</th>
                <th className="p-4 text-center">Anggota Kel.</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    Tidak ada data warga ditemukan.
                  </td>
                </tr>
              ) : (
                filteredResidents.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">{res.name}</td>
                    <td className="p-4 font-mono font-bold text-emerald-800">{res.houseNumber}</td>
                    <td className="p-4 text-slate-600">{res.phoneNumber}</td>
                    <td className="p-4 text-slate-600">{res.occupation || '-'}</td>
                    <td className="p-4 text-center font-mono">{res.familySize} orang</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        res.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleEditClick(res)}
                          title="Edit"
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-emerald-700 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        {isAdmin ? (
                          <button
                            onClick={() => handleDelete(res.id, res.name)}
                            title="Hapus"
                            className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <button
                            disabled
                            title="Hapus (Admin Saja)"
                            className="p-1.5 opacity-30 text-slate-400 cursor-not-allowed"
                          >
                            <Trash2 size={14} />
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
