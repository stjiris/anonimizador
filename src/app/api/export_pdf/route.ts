import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { promises as fsp } from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function getTempFilePath(suffix = "") {
    return path.join(os.tmpdir(), `${Date.now()}-${randomUUID()}${suffix}`);
}

function runLibreOffice(inPath: string, outDir: string, timeoutMs = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn("libreoffice", ["--headless", "--convert-to", "pdf", inPath, "--outdir", outDir]);

        const timer = setTimeout(() => {
            child.kill("SIGTERM");
        }, timeoutMs);

        child.stdout.on("data", (data) => console.log(data.toString()));
        child.stderr.on("data", (data) => console.error(data.toString()));

        child.on("exit", (code, signal) => {
            clearTimeout(timer);
            if (signal === "SIGTERM") {
                return reject(new Error("libreoffice timed out"));
            }
            if (code !== 0) {
                return reject(new Error(`libreoffice failed with code ${code}`));
            }
            resolve();
        });

        child.on("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

export async function POST(req: NextRequest) {
    const start = Date.now();
    let inPath = "";
    let outPath = "";

    try {
        const form = await req.formData();
        const file = form.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file" }, { status: 400 });
        }

        inPath = getTempFilePath(".html");
        const outDir = path.dirname(inPath);
        await fsp.writeFile(inPath, Buffer.from(await file.arrayBuffer()));

        await runLibreOffice(inPath, outDir, 30000);

        outPath = path.join(outDir, `${path.basename(inPath, ".html")}.pdf`);
        if (!fs.existsSync(outPath)) {
            return NextResponse.json({ error: "PDF conversion failed" }, { status: 500 });
        }

        const outBuf = await fsp.readFile(outPath);
        const downloadedName = `${path.basename(file.name, path.extname(file.name))}.pdf`;

        console.log(JSON.stringify({
            path: "/api/export_pdf",
            durationMs: Date.now() - start,
            sizeIn: Buffer.byteLength(await file.text()),
            sizeOut: outBuf.length,
        }));

        return new NextResponse(outBuf, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${downloadedName}"`,
            },
        });
    } catch (err: any) {
        console.error("Error in /api/export_pdf:", err);
        return NextResponse.json({ error: err.message || "Failed to convert file to pdf" }, { status: 500 });
    } finally {
        if (inPath) {
            try { await fsp.rm(inPath, { force: true }); } catch (_) { }
        }
        if (outPath) {
            try { await fsp.rm(outPath, { force: true }); } catch (_) { }
        }
    }
}