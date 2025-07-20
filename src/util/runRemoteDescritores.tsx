import { useState } from "react";
import { UserFile } from "../types/UserFile";
import { Button } from "./BootstrapIcons";
import { useArea, useDescriptors } from "./uses";

export function DescritoresModalBody({ file }: { file: UserFile }) {
    const area = useArea(file);
    const descriptors = useDescriptors(file);
    let [requesting, setRequesting] = useState<boolean>(false);
    let [top, setTop] = useState<number>(5);

    let canRequest = !requesting && area && (!descriptors || descriptors.length === 0);
    let canUpdateArea = !requesting && (!descriptors || descriptors.length === 0);
    let canReset = !requesting && descriptors && descriptors.length > 0;

    const updateArea = (area: string) => {
        file.area = area || undefined;
        file.notifyArea();
        file.save();
    }

    const resetDescritores = () => {
        file.descriptors = undefined;
        file.notifyDescriptors();
        file.save();
    }

    return <>
        <div className="modal-header">
            <div className="d-flex w-100 justify-content-between align-items-center">
                <h5 className="modal-title" id="modal-descritores-label">Sugestão de descritores</h5>
                <div className="input-group w-50">
                    <label className="input-group-text" htmlFor="area">Área</label>
                    <select className="form-select" id="area" defaultValue={area} onChange={e => updateArea(e.target.value)} disabled={!canUpdateArea}>
                        <option value="">Área...</option>
                        <option value="civel">Cível</option>
                        <option value="criminal">Criminal</option>
                        <option value="social">Social</option>
                        <option value="contencioso">Contencioso</option>
                    </select>
                </div>
                <Button i="file-earmark-play" text="Obter sugestões" className="btn btn-primary m-1 p-1" disabled={!canRequest} onClick={() => { setRequesting(true); requestDescriptors(file).finally(() => setRequesting(false)) }} />
                <Button i="trash" text="Limpar" className="btn btn-danger m-1 p-1" onClick={resetDescritores} disabled={!canReset} />
            </div>
        </div >
        <div className="modal-body">
            {descriptors && descriptors.length > 0 && <>
                <div className="d-flex align-items-center">
                    <Button i="star-fill" text="Top 5" className={`btn m-1 p-1 ${top === 5 ? "active btn-primary" : ""}`} onClick={() => setTop(5)} />
                    <Button i="star-half" text="Top 10" className={`btn m-1 p-1 ${top === 10 ? "active btn-primary" : ""}`} onClick={() => setTop(10)} />
                    <Button i="star" text="Top 20" className={`btn m-1 p-1 ${top === 20 ? "active btn-primary" : ""}`} onClick={() => setTop(20)} />
                    <Button i="all" text="Todos" className={`btn m-1 p-1 ${top === Infinity ? "active btn-primary" : ""}`} onClick={() => setTop(Infinity)} />
                </div>
                <div className="container m-2">
                    {descriptors?.map((d, i) => i < top && <div key={d.label} className="row border-bottom">
                        <span className="descritor m-1 p-1" data-position={i + 1}>
                            {d.label}
                        </span>
                    </div>)}
                </div>
            </>}
        </div>
        <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
        </div>
    </>
}


interface RemoteEntity {
    text: string,
    score: number
}

function textFrom(html: Element): string {
    if (html.tagName === "P") {
        return (html.textContent || "") + "\n";
    }
    if (html.nodeType === document.TEXT_NODE) {
        return (html.textContent || "");
    }
    return Array.from(html.children).map(el => textFrom(el)).join("");
}

let requestingDescriptors = false;
export async function requestDescriptors(file: UserFile, abort?: AbortSignal) {
    if (requestingDescriptors) return;
    requestingDescriptors = true;

    let doc = file.doc;

    let text = textFrom(doc);
    let fd = new FormData()
    fd.append("file", new Blob([text]), "input.txt")
    if (file.area) {
        fd.append("area", file.area)
    }

    let resArray: RemoteEntity[] = await fetch("./descritores", {
        method: "POST",
        body: fd,
        signal: abort
    }).then(r => {
        if (r.status === 200)
            return r.json();
        alert(`Servidor respondeu: ${r.status} (${r.statusText})`)
        return [];
    }).catch(e => {
        if (e instanceof DOMException && e.name === "AbortError") return [];
        alert(e);
        return [];
    })

    if (resArray.length === 0) {
        requestingDescriptors = false;
        return;
    }
    file.descriptors = resArray.map(e => ({ label: e.text, value: e.score }))
    file.notifyDescriptors();
    file.save()
    requestingDescriptors = false;
}