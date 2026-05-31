import { createServer } from "http";
import { parse } from "url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "7999", 10);

const app = next({ dev, hostname: "0.0.0.0", port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    server.timeout = 1200000;
    server.headersTimeout = 1210000;
    server.keepAliveTimeout = 1210000;

    server.listen(port, "0.0.0.0", () => {
        console.log(`> Ready on http://0.0.0.0:${port}`);
    });
});