const Service = require("node-windows").Service;

const svc = new Service({
  name: "MonitoringSystem_FE",
  script: "D:\\PROJECT\\monitoring\\service-nextjs.js",
});

svc.on("uninstall", function () {
  console.log("Uninstall selesai.");
});

svc.uninstall();
