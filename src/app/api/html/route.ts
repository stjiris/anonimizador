import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import os from 'os';
import { promises as fsp } from 'fs';
import { spawnSync } from 'child_process';
import { CONFIG_DIR } from '@/server_constants';

export const runtime = 'nodejs';
const XEMF_LUA = path.join(CONFIG_DIR, 'xemf-to-png.lua');

export function getTempFilePath(prefix = '') {
    const os = require('os');
    const crypto = require('crypto');
    const path = require('path');
    return path.join(os.tmpdir(), `${Date.now()}-${crypto.randomUUID()}${prefix}`);
}

function decodeBufferWithFallback(buf: Buffer): string {
    const utf8 = buf.toString('utf8');
    if (utf8.includes('\uFFFD')) {
        return buf.toString('latin1');
    }
    return utf8;
}

export async function POST(req: NextRequest) {
    const start = new Date();
    const tmpDir = os.tmpdir();
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
            subproc = spawnSync('pandoc', [
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
            tmpDocx = path.join(tmpDir, `${base}.docx`);
            subproc = spawnSync('lowriter', ['--headless', '--convert-to', 'docx', inPath, '--outdir', tmpDir]);
            if (subproc.status === 0) {
                subproc = spawnSync('pandoc', [
                    tmpDocx,
                    '-t', 'html',
                    '-o', outPath,
                    '--self-contained',
                    '--wrap', 'none',
                    '--metadata', `title=${title}`,
                    ...luaFilterArgs
                ]);
            }
        } else if (ext === '.pdf') {
            subproc = spawnSync('pdftohtml', ['-s', '-dataurls', '-noframes', inPath, outPath]);
            try {
                const outBase = path.basename(outPath);
                spawnSync('sed', ['-i', `s/href="${outBase}#/href="#/g`, outPath]);
            } catch { }
        } else {
            subproc = spawnSync('pandoc', [
                inPath,
                '-t', 'html',
                '-o', outPath,
                '--self-contained',
                '--wrap', 'none',
                '--metadata', `title=${title}`,
                ...luaFilterArgs
            ]);
        }

        console.error('spawn: Exited with', subproc?.status);
        if (subproc?.stderr) console.error(subproc.stderr.toString());
        if (subproc?.stdout) console.error(subproc.stdout.toString());

        if (!subproc || subproc.status !== 0) {
            const errMsg = subproc && subproc.stderr ? subproc.stderr.toString() : 'converter failed';
            return NextResponse.json({ error: errMsg }, { status: 500 });
        }

        const outBuf = await fsp.readFile(outPath);
        const html = decodeBufferWithFallback(outBuf);

        const end = new Date();
        console.log(JSON.stringify({
            requestPath: '/api/html',
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            fileSize: buffer.length,
            fileExt: ext,
            exitCode: subproc.status,
        }));

        return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    } catch (err) {
        console.error('Error in /api/html:', err);
        return NextResponse.json({ error: 'Failed to convert file' }, { status: 500 });
    } finally {
        try { if (inPath) await fsp.rm(inPath, { force: true }); } catch { }
        try { if (outPath) await fsp.rm(outPath, { force: true }); } catch { }
        try { if (tmpDocx) await fsp.rm(tmpDocx, { force: true }); } catch { }
    }
}