import { NextRequest, NextResponse } from "next/server";
import path from "path";
import os from "os";
import { promises as fsp } from "fs";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { PYTHON_COMMAND } from "@/global";

export const runtime = "nodejs";

function getTempFilePath(suffix = "") {
    return path.join(os.tmpdir(), `${Date.now()}-${randomUUID()}${suffix}`);
}

async function safeRm(p: string | undefined) {
    if (!p) return;
    try {
        await fsp.rm(p, { force: true });
    } catch (e) {
    }
}

export async function POST(req: NextRequest) {
    const start = new Date();
    let inPath: string | undefined = undefined;

    try {
        const formData = await req.formData();

        const file = formData.get("file") as File | null;
        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const originalName = file.name || `upload-${Date.now()}`;

        inPath = getTempFilePath(path.extname(originalName) || ".txt");
        const buffer = Buffer.from(await file.arrayBuffer());
        await fsp.writeFile(inPath, buffer);

        const scriptPath = path.join(process.cwd(), "src", "scripts", "anonimizador-text.py");
        const spawnCmd = PYTHON_COMMAND || "python3";
        const spawnArgs = [scriptPath, "-i", inPath, "-f", "json"];

        const result = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
            const child = spawn(spawnCmd, spawnArgs, {
                stdio: ["ignore", "pipe", "pipe"],
            });

            let stdoutData = "";
            let stderrData = "";

            child.on("error", (err) => {
                reject(err);
            });

            child.stdout.on("data", (chunk: Buffer) => {
                stdoutData += chunk.toString();
            });

            child.stderr.on("data", (chunk: Buffer) => {
                const txt = chunk.toString();
                stderrData += txt;
                process.stderr.write(`[PY STDERR ${new Date().toISOString()}] ${txt}`);
            });

            child.on("close", (code, signal) => {
                const end = new Date();
                console.error(
                    JSON.stringify({
                        requestPath: "/api/text",
                        startTime: start.toISOString(),
                        endTime: end.toISOString(),
                        durationMs: end.getTime() - start.getTime(),
                        tmpInput: inPath,
                        exitCode: code,
                        signal,
                    })
                );

                if (code === 0) {
                    resolve({ stdout: stdoutData, stderr: stderrData, code });
                } else {
                    reject(new Error(`Process exited with code ${code}: ${stderrData}`));
                }
            });
        });

        await safeRm(inPath);

        const jsonData = JSON.parse(result.stdout);

        return NextResponse.json(jsonData, {
            headers: {
                "Cache-Control": "no-store",
            },
            status: 200,
        });

    } catch (err) {
        await safeRm(inPath);
        return NextResponse.json(
            { error: "Failed to process file", details: String(err) },
            { status: 500 }
        );
    }
}