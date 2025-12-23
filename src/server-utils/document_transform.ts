import { SavedUserFile } from "@/client-utils/UserFile";
import { getEntityTypeIs } from "@/client-utils/EntityTypeLogic";

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