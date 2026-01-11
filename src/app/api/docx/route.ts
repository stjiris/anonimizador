import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

function getTempFilePath(suffix = '') {
    return path.join(os.tmpdir(), `${Date.now()}-${randomUUID()}${suffix}`);
}

export async function POST(req: NextRequest) {
    const start = Date.now();
    let inPath = '';
    let outPath = '';

    try {
        const form = await req.formData();
        const file = form.get('file') as File | null;
        if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

        inPath = getTempFilePath();
        outPath = getTempFilePath('.docx');
        const buf = Buffer.from(await file.arrayBuffer());
        await fsp.writeFile(inPath, buf);

        const ref = path.join(process.cwd(), 'src', 'regex', 'reference.docx');
        const refArg = fs.existsSync(ref) ? [`--reference-doc=${ref}`] : [];

        const sub = spawnSync('pandoc', [inPath, '-t', 'docx', '-o', outPath, ...refArg]);

        if (sub.status !== 0) {
            const err = sub.stderr ? sub.stderr.toString() : 'pandoc failed';
            console.error('pandoc error:', err);
            return NextResponse.json({ error: err }, { status: 500 });
        }

        const outBuf = await fsp.readFile(outPath);
        console.log(JSON.stringify({
            path: '/api/docx',
            durationMs: Date.now() - start,
            sizeIn: buf.length,
            sizeOut: outBuf.length,
            code: sub.status,
        }));

        return new NextResponse(outBuf, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${path.basename(file.name || 'file', path.extname(file.name || ''))}.docx"`,
            },
        });
    } catch (err) {
        console.error('Error in /api/docx:', err);
        return NextResponse.json({ error: 'Failed to convert file to docx' }, { status: 500 });
    } finally {
        if (inPath) {
            try { await fsp.rm(inPath, { force: true }); } catch (_) { /* ignore */ }
        }
        if (outPath) {
            try { await fsp.rm(outPath, { force: true }); } catch (_) { /* ignore */ }
        }
    }
}
