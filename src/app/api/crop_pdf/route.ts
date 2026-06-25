import { NextRequest, NextResponse } from "next/server";
import path from "path";
import os from "os";
import { promises as fsp } from "fs";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { formatXml, PdfCropMargins, wrapXmlIntoHtml } from "@/core/pdfUtils";

export const runtime = "nodejs";

function getTempFilePath(prefix = "") {
    return path.join(os.tmpdir(), `${Date.now()}-${randomUUID()}${prefix}`);
}

function decodeBufferWithFallback(buf: Buffer): string {
    const utf8 = buf.toString("utf8");
    if (utf8.includes("\uFFFD")) {
        return buf.toString("latin1");
    }
    return utf8;
}

function runCommand(
    command: string,
    args: string[],
    timeoutMs = 15000
): Promise<{
    code: number | null,
    signal: NodeJS.Signals | null,
    stdout: Buffer,
    stderr: Buffer
}> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args);
        const stdoutChunks: Buffer[] = [];
        const stderrChunks: Buffer[] = [];

        let finished = false;
        const timer = setTimeout(() => {
            if (!finished) {
                child.kill("SIGTERM");
            }
        }, timeoutMs);

        child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
        child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
        child.on("error", (err) => {
            clearTimeout(timer);
            finished = true;
            reject(err);
        });
        child.on("exit", (code, signal) => {
            clearTimeout(timer);
            finished = true;
            resolve({
                code,
                signal,
                stdout: Buffer.concat(stdoutChunks),
                stderr: Buffer.concat(stderrChunks),
            });
        });
    });
}

function parseMargin(value: FormDataEntryValue | null, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(100, parsed));
}

export async function POST(req: NextRequest) {
    let inPath = "";
    let xmlPath = "";

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const margins: PdfCropMargins = {
            headerPercent: parseMargin(formData.get("headerPercent"), 10),
            footerPercent: parseMargin(formData.get("footerPercent"), 10),
        };

        const originalName = file.name || `upload-${Date.now()}.pdf`;
        const title = originalName.replace(/\.[^/.]+$/, "") || "Anonymized Document";

        inPath = getTempFilePath(".pdf");
        const baseOutPath = getTempFilePath();
        xmlPath = baseOutPath + ".xml";

        await fsp.writeFile(inPath, Buffer.from(await file.arrayBuffer()));

        const sub = await runCommand("pdftohtml", ["-xml", "-noframes", "-dataurls", inPath, baseOutPath]);

        try {
            const outBase = path.basename(baseOutPath);
            await runCommand("sed", ["-i", `s/href="${outBase}#/href="#/g`, xmlPath]);
        } catch { }

        if (!sub || sub.code !== 0) {
            throw new Error(sub ? sub.stderr.toString() : "pdftohtml failed");
        }

        const outBuf = await fsp.readFile(xmlPath);
        const raw = decodeBufferWithFallback(outBuf);
        const html = wrapXmlIntoHtml(formatXml(raw, margins), title);

        return new NextResponse(html, {
            headers: { "content-type": "text/html; charset=utf-8" },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Error in /api/crop_pdf:", err);
        return NextResponse.json({ error: message }, { status: 500 });
    } finally {
        try { if (inPath) await fsp.rm(inPath, { force: true }); } catch { }
        try { if (xmlPath) await fsp.rm(xmlPath, { force: true }); } catch { }
    }
}