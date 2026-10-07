// Tiny proxy: 5174 -> Vite on 5173, rewriting Host so Vite never 403s.
import http from "node:http";
import net from "node:net";

const TARGET = { host: "127.0.0.1", port: 5173 };

const server = http.createServer((req, res) => {
  const proxyReq = http.request(
    {
      ...TARGET,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: "localhost:5173" },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on("error", () => {
    res.writeHead(502);
    res.end("Vite dev server not reachable on port 5173. Is `npm run dev` running?");
  });
  req.pipe(proxyReq);
});

server.on("upgrade", (req, socket, head) => {
  const reqSocket = net.connect(TARGET.port, TARGET.host, () => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
        Object.entries({ ...req.headers, host: "localhost:5173" })
          .map(([k, v]) => `${k}: ${v}`)
          .join("\r\n") +
        "\r\n\r\n"
    );
    reqSocket.write(head);
    reqSocket.pipe(socket).pipe(reqSocket);
  });
  reqSocket.on("error", () => socket.destroy());
});

server.listen(5174, "127.0.0.1", () =>
  console.log("proxy ready on http://127.0.0.1:5174 -> localhost:5173")
);
