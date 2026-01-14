import { NextResponse } from "next/server";
import { getAndDeleteDocument } from "./aux";

export async function getDocumentEndpoint(request: Request): Promise<NextResponse<unknown>> {
    try {
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

        const { searchParams } = new URL(request.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json(
                { ok: false, message: "Missing token parameter" },
                { status: 400 }
            );
        }

        const document = await getAndDeleteDocument(token);

        if (!document) {
            return NextResponse.json(
                { ok: false, message: "Document not found or already retrieved" },
                { status: 404 }
            );
        }

        console.log("Document retrieved and deleted for token:", token);

        return NextResponse.json({ ok: true, document });
    } catch (err) {
        console.error("Error in /api/get_document:", err);
        return NextResponse.json(
            { ok: false, message: "Server error" },
            { status: 500 }
        );
    }
}


