import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const jurisUrl = process.env.NEXT_PUBLIC_JURIS_URL;
    const secret = process.env.ANONIMIZADOR_SECRET;

    if (!jurisUrl) {
        return NextResponse.json({ ok: false, message: "JURIS_URL not configured" }, { status: 503 });
    }

    try {
        const { jurisId, anonimizedTexto, anonimizedSumario, originalTexto, originalSumario } = await req.json();

        if (!jurisId || !anonimizedTexto) {
            return NextResponse.json({ ok: false, message: "Missing jurisId or anonimizedTexto" }, { status: 400 });
        }

        const res = await fetch(`${jurisUrl}/api/anonimizar/receber`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(secret ? { "x-service-secret": secret } : {}),
            },
            body: JSON.stringify({ jurisId, anonimizedTexto, anonimizedSumario, originalTexto, originalSumario }),
        });

        if (!res.ok) {
            const text = await res.text();
            console.error("Juris returned error:", res.status, text);
            return NextResponse.json({ ok: false, message: "Juris rejected the update" }, { status: 502 });
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Error in push_document:", err);
        return NextResponse.json({ ok: false, message: "Internal server error" }, { status: 500 });
    }
}
