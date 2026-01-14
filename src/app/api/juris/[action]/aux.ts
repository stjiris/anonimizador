import { getEntityTypeIs } from "@/core/EntityTypeLogic";
import { SavedUserFile } from "@/core/UserFile";

interface ApiDocument {
    id: string;
    "Número de Processo": string;
    "Texto": string;
    "Sumário"?: string;
    "Fonte"?: string;
    "UUID"?: string;
    "URL"?: string;
    [key: string]: any;
}

const temp_documents = new Map<string, { document: ApiDocument; expiresAt: number }>();

export function transformApiDocumentToSavedUserFile(apiDoc: ApiDocument): SavedUserFile {
    let htmlContents: string = "";

    const summary = apiDoc["Sumário"];
    if (summary) {
        htmlContents += `<div class="alert alert-info" role="alert">${summary}</div>`;
    }
    htmlContents = apiDoc["Texto"] || "";

    const name = apiDoc["Número de Processo"] || `Document_${apiDoc.id}`;

    const savedUserFile: SavedUserFile = {
        name: name,
        html_contents: htmlContents,
        functions: getEntityTypeIs().map(k => ({
            name: k.name,
            functionIndex: k.functionIndex
        })),
        ents: [],
        imported: new Date().toString(),
        modified: new Date().toString(),
        images: {},
        lastTopPosition: 0,
        descriptors: [],
        area: apiDoc["Area"],
        profile: undefined,
    };

    return savedUserFile;
}


export function saveDocument(token: string, document: any, ttlSeconds = 3600) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    temp_documents.set(token, { document, expiresAt });

    console.log("Document saved for token:", token);
    console.log("Map size:", temp_documents.size);

    setTimeout(() => {
        temp_documents.delete(token);
        console.log("Document expired for token:", token);
    }, ttlSeconds * 1000);
}


export function getAndDeleteDocument(token: string) {
    console.log("Map size before retrieval:", temp_documents.size);
    console.log("All tokens:", Array.from(temp_documents.keys()));

    const data = temp_documents.get(token);

    console.log("Retrieving document for token:", token);
    console.log("Data found:", !!data);

    if (!data) {
        return null;
    }

    if (Date.now() > data.expiresAt) {
        temp_documents.delete(token);
        return null;
    }

    temp_documents.delete(token);
    return data.document;
}
