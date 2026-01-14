import { NextResponse } from "next/server";
import { getDocumentEndpoint } from "./getDocument";
import { saveDocumentEndpoint } from "./saveDocument";

export async function GET(request: Request, { params }: { params: Promise<{ action: string }> }): Promise<NextResponse<unknown>> {
    console.log(params);
    const resolved_params = await params;
    if (resolved_params.action === "get_document") {
        return await getDocumentEndpoint(request);
    } else if (resolved_params.action === "save_document") {
        return await saveDocumentEndpoint(request);
    }
    return NextResponse.json(
        { ok: false, message: "Not Found" },
        { status: 404 }
    );
}