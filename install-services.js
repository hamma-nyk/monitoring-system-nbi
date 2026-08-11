const Service = require("node-windows").Service;

console.log("Menyiapkan instalasi service...");

const svc = new Service({
  name: "Network Ping Engine",
  description: "Background service untuk memantau status perangkat jaringan",
  // Pastikan path ini menunjuk ke file ping-engine Anda yang sebenarnya
  script: "D:\\PROJECT\\monitoring\\ping-engine.js",

  // Opsional: Memastikan service otomatis restart jika crash
  env: [
    {
      name: "NODE_ENV",
      value: "production",
    },
  ],
});

// Event listener saat instalasi selesai
svc.on("install", function () {
  console.log("Instalasi berhasil! Menjalankan service...");
  svc.start();
});

// Event listener jika service sudah ada sebelumnya
svc.on("alreadyinstalled", function () {
  console.log("Service ini sudah terinstal.");
});

// Eksekusi instalasi
svc.install();
