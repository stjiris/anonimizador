import { saveDocument } from "@/server-utils/document_store";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const expectedSecret = process.env.ANONIMIZADOR_SECRET;

    if (expectedSecret) {
        const got = request.headers.get("x-service-secret");
        if (!got || got !== expectedSecret) {
            console.warn("Invalid or missing x-service-secret");
            return NextResponse.json(
                { ok: false, message: "Unauthorized" },
                { status: 401 }
            );
        }
    }

    try {
        const payload = await request.json();

        console.log("/api/new_document received");

        console.log({
            token: payload?.token ?? null,
            hasDocument: !!payload?.document,
            ts: payload?.ts ?? null,
        });

        if (payload?.document) {
            if (typeof payload.document === "string") {
                console.log("Document preview:", payload.document.slice(0, 300));
            } else if (typeof payload.document === "object") {
                console.log("Document keys:", Object.keys(payload.document).slice(0, 20));
            }
        }
        const { token, document } = payload;
        saveDocument(token, document, 3600);
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Error in /api/new_document:", err);
        return NextResponse.json(
            { ok: false, message: "Invalid JSON or server error" },
            { status: 500 }
        );
    }
}
