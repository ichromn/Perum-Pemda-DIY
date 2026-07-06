import { collection, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Resident, DuesPayment, Announcement, RondaSchedule, Transaction } from '../types';

export async function checkAndSeedDatabase() {
  try {
    // 1. Seed Residents
    const resCol = collection(db, 'residents');
    const resSnap = await getDocs(resCol);
    
    let residentsList: Resident[] = [];
    if (resSnap.empty) {
      const initialResidents: Omit<Resident, 'id'>[] = [
        { name: "Ichroman Aldila (Ketua Paguyuban)", houseNumber: "A-1", phoneNumber: "081234567890", familySize: 4, status: "Aktif", occupation: "PNS Pemda DIY", registeredAt: new Date(2025, 0, 1).toISOString() },
        { name: "Bambang Sugeng", houseNumber: "A-2", phoneNumber: "081298765432", familySize: 5, status: "Aktif", occupation: "Dosen", registeredAt: new Date(2025, 1, 15).toISOString() },
        { name: "Sri Wahyuni", houseNumber: "B-1", phoneNumber: "085611223344", familySize: 3, status: "Aktif", occupation: "Wiraswasta", registeredAt: new Date(2025, 2, 10).toISOString() },
        { name: "Heru Prasetyo", houseNumber: "B-2", phoneNumber: "087855667788", familySize: 4, status: "Aktif", occupation: "Pegawai Swasta", registeredAt: new Date(2025, 3, 5).toISOString() },
        { name: "Sutrisno", houseNumber: "C-1", phoneNumber: "081399887766", familySize: 2, status: "Aktif", occupation: "Pensiunan", registeredAt: new Date(2025, 0, 10).toISOString() },
        { name: "Joko Susilo", houseNumber: "C-2", phoneNumber: "082144332211", familySize: 6, status: "Aktif", occupation: "Wiraswasta", registeredAt: new Date(2025, 4, 18).toISOString() },
        { name: "Agus Budiman", houseNumber: "D-1", phoneNumber: "085277889900", familySize: 4, status: "Pasif", occupation: "PNS", registeredAt: new Date(2025, 5, 20).toISOString() },
        { name: "Rina Kartika", houseNumber: "D-2", phoneNumber: "081122334455", familySize: 3, status: "Aktif", occupation: "Dokter", registeredAt: new Date(2025, 6, 12).toISOString() },
      ];

      for (const res of initialResidents) {
        const docRef = await addDoc(resCol, res);
        residentsList.push({ id: docRef.id, ...res });
      }
    } else {
      residentsList = resSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resident));
    }

    // 2. Seed Ronda Schedule
    const rondaCol = collection(db, 'ronda');
    const rondaSnap = await getDocs(rondaCol);
    if (rondaSnap.empty) {
      const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      const defaultParticipants: Record<string, string[]> = {
        'Senin': ['Ichroman Aldila', 'Bambang Sugeng'],
        'Selasa': ['Heru Prasetyo', 'Sutrisno'],
        'Rabu': ['Joko Susilo', 'Agus Budiman'],
        'Kamis': ['Ichroman Aldila', 'Heru Prasetyo'],
        'Jumat': ['Bambang Sugeng', 'Joko Susilo'],
        'Sabtu': ['Sutrisno', 'Agus Budiman', 'Ichroman Aldila'],
        'Minggu': ['Warga Bergantian', 'Keamanan Kompleks']
      };

      for (const day of days) {
        await setDoc(doc(db, 'ronda', day), {
          dayName: day,
          participants: defaultParticipants[day] || [],
          notes: day === 'Sabtu' || day === 'Minggu' ? 'Ronda ekstra akhir pekan' : 'Ronda rutin jam 22.00 - 04.00 WIB'
        });
      }
    }

    // 3. Seed Announcements
    const annCol = collection(db, 'announcements');
    const annSnap = await getDocs(annCol);
    if (annSnap.empty) {
      const initialAnnouncements: Omit<Announcement, 'id'>[] = [
        {
          title: "Kerja Bakti Massal Kebersihan Lingkungan",
          content: "Dihimbau kepada seluruh warga Perum Pemda DIY Banjardadap untuk mengikuti kegiatan kerja bakti menyambut musim hujan pada hari Minggu besok. Harap membawa peralatan kebersihan masing-masing. Konsumsi disediakan oleh Paguyuban.",
          category: "Urgent",
          author: "Ichroman Aldila",
          date: new Date(2026, 6, 4, 8, 0).toISOString(),
          isPinned: true
        },
        {
          title: "Pemberitahuan Kenaikan Iuran Keamanan",
          content: "Berdasarkan hasil musyawarah warga pada tanggal 1 Juni 2026, disepakati bahwa iuran bulanan untuk sektor Keamanan naik sebesar Rp 10.000 (menjadi Rp 40.000) mulai bulan Juli 2026 demi menunjang operasional satpam 24 jam.",
          category: "Pengumuman",
          author: "Pengurus Paguyuban",
          date: new Date(2026, 5, 25, 19, 30).toISOString(),
          isPinned: false
        },
        {
          title: "Undangan Rapat Rutin Bulanan",
          content: "Mengundang perwakilan setiap rumah untuk menghadiri rapat koordinasi bulanan pada hari Sabtu malam, 11 Juli 2026 pukul 19.30 WIB di Balai Pertemuan Paguyuban. Agenda utama: Evaluasi keamanan dan laporan keuangan semester I.",
          category: "Undangan",
          author: "Sekretaris Paguyuban",
          date: new Date(2026, 6, 2, 10, 0).toISOString(),
          isPinned: false
        }
      ];

      for (const ann of initialAnnouncements) {
        await addDoc(annCol, ann);
      }
    }

    // 4. Seed Payments
    const payCol = collection(db, 'payments');
    const paySnap = await getDocs(payCol);
    
    // 5. Seed Transactions (Financial Log)
    const txCol = collection(db, 'transactions');
    const txSnap = await getDocs(txCol);

    if (paySnap.empty && residentsList.length > 0) {
      // Create some historical payments
      const initialPayments: Omit<DuesPayment, 'id'>[] = [
        {
          residentId: residentsList[0].id,
          residentName: residentsList[0].name,
          houseNumber: residentsList[0].houseNumber,
          type: "Keamanan",
          amount: 40000,
          month: 6,
          year: 2026,
          paymentDate: new Date(2026, 5, 5).toISOString(),
          status: "Selesai",
          notes: "Pembayaran lunas iuran Juni"
        },
        {
          residentId: residentsList[0].id,
          residentName: residentsList[0].name,
          houseNumber: residentsList[0].houseNumber,
          type: "Kebersihan",
          amount: 25000,
          month: 6,
          year: 2026,
          paymentDate: new Date(2026, 5, 5).toISOString(),
          status: "Selesai",
          notes: "Iuran Kebersihan Juni"
        },
        {
          residentId: residentsList[1].id,
          residentName: residentsList[1].name,
          houseNumber: residentsList[1].houseNumber,
          type: "Keamanan",
          amount: 40000,
          month: 6,
          year: 2026,
          paymentDate: new Date(2026, 5, 7).toISOString(),
          status: "Selesai",
          notes: "Dues June"
        },
        {
          residentId: residentsList[2].id,
          residentName: residentsList[2].name,
          houseNumber: residentsList[2].houseNumber,
          type: "Sosial",
          amount: 20000,
          month: 6,
          year: 2026,
          paymentDate: new Date(2026, 5, 10).toISOString(),
          status: "Selesai",
          notes: "Dana sosial bencana merapi"
        },
        {
          residentId: residentsList[3].id,
          residentName: residentsList[3].name,
          houseNumber: residentsList[3].houseNumber,
          type: "Kas Paguyuban",
          amount: 50000,
          month: 6,
          year: 2026,
          paymentDate: new Date(2026, 5, 12).toISOString(),
          status: "Pending",
          notes: "Iuran pembangunan gapura"
        }
      ];

      for (const pay of initialPayments) {
        await addDoc(payCol, pay);
      }
    }

    if (txSnap.empty) {
      const initialTransactions: Omit<Transaction, 'id'>[] = [
        {
          type: "Pemasukan",
          category: "Iuran Bulanan",
          amount: 1200000,
          date: new Date(2026, 5, 1).toISOString(),
          description: "Akumulasi iuran keamanan dan kebersihan Mei 2026",
          loggedBy: "Sistem"
        },
        {
          type: "Pemasukan",
          category: "Sumbangan Donatur",
          amount: 500000,
          date: new Date(2026, 5, 10).toISOString(),
          description: "Sumbangan pembangunan Balai RT dari warga anonim",
          loggedBy: "Admin"
        },
        {
          type: "Pengeluaran",
          category: "Gaji Satpam",
          amount: 800000,
          date: new Date(2026, 5, 30).toISOString(),
          description: "Pembayaran honor bulanan petugas keamanan",
          loggedBy: "Bendahara"
        },
        {
          type: "Pengeluaran",
          category: "Konsumsi Kerja Bakti",
          amount: 250000,
          date: new Date(2026, 6, 4).toISOString(),
          description: "Pembelian makanan & minuman warga saat kerja bakti",
          loggedBy: "Sistem"
        },
        {
          type: "Pengeluaran",
          category: "Peralatan",
          amount: 150000,
          date: new Date(2026, 6, 2).toISOString(),
          description: "Pembelian sapu lidi, kantong sampah besar, dan sekop",
          loggedBy: "Bendahara"
        }
      ];

      for (const tx of initialTransactions) {
        await addDoc(txCol, tx);
      }
    }

    console.log("Database successfully seeded!");
  } catch (error) {
    console.error("Error seeding database: ", error);
  }
}
