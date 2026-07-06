export interface Resident {
  id: string;
  name: string;
  houseNumber: string;
  phoneNumber: string;
  familySize: number;
  familyMembers?: string; // Names of family members
  status: 'Aktif' | 'Pasif';
  occupation: string;
  registeredAt: string; // ISO string
}

export interface DuesPayment {
  id: string;
  residentId: string;
  residentName: string;
  houseNumber: string;
  type: 'Dana Sosial' | 'Kebersihan' | 'Simpan Pinjam' | 'Lainnya';
  amount: number;
  month: number; // 1 - 12
  year: number;
  paymentDate: string; // ISO string
  status: 'Pending' | 'Selesai' | 'Ditolak';
  notes?: string;
}

export interface Loan {
  id: string;
  residentId: string;
  residentName: string;
  houseNumber: string;
  amount: number;             // Total loan amount
  remainingAmount: number;    // Remaining amount to pay
  loanDate: string;           // ISO date
  dueDate?: string;           // Optional due date
  status: 'Belum Lunas' | 'Lunas';
  notes?: string;
}

export interface LoanInstallment {
  id: string;
  loanId: string;
  residentName: string;
  amount: number;
  paymentDate: string;        // ISO date
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
