import { Client } from "ssh2";

const connection = new Client();

function waitForConnectoin(): Promise<void> {
  return new Promise((resolve) => {
    connection.once("ready", () => resolve());
  });
}

connection

  .connect({
    host: "localhost",
    port: 2222,
    username: "root",
    password: "test",
  });

async function runCommand() {
  await waitForConnectoin();
  connection.exec("uptime", (err, stream) => {
    if (err) throw err;
    stream
      .on("close", (code: number, signal: string) => {
        console.log("Stream :: close :: code: " + code + ", signal: " + signal);
        connection.end();
      })
      .on("data", (data: Buffer) => {
        console.log("STDOUT: " + data);
      })
      .stderr.on("data", (data) => {
        console.log("STDERR: " + data);
      });
  });
}

await runCommand();
