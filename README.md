# IKOIT Infrastructure & Network Monitoring

Aplikasi web monitoring infrastruktur dan topologi jaringan berbasis **Next.js (App Router)**, **React Flow**, **Prisma ORM**, dan **PostgreSQL**.

---

## Fitur Utama

- **Network Monitoring (`/network-monitor`)**
  - Kanvas topologi jaringan interaktif (*drag & drop*) dengan status ping *real-time* (Online/Latency ms, Offline/RTO).
  - **Katalog Perangkat Lengkap:** Router, PC, Server, TrueNAS, Smartphone, Absensi, **CCTV**, **Switch**, **Gateway**, **Modem**, serta dukungan tambah master tipe & ikon custom.
  - **Custom Port & Tipe Port:**
    - **Modem:** Custom jumlah port (`1–64`) dengan tipe `WAN` / `LAN`.
    - **Gateway:** Custom jumlah port (`1–64`) dengan tipe `WAN` / `LAN` / `SFP` + tag `TRUNK` / `VLAN ID`.
    - **Switch:** Custom jumlah port (`1–64`) dengan tipe `LAN` / `POE` / `SFP` + tag `TRUNK` / `VLAN ID`.
    - Kabel terhubung tepat ke masing-masing port, warna kotak port mengikuti warna kabel, dan label nomor port pada garis bisa digeser sepanjang garis dan tersimpan di database.
  - **IP Address Opsional:** Perangkat pasif/unmanaged dapat disimpan tanpa IP Address.
  - **Custom Warna Line Penghubung:** Pilihan preset warna maupun color picker bebas untuk kabel baru maupun kabel yang sudah ada.
  - **Menggambar Area:** Bentuk `Kotak`, `Rounded`, `Bulat`, `Diamond`, `Segitiga`, dan `Hexagon` dengan *resize*, *rotate* + *guideline* `0°`, custom warna, label, serta pengaturan transparansi/opasitas (default `5%`).
  - **Sinkronisasi Lock / Unlock:** Status kunci kanvas (*interactivity*) disimpan ke database sehingga konsisten di semua komputer.
  - **Find Device:** Search bar di toolbar untuk mencari perangkat berdasarkan nama, IP, atau tipe lalu memfokuskan kamera ke perangkat tersebut.
  - **Export & Import Topologi:** Backup dan restore seluruh topologi (perangkat, kabel, area, master tipe, dan pengaturan kanvas) dalam format `.json`.
- **ESXi Monitor (`/esxi-monitor`):** Monitoring host VMware ESXi dan status VM.
- **Storage Monitor (`/storage-monitor`):** Monitoring kapasitas pool storage TrueNAS & SMB.
- **WhatsApp Alert & Recipients (`/whatsapp`, `/recipients`):** Pengelolaan penerima notifikasi WhatsApp otomatis saat perangkat *DOWN/UP*.
- **Todo List (`/todo`):** Pencatatan kegiatan/pekerjaan tim IT.

---

## Tech Stack

- **Framework:** Next.js `16.2.12` (App Router, Turbopack)
- **UI:** React `19`, Tailwind CSS `4`, Lucide Icons, React Flow `11`
- **Database & ORM:** PostgreSQL dengan **Prisma `7.9.1`** (`@prisma/adapter-pg` + `pg`)
- **Background Service:** `ping-engine.js` (ICMP ping + notifikasi WhatsApp + log database), `pm2` / `node-windows`

---

## Prasyarat

- **Node.js** versi `20+` (disarankan LTS)
- **PostgreSQL** versi `14+`
- **npm** (bawaan Node.js)

---

## 1. Setup Project

Clone repository lalu masuk ke folder project dan install dependensi:

```bash
git clone <url-repository>
cd monitoring
npm install
```

Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Lalu sesuaikan isi `.env`:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/ikoit_monitoring"
JWT_SECRET="ganti-dengan-secret-key-acak-yang-aman"
```

> Sesuaikan `USERNAME`, `PASSWORD`, host, port, nama database, dan `JWT_SECRET` dengan konfigurasi Anda.

---

## WhatsApp Bot (Terpisah)

Untuk fitur notifikasi WhatsApp (`ping-engine.js` & halaman `/whatsapp`), service **WhatsApp Bot** berada di repository terpisah:
- Repository: **https://github.com/hamma-nyk/monitoring-system-nbi-wabot**
- Pastikan service bot WhatsApp sudah berjalan di `http://127.0.0.1:3333` agar pengiriman pesan notifikasi otomatis berfungsi.

---

## 2. Setup Database PostgreSQL & Prisma

### A. Buat Database & Schema
Pastikan database (misalnya `ikoit_monitoring`) sudah dibuat di PostgreSQL. Project ini menggunakan **multi-schema** (`sc_master`, `sc_network`, `sc_storage`, `sc_vm`, `sc_logs`, `sc_todo`).

Jalankan perintah berikut di PostgreSQL (`psql` atau pgAdmin) jika schema belum ada:

```sql
CREATE DATABASE ikoit_monitoring;

\c ikoit_monitoring

CREATE SCHEMA IF NOT EXISTS sc_master;
CREATE SCHEMA IF NOT EXISTS sc_network;
CREATE SCHEMA IF NOT EXISTS sc_storage;
CREATE SCHEMA IF NOT EXISTS sc_vm;
CREATE SCHEMA IF NOT EXISTS sc_logs;
CREATE SCHEMA IF NOT EXISTS sc_todo;
```

### B. Sinkronisasi Skema Prisma & Generate Client
Jalankan perintah berikut dari root folder project:

```bash
npx prisma db push
npx prisma generate
```

