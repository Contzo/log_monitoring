import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { Client, type ConnectConfig } from "ssh2";
import { isKnownHostKey } from "./known-keys.js";
import { readFile } from "node:fs/promises";
import { ConfigService } from "@nestjs/config";
import { type ExecResult } from "./exec-result.js";
import { assertSuccess } from "./exec-result.js";
import { isNumber } from "class-validator";
import { Server } from "../server/server.entity.js";

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
    return new Promise((resolve, reject) => {
      const client = new Client();
      let hostKeyRejected = false;

      client.on("ready", () => {
        console.log("Connected to server: ", serverId);
        resolve(client);
      });
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
}
