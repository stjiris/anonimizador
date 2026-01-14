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

function runPandoc(inPath: string, outPath: string, refArg: string[], timeoutMs = 15000): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn("pandoc", [inPath, "-t", "docx", "-o", outPath, ...refArg]);

        const timer = setTimeout(() => {
            child.kill("SIGTERM");
        }, timeoutMs);

        child.stdout.on("data", (data) => console.log(data.toString()));
        child.stderr.on("data", (data) => console.error(data.toString()));

        child.on("exit", (code, signal) => {
            clearTimeout(timer);

            if (signal === "SIGTERM") {
                return reject(new Error("pandoc timed out"));
            }

            if (code !== 0) {
                return reject(new Error(`pandoc failed with code ${code}`));
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

        inPath = getTempFilePath();
        outPath = getTempFilePath(".docx");
        const buf = Buffer.from(await file.arrayBuffer());
        await fsp.writeFile(inPath, buf);

        const ref = path.join(process.cwd(), "src", "regex", "reference.docx");
        const refArg = fs.existsSync(ref) ? [`--reference-doc=${ref}`] : [];

        await runPandoc(inPath, outPath, refArg, 15000);

        const outBuf = await fsp.readFile(outPath);

        console.log(JSON.stringify({
            path: "/api/export_docx",
            durationMs: Date.now() - start,
            sizeIn: buf.length,
            sizeOut: outBuf.length,
        }));

        return new NextResponse(outBuf, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `attachment; filename="${path.basename(file.name || "file", path.extname(file.name || ""))}.docx"`,
            },
        });

    } catch (err: any) {
        console.error("Error in /api/export_docx:", err);
        return NextResponse.json({ error: err.message || "Failed to convert file to docx" }, { status: 500 });
    } finally {
        if (inPath) {
            try { await fsp.rm(inPath, { force: true }); } catch (_) { /* ignore */ }
        }
        if (outPath) {
            try { await fsp.rm(outPath, { force: true }); } catch (_) { /* ignore */ }
        }
    }
}
