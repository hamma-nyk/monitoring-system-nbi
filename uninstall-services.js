const Service = require("node-windows").Service;
const svc = new Service({
  name: "Network Ping Engine",
  script: "D:\\PROJECT\\monitoring\\ping-engine.js",
});
svc.on("uninstall", function () {
  console.log("Uninstall selesai.");
});
svc.uninstall();
