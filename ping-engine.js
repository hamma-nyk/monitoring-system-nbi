const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const ping = require("ping");
require("dotenv").config();

// Inisialisasi koneksi aman untuk background service
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const WA_API_URL = "http://127.0.0.1:3333/api/send-message";

// Fungsi Kirim WA
async function sendWaNotif(message) {
  try {
    const recipients = await prisma.recipient.findMany({
      where: { isNotifEnabled: true },
    });
    for (const r of recipients) {
      await fetch(WA_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: r.phone, type: "text", text: message }),
      }).catch(() => {});
    }
  } catch (error) {
    console.error("Gagal mengambil data penerima");
  }
}

// Fungsi Simpan Log Langsung ke Database
async function saveLogToDB(level, title, message) {
  try {
    await prisma.systemLog.create({
      data: { level, title, message },
    });

    const recentLogs = await prisma.systemLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true },
    });

    const recentIds = recentLogs.map((log) => log.id);

    await prisma.systemLog.deleteMany({
      where: {
        id: { notIn: recentIds },
      },
    });

    return true; 
  } catch (error) {
    console.error("[ERROR DB LOG] Gagal menyimpan log:", error.message);
    return false;
  }
}

// Mesin Utama
async function runEngine() {
  try {
    const devices = await prisma.device.findMany();

    for (const device of devices) {
      if (!device.ipAddress || device.ipAddress === "0.0.0.0") continue;

      const res = await ping.promise.probe(device.ipAddress, { timeout: 2 });
      const isAlive = res.alive;
      const latency = isNaN(Number(res.time)) ? 0 : Math.round(Number(res.time));

      let failCount = device.failCount;
      let lastNotifState = device.lastNotifState;

      if (!isAlive) {
        failCount += 1;

        if (failCount === 10 && lastNotifState === "UP") {
          lastNotifState = "DOWN";
          const alertMsg = `🔴 *NETWORK DOWN*\n\nPerangkat: *${device.remark}*\nIP Address: ${device.ipAddress}\nStatus: *OFFLINE / RTO*\n\n_Mohon segera dilakukan pengecekan._`;

          await sendWaNotif(alertMsg);
          const isSaved = await saveLogToDB("ERROR", "Perangkat Terputus", `Perangkat ${device.remark} (${device.ipAddress}) terdeteksi Offline / RTO.`);
          if (isSaved) console.log(`[LOG] 🔴 ${device.remark} DOWN - Tersimpan di Database`);
        }
      } else {
        if (lastNotifState === "DOWN") {
          lastNotifState = "UP";
          const alertMsg = `🟢 *NETWORK UP*\n\nPerangkat: *${device.remark}*\nIP Address: ${device.ipAddress}\nStatus: *ONLINE*\n\n_Koneksi telah kembali normal._`;

          await sendWaNotif(alertMsg);
          const isSaved = await saveLogToDB("SUCCESS", "Koneksi Pulih", `Perangkat ${device.remark} (${device.ipAddress}) telah kembali Online dengan latensi ${latency}ms.`);
          if (isSaved) console.log(`[LOG] 🟢 ${device.remark} UP - Tersimpan di Database`);
        }
        failCount = 0; 
      }

      await prisma.device.update({
        where: { id: device.id },
        data: {
          failCount,
          lastNotifState,
          status: isAlive ? "online" : "offline",
          latency,
        },
      });
    }
  } catch (error) {
    console.error("Engine error:", error);
  }
}

// ==========================================
// PERBAIKAN: Gunakan Looping Aman (Mencegah Overlapping)
// ==========================================
async function startPingEngine() {
  console.log("🤖 Background Ping Engine Berjalan...");
  
  while (true) {
    // 1. Tunggu proses pengecekan SELURUH perangkat selesai
    await runEngine();
    
    // 2. Setelah tuntas, barulah istirahat 5 detik sebelum ronde berikutnya
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

// Jalankan sistem
startPingEngine();