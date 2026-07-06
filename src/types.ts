export interface Resident {
  id: string;
  name: string;
  houseNumber: string;
  phoneNumber: string;
  familySize: number;
  status: 'Aktif' | 'Pasif';
  occupation: string;
  registeredAt: string; // ISO string
}

export interface DuesPayment {
  id: string;
  residentId: string;
  residentName: string;
  houseNumber: string;
  type: 'Kebersihan' | 'Keamanan' | 'Sosial' | 'Kas Paguyuban' | 'Lainnya';
  amount: number;
  month: number; // 1 - 12
  year: number;
  paymentDate: string; // ISO string
  status: 'Pending' | 'Selesai' | 'Ditolak';
  notes?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'Pengumuman' | 'Undangan' | 'Urgent' | 'Informasi';
  author: string;
  date: string; // ISO string
  isPinned?: boolean;
}

export interface RondaSchedule {
  id: string; // e.g., 'Senin', 'Selasa', etc.
  dayName: string; // Monday - Sunday in Indonesian (Senin, Selasa, dll.)
  participants: string[]; // List of resident names or resident IDs
  notes?: string;
}

export interface Transaction {
  id: string;
  type: 'Pemasukan' | 'Pengeluaran';
  category: string; // e.g., 'Iuran Bulanan', 'Gaji Satpam', 'Dana Sosial', 'Konsumsi', 'Perawatan', etc.
  amount: number;
  date: string; // ISO string
  description: string;
  loggedBy: string;
}
