const Service = require("node-windows").Service;
const svc = new Service({
  name: "MonitoringSystem_BE",
  script: "D:\\PROJECT\\monitoring\\ping-engine.js",
});
svc.on("uninstall", function () {
  console.log("Uninstall selesai.");
});
svc.uninstall();
