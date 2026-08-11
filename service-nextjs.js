const { spawn } = require("child_process");
const path = require("path");

const child = spawn("npm", ["start"], {
  cwd: path.resolve(__dirname),
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NODE_ENV: "production" },
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
