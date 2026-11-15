import { Injectable } from "@nestjs/common";
import { Client, type ConnectConfig } from "ssh2";

@Injectable()
export class SshService {
  connectToServer(
    config: Pick<ConnectConfig, "host" | "port" | "username" | "password">,
  ): Promise<Client> {
    return new Promise((resolve, reject) => {
      const newConnecton = new Client();
      newConnecton.on("ready", () => {
        console.log(`Conneciton on ${config.host}:${config.port} ready`);
        resolve(newConnecton);
      });
      newConnecton.on("error", (errr) => reject(errr));
      newConnecton.on("close", () =>
        console.log(`Connection on ${config.host}:${config.port} closed`),
      );
      newConnecton.connect(config);
    });
  }
}
