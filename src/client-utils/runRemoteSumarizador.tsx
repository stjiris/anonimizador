"use client";
import { useState } from "react";
import { UserFile } from "@/client-utils/UserFile";
import { Button } from "./BootstrapIcons";
import { useSummary } from "./uses";

export function SumarizadorModalBody({ file }: { file: UserFile }) {
    const summary = useSummary(file);
    let [requesting, setRequesting] = useState<boolean>(false);
    let [top, setTop] = useState<number>(5);

    let canRequest = !requesting && (!summary || summary.length === 0);
    let canUpdateArea = !requesting && (!summary || summary.length === 0);
    let canReset = !requesting && summary && summary.length > 0;

    const resetDescritores = () => {
        file.summary = undefined;
        file.notifySummary();
        file.save();
    }

    return <>
        <div className="modal-header">
            <div className="d-flex w-100 justify-content-between align-items-center">
                <h5 className="modal-title" id="modal-descritores-label">Sugestão de sumarização</h5>
                <Button i="file-earmark-play" text="Obter sugestões" className="btn btn-primary m-1 p-1" disabled={!canRequest} onClick={() => { setRequesting(true); requestSummary(file).finally(() => setRequesting(false)) }} />
                <Button i="trash" text="Limpar" className="btn btn-danger m-1 p-1" onClick={resetDescritores} disabled={!canReset} />
            </div>
        </div >
        <div className="modal-body">
            {summary && summary.length > 0 && <>
                <div className="d-flex align-items-center">
                    <Button i="star-fill" text="Top 5" className={`btn m-1 p-1 ${top === 5 ? "active btn-primary" : ""}`} onClick={() => setTop(5)} />
                    <Button i="star-half" text="Top 10" className={`btn m-1 p-1 ${top === 10 ? "active btn-primary" : ""}`} onClick={() => setTop(10)} />
                    <Button i="star" text="Top 20" className={`btn m-1 p-1 ${top === 20 ? "active btn-primary" : ""}`} onClick={() => setTop(20)} />
                    <Button i="all" text="Todos" className={`btn m-1 p-1 ${top === Infinity ? "active btn-primary" : ""}`} onClick={() => setTop(Infinity)} />
                </div>
                <div className="container m-2">
                    {summary?.map((d, i) => i < top && <div key={d.text} className="row border-bottom">
                        <span className="summary m-1 p-1" data-position={i + 1}>
                            {d.text}
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

let requestingSumary = false;
export async function requestSummary(file: UserFile, abort?: AbortSignal) {
    if (requestingSumary) return;
    requestingSumary = true;

    let doc = file.doc;

    let text = textFrom(doc);
    let fd = new FormData()
    fd.append("file", new Blob([text]), "input.txt")

    let resArray: RemoteEntity[] = await fetch("/api/sumarizador", {
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
        requestingSumary = false;
        return;
    }
    file.summary = resArray.map(e => ({ text: e.text, value: e.score }))
    file.notifySummary();
    file.save()
    requestingSumary = false;
}