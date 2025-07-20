import { AnonimizeStateState } from "../../types/AnonimizeState";
import { EntityTypeI } from "../../types/EntityTypes";
import { UserFile } from "../../types/UserFile";
import { Button } from "../../util/BootstrapIcons";
import { SpecificOffsetRange, useTypesDict } from "../../util/uses";
import { renderBlock } from "./render";

export function ExportButton({ file }: { file: UserFile }) {
    const entityTypes = useTypesDict(file);
    const _exportFile = (anonimize: boolean, type: "DOCX" | "PDF" | "JSON") => exportFile(file, entityTypes, anonimize, type);
    return <>
        <Button i="download" title="Exportar" className="red-link btn m-1 p-1" data-bs-toggle="dropdown" aria-expanded="false" />
        <ul className="dropdown-menu">
            <li><button onClick={() => _exportFile(true, "JSON")} className="dropdown-item">Ficheiro de trabalho (JSON)</button></li>
            <li><button onClick={() => _exportFile(false, "DOCX")} className="dropdown-item">Original (DOCX)</button></li>
            <li><button onClick={() => _exportFile(false, "PDF")} className="dropdown-item">Original (PDF)</button></li>
            <li><button onClick={() => _exportFile(true, "DOCX")} className="dropdown-item">Anonimizado (DOCX)</button></li>
            <li><button onClick={() => _exportFile(true, "PDF")} className="dropdown-item">Anonimizado (PDF)</button></li>
        </ul>
    </>
}

function exportFile(file: UserFile, entityTypes: Record<string, EntityTypeI>, anonimized: boolean, type: "DOCX" | "PDF" | "JSON") {
    if (type === "JSON") {
        let blobToDownload = new Blob([JSON.stringify(file.toSavedFile())]);
        let stubAnchor = document.createElement("a");
        stubAnchor.href = URL.createObjectURL(blobToDownload);
        stubAnchor.target = "_blank";
        stubAnchor.download = `${file.name}.json`;
        stubAnchor.click();
    }
    if (type === "DOCX") {
        const offsets: SpecificOffsetRange[] = [];
        file.pool.entities.forEach(e => {
            e.offsets.forEach(o => {
                offsets.push({ ...o, ent: e })
            })
        })
        offsets.sort((a, b) => a.start - b.start);
        let html = renderBlock(file.doc, entityTypes, offsets, anonimized ? AnonimizeStateState.ANONIMIZED : AnonimizeStateState.ORIGINAL, 0, file.images, { current: 0 })
        makeDocxDowload(html).then(blob => {
            if (!blob) {
                alert("Não foi possível concluir a operação. Ocorreu um erro.")
                return;
            }
            let stubAnchor = document.createElement("a");
            stubAnchor.href = URL.createObjectURL(blob);
            stubAnchor.target = "_blank";
            stubAnchor.download = `${anonimized ? "anonimizado" : "original"}_${file.name}.docx`;
            stubAnchor.click();
        })
    }
    if (type === "PDF") {
        const offsets: SpecificOffsetRange[] = [];
        file.pool.entities.forEach(e => {
            e.offsets.forEach(o => {
                offsets.push({ ...o, ent: e })
            })
        })
        offsets.sort((a, b) => a.start - b.start);
        let html = renderBlock(file.doc, entityTypes, offsets, anonimized ? AnonimizeStateState.ANONIMIZED : AnonimizeStateState.ORIGINAL, 0, file.images, { current: 0 })

        const winHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${file.name}</title></head><body>${html}</body></html>`
        const winUrl = URL.createObjectURL(new Blob([winHtml], { type: "text/html" }));
        const win = window.open(winUrl, "_blank");
        if (win) {
            win.onload = () => {
                win.print();
            }
        }
    }
}

function makeDocxDowload(html: string) {
    let formData = new FormData();
    let htmlBlob = new Blob([html]);
    let htmlFile = new File([htmlBlob], "tmp.html")

    formData.append("file", htmlFile);

    return fetch("./docx", { method: "POST", body: formData }).then(r => r.status === 200 ? r.blob() : null)
}
