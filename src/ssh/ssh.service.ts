import { Injectable, OnApplicationShutdown, Logger } from "@nestjs/common";
import { Client, type ConnectConfig } from "ssh2";
import { isKnownHostKey } from "./known-keys.js";
import { readFile } from "node:fs/promises";
import { ConfigService } from "@nestjs/config";
import { type ExecResult } from "./exec-result.js";
import { ServerService } from "../server/server.service.js";
import { Server } from "../server/server.entity.js";

export type SshConfig = Pick<ConnectConfig, "host" | "port" | "username">;

@Injectable()
export class SshService implements OnApplicationShutdown {
  serverConnections = new Map<number, Promise<Client>>();
  sshLoger = new Logger("SshService");

  constructor(
    private readonly config: ConfigService,
    private readonly serverService: ServerService,
  ) {}

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

  async execute(
    serverId: number,
    config: SshConfig,
    command: string,
    timeoutMs = 15_000,
  ): Promise<ExecResult> {
    const client = await this.getServerConnection(serverId, config);

    return new Promise((resolve, reject) => {
      client.exec(command, (error, stream) => {
        if (error) return reject(error);

        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];

        const timer = setTimeout(() => {
          reject(new Error(`Command timed out after ${timeoutMs} ms: ${command}`));
          stream.close();
        }, timeoutMs);

        stream.on("data", (chunk: Buffer) => stdout.push(chunk));
        stream.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));

        stream.on("close", (code: number, signal: string) => {
          clearTimeout(timer);
          resolve({
            command,
            stdout: Buffer.concat(stdout),
            stderr: Buffer.concat(stderr),
            code,
            signal,
          });
        });
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

  /*//////////////////////////////////////////////////////////////
                       Private funcitons
//////////////////////////////////////////////////////////////*/
  private async connect(serverId: number, config: SshConfig): Promise<Client> {
    const knownHosts = await readFile(this.config.getOrThrow<string>("KNOWN_HOSTS_PATH"), "utf8");
    const privateKey = await readFile(this.config.getOrThrow<string>("SSH_PRIVATE_KEY"), "utf8");
    return new Promise((resolve, reject) => {
      const client = new Client();
      let hostKeyRejected = false;

      client.on("ready", async () => {
        this.sshLoger.log(`Connected to server: ${serverId}`);
        resolve(client);
        await this.updateServer(serverId, { lastSuccessAt: new Date() });
      });
      client.on("error", async (err) => {
        this.sshLoger.error(`SSH error on server ${serverId}:`, err.stack);
        const error = hostKeyRejected
          ? new Error(`Host key for ${config.host}:${config.port} is unknown or changed`)
          : err;
        reject(error);
        await this.updateServer(serverId, {
          lastErrorAt: new Date(),
          lastError: error.message,
        });
      });

      client.connect({
        ...config,
        privateKey,
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
  private async updateServer(id: number, args: Partial<Server>) {
    try {
      await this.serverService.update(id, args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.sshLoger.error(`Failed to update server ${id}: ${message}`, stack);
    }
  }
}
