import { watch, stat } from "fs";
import { Glob, type ServerWebSocket } from "bun";
import { parseArgs } from "util";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    logs: {
      type: "string",
    },
  },
  strict: true,
  allowPositionals: true,
});
if (!values.logs) {
  console.error("--logs required (path to logs dir)");
  process.exit(1);
}

type FollowedFilesStartPos = {
  [filename: string]: number;
};

type Content = {
  message: string;
  timestamp: string;
  severity: string;
};

type Payload = {
  filename: string;
  contents: Content[];
};

let socket: ServerWebSocket<unknown> | null = null;
let msgs: Payload[] = [];

function formatJson(content: string): Content[] {
  // TODO: handle exceptions
  const lines = content
    .split("\n")
    .map((line) =>
      line
        .replace(
          /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
          "",
        )
        .trim(),
    )
    .filter((line) => line.length > 0);
  const contents = [];
  const now = new Date().toISOString();
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("{")) {
      contents.push({
        message: lines[i],
        timestamp: now,
        severity: "DEFAULT",
      });
      continue;
    }
    try {
      let obj = JSON.parse(lines[i]);
      obj.message = "message" in obj ? obj["message"]: lines[i];
      obj.timestamp = "timestamp" in obj ? obj["timestamp"]: now;
      obj.severity = "severity" in obj ? obj["severity"] : 'INFO';
      contents.push(obj);
      continue;
    } catch (e) {
      // console.error(e);
    }
    contents.push({
      message: lines[i],
      timestamp: now,
      severity: "INFO",
    });
  }
  return contents;
}

async function staticFiles() {
  return {
    "/index.html": new Response(await Bun.file("./public/index.html").bytes(), {
      headers: {
        "Content-Type": "text/html",
      },
    }),
    "/index.js": new Response(await Bun.file("./public/index.js").bytes(), {
      headers: {
        "Content-Type": "text/javascript",
      },
    }),
    "/scrollbar.js": new Response(
      await Bun.file("./public/scrollbar.js").bytes(),
      {
        headers: {
          "Content-Type": "text/javascript",
        },
      },
    ),
    "/sidenav.js": new Response(
      await Bun.file("./public/sidenav.js").bytes(),
      {
        headers: {
          "Content-Type": "text/javascript",
        },
      },
    ),
    "/render.js": new Response(
      await Bun.file("./public/render.js").bytes(),
      {
        headers: {
          "Content-Type": "text/javascript",
        },
      },
    ),
    "/constants.js": new Response(
      await Bun.file("./public/constants.js").bytes(),
      {
        headers: {
          "Content-Type": "text/javascript",
        },
      },
    ),
    "/style/index.css": new Response(
      await Bun.file("./public/style/index.css").bytes(),
      {
        headers: {
          "Content-Type": "text/css",
        },
      },
    ),
  };
}

async function initLogFollower(
  ws: ServerWebSocket<unknown>,
): Promise<FollowedFilesStartPos> {
  let startPos: FollowedFilesStartPos = {};
  const glob = new Glob("*.log");

  for await (const filename of glob.scan({ cwd: values.logs })) {
    const fullFilename = `${values.logs}/${filename}`;
    stat(fullFilename, async (err, stat) => {
      if (err) {
        console.error(`Couldn't read file ${filename}`, err);
        return;
      }
      startPos[fullFilename] = stat.size;
      let file = Bun.file(fullFilename);
      const str = await file.text();
      // ws.send(`[${JSON.stringify({filename, content: str})}]`);
      ws.send(JSON.stringify([{ filename, contents: formatJson(str) }]));
      console.log(`Initial logs sent for: ${fullFilename}`);
    });
  }

  return startPos;
}

Bun.serve({
  port: 8080,
  static: await staticFiles(),
  async fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/socket") {
      const success = server.upgrade(req);
      if (success) {
        // Bun automatically returns a 101 Switching Protocols
        // if the upgrade succeeds
        return undefined;
      }
    }
    // handle HTTP request normally
    return new Response(await Bun.file("./public/index.html").bytes(), {
      headers: {
        "Content-Type": "text/html",
      },
    });
  },
  websocket: {
    // this is called when a message is received
    async message(ws, message) {
      // Last client wins.
      socket = ws;
      if (message === "ready") {
        console.log(`New client is ${message}`);
        ws.send("hello");
        const startPos = await initLogFollower(ws);
        watch(values.logs as string, (event, filename) => {
          const fullFilename = `${values.logs}/${filename}`;
          if (fullFilename?.endsWith(".log")) {
            stat(fullFilename, async (err, stat) => {
              if (err) {
                console.error(`failed to stat file: ${fullFilename}`, err);
                return;
              }

              if (fullFilename in startPos) {
                if (startPos[fullFilename] > stat.size) {
                  startPos[fullFilename] = 0;
                  // ws.send("clear");
                } else if (startPos[fullFilename] === stat.size) {
                  return;
                }
              } else {
                startPos[fullFilename] = stat.size;
              }

              const str = await Bun.file(fullFilename)
                .slice(startPos[fullFilename], stat.size)
                .text();
              startPos[fullFilename] += str.length;

              msgs.push({ filename: filename!, contents: formatJson(str) });
              console.log(`delta logs sent for: ${fullFilename}`);
            });
            console.log(`Detected ${event} in ${fullFilename}`);
          } else {
            console.log(`Ignoring non-log file: ${fullFilename}`);
          }
        });
      } else {
        console.warn(`Received unsupported message: ${message}`);
      }
    },
  },
});

// Batch send messages so the client has an easier time.
setInterval(() => {
  const batch: Payload[] = [];
  while (msgs.length > 0) {
    const msg = msgs.shift();
    if (msg) {
      batch.push({ filename: msg.filename, contents: msg.contents });
    }
  }
  if (socket && batch.length > 0) {
    socket.send(JSON.stringify(batch));
    console.log(`batch sent msgs ${batch.length}`);
  }
}, 200);

console.log("started");
