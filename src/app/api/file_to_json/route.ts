import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 1200;

function htmlToText(html: string): string {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

export async function POST(req: NextRequest) {
    const base = new URL(req.url).origin;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const toHtmlForm = new FormData();
    toHtmlForm.append('file', file);
    const htmlRes = await fetch(`${base}${basePath}/api/to_html`, { method: 'POST', body: toHtmlForm });
    if (!htmlRes.ok) {
        const err = await htmlRes.text();
        return NextResponse.json({ error: 'to_html failed', details: err }, { status: 500 });
    }
    const html = await htmlRes.text();
    const text = htmlToText(html);

    const nlpForm = new FormData();
    nlpForm.append('file', new Blob([text], { type: 'text/plain' }), 'text.txt');
    const nlpRes = await fetch(`${base}${basePath}/api/nlp`, { method: 'POST', body: nlpForm });
    if (!nlpRes.ok) {
        const err = await nlpRes.text();
        return NextResponse.json({ error: 'nlp failed', details: err }, { status: 500 });
    }
    const nlp = await nlpRes.json();

    return NextResponse.json({ nlp });
}
