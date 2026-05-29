import { AnonimizeStateState } from "@/types/AnonimizeState";
import { EntityTypeI } from "@/types/EntityType";
import { UserFile } from "@/core/UserFile";
import { Button } from "@/core/BootstrapIcons";
import { SpecificOffsetRange, useTypesDict } from "@/core/uses";
import { renderBlock } from "./render";
import { UserFileInterface } from "@/types/UserFileInterface";

export function ExportButton({ file }: { file: UserFileInterface }) {
    const entityTypes = useTypesDict(file);
    const _exportFile = (anonimize: boolean, type: "DOCX" | "PDF" | "JSON") => exportFile(file, entityTypes, anonimize, type);
    return <>
        <Button i="download" title="Exportar" className="btn m-1 p-1" data-bs-toggle="dropdown" aria-expanded="false" />
        <ul className="dropdown-menu">
            <li><button onClick={() => _exportFile(true, "JSON")} className="dropdown-item">Ficheiro de trabalho (JSON)</button></li>
            <li><button onClick={() => _exportFile(false, "DOCX")} className="dropdown-item">Original (DOCX)</button></li>
            <li><button onClick={() => _exportFile(false, "PDF")} className="dropdown-item">Original (PDF)</button></li>
            <li><button onClick={() => _exportFile(true, "DOCX")} className="dropdown-item">Anonimizado (DOCX)</button></li>
            <li><button onClick={() => _exportFile(true, "PDF")} className="dropdown-item">Anonimizado (PDF)</button></li>
        </ul>
    </>
}

export async function exportFile(file: UserFileInterface, entityTypes: Record<string, EntityTypeI>, anonimized: boolean, type: "DOCX" | "PDF" | "JSON") {
    const blob = await exportFileBlob(file, entityTypes, anonimized, type);
    if (!blob) {
        alert("Não foi possível concluir a operação. Ocorreu um erro.");
        return;
    }

    const extension = type.toLowerCase();
    let fileName = file.name.replace(/\.[^.]+$/, "");

    if (type === "JSON") {
        fileName = `${fileName}.json`;
    } else {
        fileName = `${anonimized ? "anonimizado" : "original"}_${fileName}.${extension}`;
    }

    const stubAnchor = document.createElement("a");
    stubAnchor.href = URL.createObjectURL(blob);
    stubAnchor.target = "_blank";
    stubAnchor.download = fileName;
    stubAnchor.click();
    URL.revokeObjectURL(stubAnchor.href);
}

export async function exportFileBlob(file: UserFileInterface, entityTypes: Record<string, EntityTypeI>, anonimized: boolean, type: "DOCX" | "PDF" | "JSON"): Promise<Blob | null> {
    if (type === "JSON") {
        return new Blob([JSON.stringify(file.toSavedFile())], { type: "application/json" });
    }

    const offsets: SpecificOffsetRange[] = [];
    file.pool.entities.forEach(e => {
        e.offsets.forEach(o => {
            offsets.push({ ...o, ent: e });
        });
    });

    offsets.sort((a, b) => a.start - b.start);
    let html = renderBlock(file.doc, entityTypes, offsets, anonimized ? AnonimizeStateState.ANONIMIZED : AnonimizeStateState.ORIGINAL, 0, file.images, { current: 0 });

    if (type === "DOCX") {
        return makeDocxDownload(html);
    }

    if (type === "PDF") {
        return makePdfDownload(html, file.name);
    }

    return null;
}

function makeDocxDownload(html: string) {
    let formData = new FormData();
    let htmlBlob = new Blob([html]);
    let htmlFile = new File([htmlBlob], "tmp.html");

    formData.append("file", htmlFile);

    return fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/api/export_docx`, { method: "POST", body: formData }).then(r => r.status === 200 ? r.blob() : null);
}

function makePdfDownload(html: string, originalFileName: string) {
    let formData = new FormData();
    let htmlBlob = new Blob([html]);
    let htmlFile = new File([htmlBlob], `${originalFileName}.html`);

    formData.append("file", htmlFile);

    return fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/api/export_pdf`, { method: "POST", body: formData }).then(r => r.status === 200 ? r.blob() : null);
}