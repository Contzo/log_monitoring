import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { Client, type ConnectConfig } from "ssh2";
import { isKnownHostKey } from "./known-keys.js";
import { readFile } from "node:fs/promises";
import { ConfigService } from "@nestjs/config";

export type SshConfig = Pick<ConnectConfig, "host" | "port" | "username" | "password">;
@Injectable()
export class SshService implements OnApplicationShutdown {
  serverConnections = new Map<number, Promise<Client>>();

  constructor(private readonly config: ConfigService) {}

  getServerConnection(serverId: number, config: SshConfig): Promise<Client> {
    const existent = this.serverConnections.get(serverId);
    if (existent) return existent;

    const attempt = this.connect(serverId, config);
    this.serverConnections.set(serverId, attempt);
    const removeIfCurrent = () => {
      if (this.serverConnections.get(serverId) === attempt) {
        this.serverConnections.delete(serverId);
      }
    };

    attempt.then((client) => client.once("close", removeIfCurrent), removeIfCurrent);
    return attempt;
  }

  private async connect(serverId: number, config: SshConfig): Promise<Client> {
    const knownHosts = await readFile(this.config.getOrThrow<string>("KNOWN_HOSTS_PATH"), "utf8");
    return new Promise((resolve, reject) => {
      const client = new Client();
      let hostKeyRejected = false;

      client.on("ready", () => resolve(client));
      client.on("error", (err) => {
        console.log(`SSH error on server ${serverId}:`, err.message);
        reject(
          hostKeyRejected
            ? new Error(`Host key for ${config.host}:${config.port} is unknown or changed`)
            : err,
        );
      });

      client.connect({
        ...config,
        readyTimeout: 10_000,
        keepaliveInterval: 10_000,
        keepaliveCountMax: 3,
        hostVerifier: (key: Buffer) => {
          const ok = isKnownHostKey(knownHosts, config.host!, config.port ?? 22, key);
          if (!ok) hostKeyRejected = true;
          return ok;
        },
      });
    });
  }

  async onApplicationShutdown() {
    const attempts = [...this.serverConnections.values()];
    this.serverConnections.clear();
    const results = await Promise.allSettled(attempts);
    results.forEach((result) => {
      if (result.status == "fulfilled") result.value.end();
    });
  }
}
