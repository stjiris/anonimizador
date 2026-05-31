import { AnonimizeStateState } from "@/types/AnonimizeState";
import { EntityTypeI } from "@/types/EntityType";
import { UserFile } from "@/core/UserFile";
import { Button } from "@/core/BootstrapIcons";
import { SpecificOffsetRange, useTypesDict } from "@/core/uses";
import { renderBlock } from "./render";
import { UserFileInterface } from "@/types/UserFileInterface";
import { useState } from "react";

const JURIS_URL = process.env.NEXT_PUBLIC_JURIS_URL;

export function ExportButton({ file }: { file: UserFileInterface }) {
    const entityTypes = useTypesDict(file);
    const [sending, setSending] = useState(false);
    const _exportFile = (anonimize: boolean, type: "DOCX" | "PDF" | "JSON") => exportFile(file, entityTypes, anonimize, type);

    const pushToJuris = async () => {
        if (!file.jurisId) return;
        setSending(true);
        try {
            const offsets: SpecificOffsetRange[] = [];
            file.pool.entities.forEach(e => e.offsets.forEach(o => offsets.push({ ...o, ent: e })));
            offsets.sort((a, b) => a.start - b.start);

            const fullAnonimized = renderBlock(file.doc, entityTypes, offsets, AnonimizeStateState.ANONIMIZED, 0, file.images, { current: 0 });

            const parser = new DOMParser();
            const anonDoc = parser.parseFromString(fullAnonimized, "text/html");
            const origDoc = parser.parseFromString(file.html_contents, "text/html");

            const anonSumarioEl = anonDoc.querySelector('[data-juris="sumario"]');
            const anonTextoEl = anonDoc.querySelector('[data-juris="texto"]');
            const origSumarioEl = origDoc.querySelector('[data-juris="sumario"]');
            const origTextoEl = origDoc.querySelector('[data-juris="texto"]');

            const anonimizedTexto = anonTextoEl ? anonTextoEl.innerHTML : fullAnonimized;
            const anonimizedSumario = anonSumarioEl ? anonSumarioEl.innerHTML : null;
            const originalTexto = origTextoEl ? origTextoEl.innerHTML : file.html_contents;
            const originalSumario = origSumarioEl ? origSumarioEl.innerHTML : null;

            const entities: Record<string, string[]> = {};
            for (const entity of file.pool.entities) {
                if (!entities[entity.type]) entities[entity.type] = [];
                for (const offset of entity.offsets) {
                    entities[entity.type].push(offset.preview);
                }
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/api/juris/push_document`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jurisId: file.jurisId, anonimizedTexto, anonimizedSumario, originalTexto, originalSumario, entities }),
            });

            if (!res.ok) throw new Error(await res.text());
            window.open(file.jurisDocUrl || JURIS_URL, "_blank", "noopener,noreferrer");
        } catch (err) {
            console.error(err);
            alert("Erro ao enviar documento para o Juris.");
        } finally {
            setSending(false);
        }
    };

    return <>
        <Button i="download" title="Exportar" className="btn m-1 p-1" data-bs-toggle="dropdown" aria-expanded="false" />
        <ul className="dropdown-menu">
            <li><button onClick={() => _exportFile(true, "JSON")} className="dropdown-item">Ficheiro de trabalho (JSON)</button></li>
            <li><button onClick={() => _exportFile(false, "DOCX")} className="dropdown-item">Original (DOCX)</button></li>
            <li><button onClick={() => _exportFile(false, "PDF")} className="dropdown-item">Original (PDF)</button></li>
            <li><button onClick={() => _exportFile(true, "DOCX")} className="dropdown-item">Anonimizado (DOCX)</button></li>
            <li><button onClick={() => _exportFile(true, "PDF")} className="dropdown-item">Anonimizado (PDF)</button></li>
            {JURIS_URL && file.jurisId && <>
                <li><hr className="dropdown-divider" /></li>
                <li>
                    <button onClick={pushToJuris} disabled={sending} className="dropdown-item">
                        {sending ? <><span className="spinner-border spinner-border-sm me-2" role="status" />A enviar...</> : "→ Juris"}
                    </button>
                </li>
            </>}
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