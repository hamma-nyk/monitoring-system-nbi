import WebSocket from "ws";

interface TrueNasConfig {
  url: string;
  apiKey: string;
}

// Tambahkan tipe call pada WebSocket
interface TrueNasSocket extends WebSocket {
  call: (method: string, params?: any[]) => Promise<any>;
}

export function connectTrueNas({
  url,
  apiKey,
}: TrueNasConfig): Promise<TrueNasSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {
      rejectUnauthorized: false, // Abaikan sertifikat SSL self-signed
    }) as TrueNasSocket;

    const pending: Record<string, (value: any) => void> = {};

    ws.on("open", () => {
      // STEP 1: CONNECT
      ws.send(
        JSON.stringify({
          msg: "connect",
          version: "1",
          support: ["1"],
        }),
      );
    });

    ws.on("message", (raw: Buffer) => {
      const msg = JSON.parse(raw.toString());

      // CONNECTED
      if (msg.msg === "connected") {
        // STEP 2: LOGIN
        ws.send(
          JSON.stringify({
            id: "login",
            msg: "method",
            method: "auth.login_with_api_key",
            params: [apiKey],
          }),
        );
        return;
      }

      // LOGIN RESULT
      if (msg.id === "login") {
        if (msg.result === true) {
          resolve(ws);
        } else {
          reject(new Error("TrueNAS Login failed: Invalid API Key"));
        }
        return;
      }

      // METHOD RESPONSE
      if (msg.id && pending[msg.id]) {
        pending[msg.id](msg.result);
        delete pending[msg.id];
      }
    });

    ws.call = (method: string, params: any[] = []) => {
      return new Promise((res) => {
        const id = Date.now().toString();
        pending[id] = res;

        ws.send(
          JSON.stringify({
            id,
            msg: "method",
            method,
            params,
          }),
        );
      });
    };

    ws.on("error", reject);

    // Timeout jika server tidak merespon dalam 10 detik
    setTimeout(() => reject(new Error("Connection timeout")), 10000);
  });
}
