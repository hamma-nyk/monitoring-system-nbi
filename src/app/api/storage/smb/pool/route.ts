import { NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";
import checkDiskSpace from "check-disk-space";

const execAsync = util.promisify(exec);

// --- FUNGSI BAWAAN ANDA ---
async function getDiskInfo(path: string, ips: string, serverName: string) {
  const disk = await checkDiskSpace(path);
  const name = "Storage"; // Gunakan nama server/IP untuk UI, bukan Z:\
  const type = "SMB";

  const totalGB = (disk.size / 1024 / 1024 / 1024).toFixed(2);
  const freeGB = (disk.free / 1024 / 1024 / 1024).toFixed(2);
  const usedGB = (Number(totalGB) - Number(freeGB)).toFixed(2);
  const usedPercent = ((Number(usedGB) / Number(totalGB)) * 100).toFixed(1);

  return { name, type, totalGB, usedGB, freeGB, usedPercent, ip: ips };
}

// --- API ENDPOINT NEXT.JS ---
export async function POST(req: Request) {
  const driveLetter = "Z:"; // Kita gunakan Drive Z sebagai partisi virtual (mount point)

  try {
    const { ipAddress, smbUser, smbPassword, name } = await req.json();

    let uncPath = ipAddress.replace(/\//g, "\\");
    if (!uncPath.startsWith("\\\\")) {
      uncPath = `\\\\${uncPath}`;
    }

    // Validasi format folder (Cegah error 1219 terulang karena IP kosong)
    const slashCount = (uncPath.match(/\\/g) || []).length;
    if (slashCount < 3) {
      return NextResponse.json(
        {
          error:
            "Format SMB salah! Sertakan nama folder (Cth: 192.168.10.14/Backup)",
        },
        { status: 400 },
      );
    }

    const serverMatch = uncPath.match(/\\\\([^\\]+)/);
    const serverIp = serverMatch ? serverMatch[1] : null;

    try {
      // 1. Serangan Brutal: Hapus semua koneksi yang nyangkut di memori Windows
      if (serverIp) {
        await execAsync(`net use "\\\\${serverIp}\\IPC$" /delete /y`).catch(
          () => {},
        );
        await execAsync(`net use "\\\\${serverIp}" /delete /y`).catch(() => {});
      }
      await execAsync(`net use "${uncPath}" /delete /y`).catch(() => {});

      // Bersihkan juga Drive Z: kalau-kalau masih ada bekas sebelumnya
      await execAsync(`net use ${driveLetter} /delete /y`).catch(() => {});

      // 2. MOUNTING: Hubungkan Folder SMB ke Partisi Z:
      if (smbUser && smbPassword) {
        await execAsync(
          `net use ${driveLetter} "${uncPath}" "${smbPassword}" /user:"${smbUser}"`,
        );
      } else {
        // Jika folder bersifat Public (tanpa password)
        await execAsync(`net use ${driveLetter} "${uncPath}"`);
      }
    } catch (authError: any) {
      console.error("SMB Mount Error:", authError);
      return NextResponse.json(
        {
          error:
            "Gagal membuat koneksi ke SMB. Cek Username, Password, atau izin akses Folder.",
        },
        { status: 401 },
      );
    }

    // 3. Eksekusi fungsi utama (Cek disk di Z:\ bukan di \\IP)
    const poolData = await getDiskInfo(`${driveLetter}\\`, ipAddress, name);

    // 4. UNMOUNT: Hapus kembali partisi Z: agar bersih
    await execAsync(`net use ${driveLetter} /delete /y`).catch(() => {});

    return NextResponse.json({ success: true, pools: [poolData] });
  } catch (error: any) {
    console.error("SMB Read Error:", error);
    // Pastikan Drive Z: tetap dihapus jika terjadi error di tengah proses membaca disk
    execAsync(`net use ${driveLetter} /delete /y`).catch(() => {});
    return NextResponse.json(
      { error: error.message || "Gagal membaca kapasitas SMB" },
      { status: 500 },
    );
  }
}
