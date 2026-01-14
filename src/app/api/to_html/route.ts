import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import os from 'os';
import { promises as fsp } from 'fs';
import { spawn } from 'child_process';
import { CONFIG_DIR } from '@/server_constants';

export const runtime = 'nodejs';
const XEMF_LUA = path.join(CONFIG_DIR, 'xemf-to-png.lua');

export function getTempFilePath(prefix = '') {
    const crypto = require('crypto');
    return path.join(os.tmpdir(), `${Date.now()}-${crypto.randomUUID()}${prefix}`);
}

function decodeBufferWithFallback(buf: Buffer): string {
    const utf8 = buf.toString('utf8');
    if (utf8.includes('\uFFFD')) {
        return buf.toString('latin1');
    }
    return utf8;
}

function runCommand(command: string, args: string[], timeoutMs = 15000): Promise<{ code: number | null, signal: NodeJS.Signals | null, stdout: Buffer, stderr: Buffer }> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args);

        const stdoutChunks: Buffer[] = [];
        const stderrChunks: Buffer[] = [];

        let finished = false;
        const timer = setTimeout(() => {
            if (!finished) {
                child.kill('SIGTERM');
            }
        }, timeoutMs);

        child.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
        child.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));

        child.on('error', (err) => {
            clearTimeout(timer);
            finished = true;
            reject(err);
        });

        child.on('exit', (code, signal) => {
            clearTimeout(timer);
            finished = true;
            resolve({ code, signal, stdout: Buffer.concat(stdoutChunks), stderr: Buffer.concat(stderrChunks) });
        });
    });
}

export async function POST(req: NextRequest) {
    const start = new Date();
    let inPath = '';
    let outPath = '';
    let tmpDocx = '';

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

        const originalName = file.name || `upload-${Date.now()}`;
        const title = originalName.replace(/\.[^/.]+$/, '') || 'Anonymized Document';

        inPath = getTempFilePath(path.extname(originalName) || '.bin');
        const buffer = Buffer.from(await file.arrayBuffer());
        await fsp.writeFile(inPath, buffer);

        outPath = getTempFilePath('.html');
        const ext = path.extname(originalName).toLowerCase();

        const luaFilterArgs = await fsp
            .access(XEMF_LUA).then(() => ['--lua-filter', XEMF_LUA])
            .catch(() => []);

        let subproc;

        if (ext === '.txt') {
            subproc = await runCommand('pandoc', [
                inPath,
                '-f', 'markdown',
                '-t', 'html',
                '-o', outPath,
                '--self-contained',
                '--wrap', 'none',
                '--metadata', `title=${title}`,
                ...luaFilterArgs
            ]);
        } else if (ext === '.doc' || ext === '.docx') {
            const base = path.basename(inPath, ext);
            tmpDocx = path.join(os.tmpdir(), `${base}.docx`);
            const conv = await runCommand('lowriter', ['--headless', '--convert-to', 'docx', inPath, '--outdir', os.tmpdir()]);
            if (conv.code !== 0) throw new Error('lowriter conversion failed: ' + conv.stderr.toString());
            subproc = await runCommand('pandoc', [
                tmpDocx,
                '-t', 'html',
                '-o', outPath,
                '--self-contained',
                '--wrap', 'none',
                '--metadata', `title=${title}`,
                ...luaFilterArgs
            ]);
        } else if (ext === '.pdf') {
            subproc = await runCommand('pdftohtml', ['-s', '-dataurls', '-noframes', inPath, outPath]);
            try {
                const outBase = path.basename(outPath);
                await runCommand('sed', ['-i', `s/href="${outBase}#/href="#/g`, outPath]);
            } catch { }
        } else {
            subproc = await runCommand('pandoc', [
                inPath,
                '-t', 'html',
                '-o', outPath,
                '--self-contained',
                '--wrap', 'none',
                '--metadata', `title=${title}`,
                ...luaFilterArgs
            ]);
        }

        console.log('spawn finished:', subproc.code, subproc.signal);
        if (subproc.stderr.length) console.error(subproc.stderr.toString());

        if (!subproc || subproc.code !== 0) {
            const errMsg = subproc ? subproc.stderr.toString() : 'converter failed';
            return NextResponse.json({ error: errMsg }, { status: 500 });
        }

        const outBuf = await fsp.readFile(outPath);
        const html = decodeBufferWithFallback(outBuf);

        console.log(JSON.stringify({
            requestPath: '/api/to_html',
            startTime: start.toISOString(),
            endTime: new Date().toISOString(),
            fileSize: buffer.length,
            fileExt: ext,
            exitCode: subproc.code,
        }));

        return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    } catch (err) {
        console.error('Error in /api/to_html:', err);
        return NextResponse.json({ error: 'Failed to convert file' }, { status: 500 });
    } finally {
        try { if (inPath) await fsp.rm(inPath, { force: true }); } catch { }
        try { if (outPath) await fsp.rm(outPath, { force: true }); } catch { }
        try { if (tmpDocx) await fsp.rm(tmpDocx, { force: true }); } catch { }
    }
}
