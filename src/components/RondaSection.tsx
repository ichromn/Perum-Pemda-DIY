import React, { useState } from 'react';
import { Moon, Calendar, UserPlus, Trash2, Check, Shield, Info } from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Resident, RondaSchedule } from '../types';

interface RondaSectionProps {
  ronda: RondaSchedule[];
  residents: Resident[];
  isAdmin: boolean;
  onRefresh: () => void;
}

export const RondaSection: React.FC<RondaSectionProps> = ({
  ronda,
  residents,
  isAdmin,
  onRefresh
}) => {
  const [selectedDay, setSelectedDay] = useState<string>('Senin');
  const [newParticipantName, setNewParticipantName] = useState<string>('');
  const [selectedResidentId, setSelectedResidentId] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const daysInd = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  // Handle adding participant to a day
  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let nameToAdd = '';
    if (selectedResidentId) {
      const res = residents.find(r => r.id === selectedResidentId);
      if (res) nameToAdd = res.name;
    } else if (newParticipantName.trim()) {
      nameToAdd = newParticipantName.trim();
    }

    if (!nameToAdd) {
      setMessage({ type: 'error', text: 'Pilih nama warga atau masukkan nama manual!' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const daySchedule = ronda.find(r => r.dayName === selectedDay);
      if (!daySchedule) throw new Error('Jadwal tidak ditemukan');

      if (daySchedule.participants.includes(nameToAdd)) {
        setMessage({ type: 'error', text: `${nameToAdd} sudah terdaftar di hari ${selectedDay}!` });
        setLoading(false);
        return;
      }

      const updatedParticipants = [...daySchedule.participants, nameToAdd];
      const docRef = doc(db, 'ronda', selectedDay);
      await updateDoc(docRef, { participants: updatedParticipants });

      setMessage({ type: 'success', text: `Berhasil menambahkan ${nameToAdd} ke jadwal ronda hari ${selectedDay}!` });
      setNewParticipantName('');
      setSelectedResidentId('');
      onRefresh();
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: `Gagal mengupdate jadwal ronda: ${errorMsg}` });
    } finally {
      setLoading(false);
    }
  };

  // Handle removing participant
  const handleRemoveParticipant = async (dayName: string, personName: string) => {
    if (!window.confirm(`Hapus ${personName} dari jadwal ronda hari ${dayName}?`)) {
      return;
    }

    try {
      const daySchedule = ronda.find(r => r.dayName === dayName);
      if (!daySchedule) return;

      const updatedParticipants = daySchedule.participants.filter(p => p !== personName);
      const docRef = doc(db, 'ronda', dayName);
      await updateDoc(docRef, { participants: updatedParticipants });

      setMessage({ type: 'success', text: `Berhasil menghapus ${personName} dari ronda hari ${dayName}.` });
      onRefresh();
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: `Gagal menghapus petugas ronda: ${errorMsg}` });
    }
  };

  return (
    <div className="space-y-6" id="ronda-section">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-2">
        <h2 className="text-xl font-bold font-serif text-slate-800 flex items-center gap-2">
          <Moon className="text-amber-500 animate-pulse" size={22} />
          Jadwal Ronda Pos Keamanan Malam
        </h2>
        <p className="text-slate-500 text-xs">
          Sinergi warga Perum Pemda DIY Banjardadap dalam menjaga ketertiban, pencegahan pencurian, dan rasa aman lingkungan setiap malam.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center justify-between text-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
      )}

      {/* Grid for Input Form and Information Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form to Register / Assign */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <UserPlus size={16} className="text-emerald-700" />
            {isAdmin ? 'Plotting Jadwal Petugas Ronda' : 'Daftar Ikut Ronda Sukarela'}
          </h3>

          <form onSubmit={handleAddParticipant} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Pilih Hari Ronda *</label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
              >
                {daysInd.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Pilih Warga Terdaftar *</label>
              <select
                value={selectedResidentId}
                onChange={(e) => {
                  setSelectedResidentId(e.target.value);
                  setNewParticipantName('');
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
              >
                <option value="">-- Pilih Warga Terdaftar --</option>
                {residents.map(res => (
                  <option key={res.id} value={res.id}>{res.name} (Rumah: {res.houseNumber})</option>
                ))}
              </select>
            </div>

            <div className="text-center text-xs text-slate-400 font-bold py-1">-- ATAU MASUKKAN MANUAL --</div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Masukkan Nama Petugas (Custom)</label>
              <input
                type="text"
                placeholder="Misal: Bapak Hermawan / Petugas Tambahan"
                value={newParticipantName}
                onChange={(e) => {
                  setNewParticipantName(e.target.value);
                  setSelectedResidentId('');
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Check size={14} /> {isAdmin ? 'Simpan ke Jadwal' : 'Daftar Ronda Sukarela'}
            </button>
          </form>
        </div>

        {/* Info Box */}
        <div className="lg:col-span-2 bg-slate-900 text-white p-6 rounded-xl relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Shield size={120} className="text-amber-400 animate-pulse" />
          </div>

          <div className="space-y-3 z-10">
            <h3 className="text-amber-300 font-semibold text-sm flex items-center gap-1.5 font-serif">
              🛡️ Tata Tertib Keamanan & Ronda
            </h3>
            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
              <li>Ronda wajib dimulai pukul <strong>22.00 WIB</strong> hingga minimal pukul <strong>04.00 WIB</strong> dini hari.</li>
              <li>Petugas ronda diwajibkan melakukan patroli keliling kompleks minimal <strong>setiap 2 jam sekali</strong> menggunakan senter dan kentongan.</li>
              <li>Tamu warga yang menginap lebih dari <strong>1x24 jam</strong> wajib lapor kepada Ketua Paguyuban / petugas keamanan yang berjaga.</li>
              <li>Bila berhalangan hadir pada jadwal yang sudah diplot, harap berkoordinasi untuk <strong>bertukar jadwal</strong> dengan warga lain demi keamanan bersama.</li>
            </ul>
          </div>

          <div className="flex items-center gap-2 mt-4 p-3 bg-slate-800/80 border border-slate-700/50 rounded-lg text-[11px] text-slate-300 leading-relaxed">
            <Info size={18} className="text-amber-400 flex-shrink-0" />
            <div>
              <strong>Siaga Darurat:</strong> Hubungi Kepolisian Sektor terdekat atau nomor darurat keamanan kompleks jika mencurigai hal-hal bahaya. Sinergi kita, aman kita semua!
            </div>
          </div>
        </div>
      </div>

      {/* Week Calendar Visual representation of duty schedules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        {daysInd.map((day) => {
          const schedule = ronda.find(r => r.dayName === day);
          const hasParticipants = schedule && schedule.participants.length > 0;

          return (
            <div
              key={day}
              className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col justify-between space-y-3 transition-all hover:border-emerald-500/50 hover:shadow-md ${
                day === 'Sabtu' || day === 'Minggu' ? 'bg-amber-50/10 border-amber-200/50' : 'border-slate-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-800 font-serif text-sm">{day}</span>
                  <span className="text-[10px] font-mono text-slate-400">Ronda</span>
                </div>

                <div className="pt-2 space-y-1.5 min-h-[140px]">
                  {hasParticipants ? (
                    schedule.participants.map((person, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 px-2 py-1.5 rounded-lg text-slate-700"
                      >
                        <span className="font-medium truncate max-w-[100px]">{person}</span>
                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveParticipant(day, person)}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                            title="Hapus petugas"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-[11px] italic">
                      Belum ada petugas terdaftar
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[9px] text-slate-400 border-t border-slate-100 pt-2 font-sans line-clamp-2">
                {schedule?.notes || 'Ronda rutin jam 22.00'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
