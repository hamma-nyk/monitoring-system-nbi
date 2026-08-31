const Service = require("node-windows").Service;

const svc = new Service({
  name: "MonitoringSystem_FE",
  description: "Monitoring System app running on port 3008",
  script: "D:\\PROJECT\\monitoring\\service-nextjs.js",
  env: [
    {
      name: "NODE_ENV",
      value: "production",
    },
  ],
});

svc.on("install", function () {
  console.log("Instalasi berhasil! Menjalankan service...");
  svc.start();
});

svc.on("alreadyinstalled", function () {
  console.log("Service sudah terinstal.");
});

svc.install();
