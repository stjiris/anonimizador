import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 1200;

export async function POST(req: NextRequest) {
    const start = new Date();
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const text = await file.text();
        const nlpUrl = process.env.NLP_SERVER_URL || "http://localhost:5001";
        console.log(nlpUrl);

        const result = await fetch(nlpUrl, {
            method: "POST",
            body: text,
            signal: AbortSignal.timeout(1200000),
        });

        if (!result.ok) {
            throw new Error(`NLP server responded: ${result.status} (${result.statusText})`);
        }

        const jsonData = await result.json();

        const end = new Date();
        console.error(JSON.stringify({
            requestPath: "/api/nlp",
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            durationMs: end.getTime() - start.getTime(),
        }));

        return NextResponse.json(jsonData, {
            headers: { "Cache-Control": "no-store" },
            status: 200,
        });
    } catch (err) {
        console.error("NLP endpoint error:", err);
        return NextResponse.json(
            { error: "Failed to process file", details: String(err) },
            { status: 500 }
        );
    }
}