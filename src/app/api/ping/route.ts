import { NextResponse } from "next/server";
import ping from "ping";
import { prisma } from "@/lib/prisma";

// URL Backend Baileys Anda
const WA_API_URL = "http://127.0.0.1:3333/api/send-message";

// Fungsi Helper untuk mengirim notifikasi ke semua penerima aktif
async function sendWaNotif(message: string) {
  try {
    const recipients = await prisma.recipient.findMany({
      where: { isNotifEnabled: true },
    });

    for (const r of recipients) {
      await fetch(WA_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: r.phone, type: "text", text: message }),
      }).catch((e) => console.error(`Gagal kirim WA ke ${r.phone}`, e));
    }
  } catch (error) {
    console.error("Error saat mengambil data penerima", error);
  }
}

export async function POST(req: Request) {
  try {
    // Tangkap id dan remark dari frontend
    const { id, ip, remark } = await req.json();

    if (!ip || ip === "0.0.0.0") {
      return NextResponse.json({ isAlive: false });
    }

    // Eksekusi ping
    const res = await ping.promise.probe(ip, { timeout: 2 });
    const isAlive = res.alive;

    // PASTIKAN ini bukan node temporary (harus sudah tersimpan di database)
    if (id && !id.toString().startsWith("temp_")) {
      const deviceId = parseInt(id);

      // Ambil status terakhir perangkat dari database
      const device = await prisma.device.findUnique({
        where: { id: deviceId },
      });

      if (device) {
        let { failCount, lastNotifState } = device;

        if (!isAlive) {
          // JIKA MATI: Tambah hitungan gagal
          failCount += 1;

          // Jika sudah gagal >= 10x dan belum dikirim status DOWN
          if (failCount >= 5 && lastNotifState === "UP") {
            lastNotifState = "DOWN"; // Ubah state agar tidak dikirim berulang

            const msg = `🚨 *ALARM NETWORK DOWN* 🚨\n\nPerangkat: *${remark}*\nIP Address: ${ip}\nStatus: *OFFLINE / RTO*\n\n_Mohon segera dilakukan pengecekan._`;
            await sendWaNotif(msg);
          }
        } else {
          // JIKA HIDUP
          if (lastNotifState === "DOWN") {
            // Berarti perangkat baru saja pulih dari mati (Recovery)
            lastNotifState = "UP";

            const msg = `✅ *NETWORK RECOVERY* ✅\n\nPerangkat: *${remark}*\nIP Address: ${ip}\nStatus: *ONLINE*\n\n_Koneksi telah kembali normal._`;
            await sendWaNotif(msg);
          }

          failCount = 0; // Reset hitungan error karena ping sukses
        }

        // Simpan state dan hitungan terbaru ke database
        await prisma.device.update({
          where: { id: deviceId },
          data: { failCount, lastNotifState },
        });
      }
    }

    return NextResponse.json({ isAlive, time: res.time });
  } catch (error) {
    return NextResponse.json({ isAlive: false }, { status: 500 });
  }
}
