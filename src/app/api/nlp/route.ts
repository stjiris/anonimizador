import { NextRequest, NextResponse } from "next/server";
import http from "http";

export const runtime = "nodejs";
export const maxDuration = 1200;

function httpPost(url: string, body: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const req = http.request({
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname,
            method: "POST",
            headers: {
                "Content-Type": "text/plain",
                "Content-Length": Buffer.byteLength(body),
            },
            timeout: 1200000,
        }, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => resolve(data));
        });
        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timed out"));
        });
        req.write(body);
        req.end();
    });
}

export async function POST(req: NextRequest) {
    const start = new Date();
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const text = await file.text();
        const nlpUrl = process.env.NLP_SERVER_URL || "http://localhost:5001";
        console.log("Calling NLP server:", nlpUrl);

        const raw = await httpPost(nlpUrl, text);
        const jsonData = JSON.parse(raw);

        const end = new Date();
        console.error(JSON.stringify({
            requestPath: "/api/nlp",
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            durationMs: end.getTime() - start.getTime(),
        }));

        return NextResponse.json(jsonData, {
            headers: { "Cache-Control": "no-store" },
            status: 200,
        });
    } catch (err) {
        console.error("NLP endpoint error:", err);
        return NextResponse.json(
            { error: "Failed to process file", details: String(err) },
            { status: 500 }
        );
    }
}