> **Catatan:** Jika Anda memindahkan atau mengupdate database yang sudah ada, selalu jalankan `npx prisma db push` diikuti `npx prisma generate`.

### C. Seed Data Awal (MasterType Katalog Perangkat)
Untuk mengisi katalog perangkat default (`Router`, `PC`, `Server`, `TrueNas`, `CCTV`, `Switch`, `Gateway`, `Modem`, dll.), Anda dapat menambahkannya lewat tombol `+` di sidebar kanan halaman `/network-monitor`, atau menjalankan script berikut:

```bash
node -e "require('dotenv/config'); const { PrismaClient } = require('@prisma/client'); const { PrismaPg } = require('@prisma/adapter-pg'); const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); const prisma = new PrismaClient({ adapter: new PrismaPg(pool) }); (async () => { const items = [ { name: 'Router', icon: 'router' }, { name: 'PC', icon: 'monitor' }, { name: 'Server', icon: 'server' }, { name: 'TrueNas', icon: 'harddrive' }, { name: 'Smartphone', icon: 'smartphone' }, { name: 'Absensi', icon: 'box' }, { name: 'CCTV', icon: 'cctv' }, { name: 'Switch', icon: 'switch' }, { name: 'Gateway', icon: 'gateway' }, { name: 'Modem', icon: 'modem' } ]; for (const item of items) { await prisma.masterType.upsert({ where: { name: item.name }, update: { icon: item.icon }, create: item }); } await pool.end(); })();"
```

---

## 3. Menjalankan Aplikasi

### Mode Development
```bash
npm run dev
```
Aplikasi akan berjalan di [http://localhost:3000](http://localhost:3000).

### Mode Production
```bash
npm run build
npm start
```
Script `npm start` menjalankan Next.js production server pada port **`3008`** (`http://localhost:3008`).

> **Penting:** Setiap kali ada perubahan skema Prisma atau build baru, pastikan untuk **me-restart** server Next.js (`npm run dev` atau Windows Service `MonitoringSystem_FE`) agar `@prisma/client` dan hasil build terbaru dimuat.

---

## 4. Menjalankan Background Ping Engine

`ping-engine.js` bertugas melakukan ping berkala ke semua perangkat yang memiliki `ipAddress` (perangkat tanpa IP otomatis dilewati), memperbarui status & latency di database, menyimpan log, serta mengirim notifikasi WhatsApp.

### Menggunakan PM2
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
```

Cek log ping engine:
```bash
pm2 logs ping-engine
```

### Menggunakan Windows Service (`node-windows`) — Direkomendasikan di Windows

Aplikasi dapat dijalankan otomatis sebagai Windows Service untuk Frontend Next.js maupun Backend Ping Engine.

> **Prasyarat:**
> - Jalankan PowerShell / Command Prompt sebagai **Administrator**.
> - Pastikan sudah menjalankan `npm run build` sebelum menginstal service Frontend.
> - Jika lokasi folder project bukan di `D:\PROJECT\monitoring`, sesuaikan properti `script` pada file `install-nextjs-service.js`, `install-services.js`, `uninstall-nextjs-service.js`, dan `uninstall-services.js`.

1. **Install Service Frontend (`MonitoringSystem_FE` — port `3008`):**
   Menjalankan `service-nextjs.js` (`npm start`) dengan `NODE_ENV=production`:
   ```bash
   npm run build
   node install-nextjs-service.js
   ```

2. **Install Service Backend Ping Engine (`MonitoringSystem_BE`):**
   Menjalankan `ping-engine.js` di background dengan `NODE_ENV=production`:
   ```bash
   node install-services.js
   ```

3. **Restart Service setelah Update / Build Ulang:**
   Buka **Services** (`services.msc`) lalu Restart **`MonitoringSystem_FE`** / **`MonitoringSystem_BE`**, atau jalankan di PowerShell (Administrator):
   ```powershell
   Restart-Service -Name "monitoringsystem_fe.exe" -Force
   Restart-Service -Name "monitoringsystem_be.exe" -Force
   ```

4. **Uninstall Service:**
   ```bash
   node uninstall-nextjs-service.js
   node uninstall-services.js
   ```

---

## Struktur Direktori Utama

```text
├── prisma/
│   ├── schema.prisma          # Skema database multi-schema PostgreSQL
│   └── migrations/            # Riwayat migrasi awal
├── src/
│   ├── app/
│   │   ├── api/               # REST API routes (devices, edges, areas, canvas-settings, network/export|import, esxi, storage, ping, dll.)
│   │   ├── network-monitor/   # Halaman kanvas topologi jaringan (React Flow)
│   │   ├── esxi-monitor/      # Monitoring ESXi
│   │   ├── storage-monitor/   # Monitoring Storage TrueNAS & SMB
│   │   ├── recipients/        # Daftar penerima notifikasi
│   │   ├── todo/              # Todo list
│   │   └── whatsapp/          # Integrasi WhatsApp alert
│   ├── components/
│   │   ├── DeviceNode.tsx     # Node perangkat & port Switch/Gateway/Modem
│   │   ├── PortEdge.tsx       # Custom edge dengan label port yang bisa digeser di sepanjang garis
│   │   ├── AreaNode.tsx       # Node area (bentuk custom, resize, rotate 0° guideline, opasitas)
│   │   ├── NetworkSidebar.tsx # Sidebar katalog perangkat (drag & drop)
│   │   └── MainSidebar.tsx    # Navigasi utama
│   └── lib/
│       └── prisma.ts          # Instance Prisma Client dengan PostgreSQL adapter
├── ping-engine.js             # Background ping worker
├── ecosystem.config.js        # Konfigurasi PM2
└── package.json
```
