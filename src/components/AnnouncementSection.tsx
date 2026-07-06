import React, { useState } from 'react';
import { Pin, Calendar, User, Tag, PlusCircle, Search, Trash2, X, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { Announcement } from '../types';

interface AnnouncementSectionProps {
  announcements: Announcement[];
  isAdmin: boolean;
  onRefresh: () => void;
}

export const AnnouncementSection: React.FC<AnnouncementSectionProps> = ({
  announcements,
  isAdmin,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'Pengumuman' | 'Undangan' | 'Urgent' | 'Informasi'>('Pengumuman');
  const [author, setAuthor] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !author) {
      setMessage({ type: 'error', text: 'Judul, Isi Pengumuman, dan Penulis wajib diisi!' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const annData: Omit<Announcement, 'id'> = {
        title: title.trim(),
        content: content.trim(),
        category,
        author: author.trim(),
        date: new Date().toISOString(),
        isPinned
      };

      await addDoc(collection(db, 'announcements'), annData);
      setMessage({ type: 'success', text: 'Pengumuman baru berhasil dirilis!' });

      // Reset
      setTitle('');
      setContent('');
      setAuthor('');
      setIsPinned(false);
      setIsFormOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: `Gagal merilis pengumuman: ${errorMsg}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, annTitle: string) => {
    if (!window.confirm(`Hapus pengumuman "${annTitle}"?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'announcements', id));
      setMessage({ type: 'success', text: 'Pengumuman berhasil dihapus.' });
      onRefresh();
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: `Gagal menghapus pengumuman: ${errorMsg}` });
    }
  };

  // Filter & Search
  const filteredAnnouncements = announcements.filter(ann => {
    const matchesSearch = ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ann.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? ann.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Sort: Pinned first, then by date descending
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div className="space-y-6" id="announcement-section">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold font-serif text-slate-800 flex items-center gap-2">
            <Tag className="text-emerald-700" size={22} />
            Papan Pengumuman Komunitas
          </h2>
          <p className="text-slate-500 text-xs">
            Pusat informasi, undangan rapat, berita mendesak, dan koordinasi antarwarga Perum Pemda DIY Banjardadap.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
        >
          {isFormOpen ? <X size={16} /> : <PlusCircle size={16} />}
          {isFormOpen ? 'Tutup Formulir' : 'Buat Pengumuman Baru'}
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

      {/* Form to Post Announcement */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4 animate-fadeIn">
          <h3 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2">
            📣 Rilis Pengumuman / Undangan Baru
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 block">Judul Pengumuman *</label>
              <input
                type="text"
                placeholder="Contoh: Undangan Rapat Kerja Bakti Banjardadap"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50"
                required
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 block">Isi Pengumuman / Informasi Lengkap *</label>
              <textarea
                rows={4}
                placeholder="Tuliskan isi pengumuman lengkap di sini. Masukkan hari, tanggal, waktu, lokasi secara jelas."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50"
                required
              ></textarea>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Kategori Informasi</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50"
              >
                <option value="Pengumuman">Pengumuman (Umum)</option>
                <option value="Undangan">Undangan (Rapat / Kerja Bakti)</option>
                <option value="Urgent">Urgent (Darurat / Mendesak)</option>
                <option value="Informasi">Informasi Tambahan</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Nama Pengirim / Penulis *</label>
              <input
                type="text"
                placeholder="Contoh: Pak RT, Pengurus, Bendahara, Budi"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/50 bg-slate-50"
                required
              />
            </div>

            <div className="flex items-center gap-2 md:col-span-2 pt-2">
              <input
                type="checkbox"
                id="isPinned"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded text-emerald-700 focus:ring-emerald-700 w-4 h-4"
              />
              <label htmlFor="isPinned" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
                Sematkan pengumuman ini (Pin to Top dengan batas warna emas)
              </label>
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
              {loading ? 'Mengirim...' : 'Rilis Informasi'}
            </button>
          </div>
        </form>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari isi pengumuman..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {['', 'Pengumuman', 'Undangan', 'Urgent', 'Informasi'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              {cat || 'Semua'}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedAnnouncements.length === 0 ? (
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400 text-sm shadow-sm">
            Tidak ada pengumuman yang cocok dengan filter pencarian.
          </div>
        ) : (
          sortedAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className={`bg-white rounded-xl shadow-sm p-6 border transition-all hover:shadow-md flex flex-col justify-between space-y-4 ${
                ann.isPinned
                  ? 'border-l-4 border-l-amber-500 border-amber-200/80 bg-amber-50/5'
                  : 'border-slate-100'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    ann.category === 'Urgent' ? 'bg-rose-100 text-rose-700' :
                    ann.category === 'Undangan' ? 'bg-blue-100 text-blue-700' :
                    ann.category === 'Informasi' ? 'bg-indigo-100 text-indigo-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {ann.category}
                  </span>

                  {ann.isPinned && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                      <Pin size={10} className="fill-amber-600" /> Pinned
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-800 line-clamp-2 leading-snug">
                  {ann.title}
                </h3>

                <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                  {ann.content}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <User size={12} /> {ann.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(ann.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDelete(ann.id, ann.title)}
                    className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                    title="Hapus Pengumuman"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
