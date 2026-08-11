import { Client } from "ssh2";

const toGB = (bytes: number) =>
  bytes ? Number((bytes / 1024 / 1024 / 1024).toFixed(2)) : 0;

// --- 1. CORE SSH CLIENT ---
export function sshExec(cfg: any, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let output = "";

    conn
      .on("ready", () => {
        conn.exec(command, (err, stream) => {
          if (err) return reject(err);
          stream
            .on("data", (d: any) => (output += d.toString()))
            .on("close", () => {
              conn.end();
              resolve(output.trim());
            });
        });
      })
      .on("keyboard-interactive", (name, instr, lang, prompts, finish) => {
        finish(prompts.map(() => cfg.password));
      })
      .on("error", (err) => reject(err))
      .connect({
        host: cfg.host,
        port: 22,
        username: cfg.username,
        tryKeyboard: true, // Wajib untuk ESXi
        readyTimeout: 10000,
        algorithms: {
          kex: [
            "diffie-hellman-group1-sha1",
            "diffie-hellman-group14-sha1",
            "ecdh-sha2-nistp256",
            "ecdh-sha2-nistp384",
            "ecdh-sha2-nistp521",
            "diffie-hellman-group-exchange-sha256",
            "diffie-hellman-group14-sha256",
          ],
          cipher: [
            "aes128-ctr",
            "aes192-ctr",
            "aes256-ctr",
            "aes128-gcm",
            "aes128-gcm@openssh.com",
            "aes256-gcm",
            "aes256-gcm@openssh.com",
          ],
          serverHostKey: [
            "ssh-rsa",
            "ecdsa-sha2-nistp256",
            "ecdsa-sha2-nistp384",
            "ecdsa-sha2-nistp521",
            "ssh-ed25519",
          ],
        },
      });
  });
}

// --- 2. FUNGSI MONITORING ---
export async function getHostUsage(cfg: any) {
  const raw = await sshExec(cfg, "vim-cmd hostsvc/hostsummary");

  const memTotalBytes = raw.match(/memorySize\s*=\s*(\d+)/);
  const memUsedMB = raw.match(/overallMemoryUsage\s*=\s*(\d+)/);
  const cpuUsedMHz = raw.match(/overallCpuUsage\s*=\s*(\d+)/);
  const cpuMhz = raw.match(/cpuMhz\s*=\s*(\d+)/);
  const cpuCores = raw.match(/numCpuCores\s*=\s*(\d+)/);

  const totalMB = memTotalBytes ? Number(memTotalBytes[1]) / 1024 / 1024 : null;
  const usedMB = memUsedMB ? Number(memUsedMB[1]) : null;
  const memPercent =
    totalMB && usedMB ? Number(((usedMB / totalMB) * 100).toFixed(1)) : null;

  const cpuPercent =
    cpuUsedMHz && cpuMhz && cpuCores
      ? Number(
          (
            (Number(cpuUsedMHz[1]) /
              (Number(cpuMhz[1]) * Number(cpuCores[1]))) *
            100
          ).toFixed(1),
        )
      : null;

  return {
    memory: {
      totalGB: totalMB ? (totalMB / 1024).toFixed(1) : "0",
      usedGB: usedMB ? (usedMB / 1024).toFixed(1) : "0",
      percent: memPercent || 0,
    },
    cpu: { percent: cpuPercent || 0 },
  };
}

export async function getDatastore(cfg: any) {
  const out = await sshExec(cfg, "esxcli storage filesystem list");
  const lines = out.split("\n").slice(2);

  return lines
    .filter((l) => l.trim().startsWith("/vmfs"))
    .map((line) => {
      const cols = line.trim().split(/\s{2,}/);
      const size = Number(cols[5]);
      const free = Number(cols[6]);
      return {
        name: cols[1],
        sizeGB: toGB(size),
        freeGB: toGB(free),
        usedGB: toGB(size - free),
        usedPercent: Number((((size - free) / size) * 100).toFixed(1)),
      };
    });
}

export async function getVmSummary(cfg: any) {
  const allRaw = await sshExec(cfg, "vim-cmd vmsvc/getallvms");
  const runningRaw = await sshExec(
    cfg,
    "esxcli vm process list | grep 'Display Name'",
  );

  const runningNames = runningRaw
    .split("\n")
    .map((l) => l.replace("Display Name:", "").trim())
    .filter(Boolean);
  const totalVms = allRaw.split("\n").slice(1).filter(Boolean).length;

  return {
    total: totalVms,
    running: runningNames.length,
    stopped: totalVms - runningNames.length,
  };
}

// --- 3. FUNGSI MANAJEMEN VM ---
export async function listVM(cfg: any) {
  const allRaw = await sshExec(cfg, "vim-cmd vmsvc/getallvms");
  const runningRaw = await sshExec(
    cfg,
    "esxcli vm process list | grep 'Display Name'",
  );

  const runningNames = runningRaw
    .split("\n")
    .map((l) => l.replace("Display Name:", "").trim())
    .filter(Boolean);

  return allRaw
    .split("\n")
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(\d+)\s+(.+?)\s+\[/);
      const osMatch = line.match(/\.vmx\s+(\S+)\s+/);
      const guestOs = osMatch ? osMatch[1] : "Unknown";

      if (!m) return null;

      const id = m[1];
      const name = m[2].trim();
      const isRunning = runningNames.includes(name);

      return { id, name, os: guestOs, status: isRunning ? "ON" : "OFF" };
    })
    .filter(Boolean);
}

export async function getVmDetail(cfg: any, id: string) {
  const raw = await sshExec(cfg, `vim-cmd vmsvc/get.summary ${id}`);

  const extract = (key: string) => {
    const regex = new RegExp(`${key}\\s*=\\s*"([^"]+)"`);
    const m = raw.match(regex);
    return m ? m[1] : "-";
  };

  const ipMatch = raw.match(/ipAddress\s*=\s*"([^"]+)"/);
  const uptimeMatch = raw.match(/uptimeSeconds\s*=\s*(\d+)/);
  const toolsStatus = raw.match(/toolsStatus\s*=\s*"([^"]+)"/);
  const state = raw.match(/powerState\s*=\s*"([^"]+)"/);

  return {
    powerState: state ? state[1] : "unknown",
    ip: ipMatch ? ipMatch[1] : "Tidak terdeteksi (Tools not installed?)",
    uptimeSeconds: uptimeMatch ? Number(uptimeMatch[1]) : 0,
    tools: toolsStatus ? toolsStatus[1] : "notInstalled",
    guestFullName: extract("guestFullName"),
  };
}

export async function vmPower(cfg: any, id: string, action: string) {
  const validActions: Record<string, string> = {
    on: "power.on",
    off: "power.off",
    reboot: "power.reset",
  };

  if (!validActions[action]) throw new Error("Invalid VM action");
  return sshExec(cfg, `vim-cmd vmsvc/${validActions[action]} ${id}`);
}
