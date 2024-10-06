import { watch, stat } from "fs";
import { Glob, type ServerWebSocket } from 'bun';

type FollowedFilesStartPos = {
  [filename: string]: number;
};

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
     "/style/index.css": new Response(await Bun.file("./public/style/index.css").bytes(), {
      headers: {
        "Content-Type": "text/css",
      }, 
    }), 
  };
}

async function initLogFollower(ws: ServerWebSocket<unknown>): Promise<FollowedFilesStartPos> {
  let startPos: FollowedFilesStartPos = {};
  const glob = new Glob("*.log");

  for await (const filename of glob.scan({ cwd: './logs' })) {
    const fullFilename = `./logs/${filename}`;
    stat(fullFilename, async (err, stat) => {
      if (err) {
        console.error(`Couldn't read file ${filename}`, err);
        return;
      }
      startPos[fullFilename] = stat.size;
      let file = Bun.file(fullFilename);
      const str = await file.text();
      ws.send(str);
      console.log(`Initial logs sent for: ${fullFilename}`);
    });
  }

  return startPos;
}

Bun.serve({
  port: 8000,
  static: await staticFiles(),
  async fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === '/socket') {
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
      }
    });
  },
  websocket: {
    // this is called when a message is received
    async message(ws, message) {
      if (message === 'ready') {
        console.log(`New client is ${message}`);
        ws.send('hello');
        const startPos = await initLogFollower(ws)
        watch('./logs', (event, filename) => {
          const fullFilename = `./logs/${filename}`;
          if (fullFilename?.endsWith('.log')) {
            stat(fullFilename, async (err, stat) => {
              if (err) {
                console.error(`failed to stat file: ${fullFilename}`, err);
                return;
              }

              if (fullFilename in startPos) {
                if (startPos[fullFilename] > stat.size) {
                  startPos[fullFilename] = 0;
                } else if (startPos[fullFilename] === stat.size) {
                  console.log('no size change')
                  return;
                }
              } else {
                startPos[fullFilename] = stat.size;
              }

              const str = await Bun.file(fullFilename).slice(startPos[fullFilename], stat.size).text();
              startPos[fullFilename] += str.length;

              // TODO: buffer this! big perf impact
              ws.send(str);
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

