import { NextRequest, NextResponse } from "next/server";
import { promises as fsp } from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function runCommand(command: string, args: string[], timeoutMs = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args);
        const stderrChunks: Buffer[] = [];

        const timer = setTimeout(() => {
            child.kill("SIGTERM");
        }, timeoutMs);

        child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
        child.on("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });
        child.on("exit", (code, signal) => {
            clearTimeout(timer);
            if (signal === "SIGTERM") {
                reject(new Error(`${command} timed out`));
                return;
            }
            if (code !== 0) {
                reject(new Error(Buffer.concat(stderrChunks).toString() || `${command} failed with code ${code}`));
                return;
            }
            resolve();
        });
    });
}

export async function POST(req: NextRequest) {
    let tmpDir = "";

    try {
        const form = await req.formData();
        const file = form.get("file") as File | null;
        const maxPages = Math.max(1, Math.min(5, Number(form.get("maxPages") || 3)));

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), `pdf-preview-${randomUUID()}-`));
        const inPath = path.join(tmpDir, "input.pdf");
        const outPrefix = path.join(tmpDir, "page");

        await fsp.writeFile(inPath, Buffer.from(await file.arrayBuffer()));
        await runCommand("pdftoppm", ["-png", "-f", "1", "-l", String(maxPages), "-r", "120", inPath, outPrefix]);

        const pageFiles = (await fsp.readdir(tmpDir))
            .filter((name) => /^page-\d+\.png$/.test(name))
            .sort((a, b) => Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0));

        const pages = await Promise.all(pageFiles.map(async (name) => {
            const buf = await fsp.readFile(path.join(tmpDir, name));
            return `data:image/png;base64,${buf.toString("base64")}`;
        }));

        return NextResponse.json({ pages });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Error in /api/pdf_preview:", err);
        return NextResponse.json({ error: message }, { status: 500 });
    } finally {
        if (tmpDir) {
            try { await fsp.rm(tmpDir, { recursive: true, force: true }); } catch { }
        }
    }
}