import { useCallback, useEffect, useRef, useState } from "react";

import { AnonimizeStateCombined, AnonimizeStateState, AnonimizeVisualState, getAnonimizedStateCombined } from "../../types/AnonimizeState";
import AnonimizeContent from "./Content";
import { EntityTable } from "./EntityTable";
import { HistoryCommands } from "./HistoryCommands";
import { ImageEditorModal } from "./ImageEditorModal";
import { SearchModalContent } from "./SearchModalContent";
import { ToolsButton, ToolsModalBody } from "./Tools";
import { ExportButton } from "./ExportButton";
import { UserFile } from "@/core/UserFile";
import { Bicon, Button } from "@/core/BootstrapIcons";
import { useSave } from "@/core/uses";
import { EntitiesStyle } from "@/core/entitiesStyle";
import { ExitButton, ForceExitButton } from "./ExitButton";
import { SavedBadge } from "@/components/SavedBadge";
import { SuggestButton } from "@/core/runRemoteNlp";
import BootstrapModal from "@/core/BootstrapModal";
import { InfoModalContent } from "@/core/infoModalContent";

interface AnonimizeProps {
    file: UserFile
    setUserFile: (file: UserFile | undefined) => void
}

const Sep = () => (
    <small className="text-white text-nowrap p-1 m-1 flex-grow-1 text-center">
        <Bicon n="dot" />
    </small>
);

export default function Anonimize({ file, ...props }: AnonimizeProps) {
    const [anonimizeState, setAnonimizeSate] = useState<AnonimizeStateCombined>(getAnonimizedStateCombined(AnonimizeVisualState.ALL_TYPES));
    const saved = useSave(file);
    const [requesting, setRequesting] = useState<boolean>(false);

    const anonimizedHTML = useRef<string>("");
    const [paginated, setPaginated] = useState<boolean>(false);

    useEffect(() => {
        const onExit = (evt: BeforeUnloadEvent) => {
            if (!saved) {
                evt.preventDefault();
                evt.returnValue = "Trabalho em progresso não guardado automaticamente. Confirma que pertende sair?"
            }
            if (requesting) {
                evt.preventDefault();
                evt.returnValue = "A anonimização automática será cancelada. Confirma que pertende sair?"
            }
        }
        window.addEventListener("beforeunload", onExit)
        return () => {
            window.removeEventListener("beforeunload", onExit)
        }
    }, [requesting, saved])

    const [tableWidthPercent, setTableWidthPercent] = useState(41.67); // ~col-5
    const isDragging = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const rightPercent = ((rect.right - e.clientX) / rect.width) * 100;
            setTableWidthPercent(Math.min(70, Math.max(20, rightPercent)));
        };

        const onMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    }, []);

    return <>
        <div id="doc" ref={containerRef} className="w-100 m-0 p-0 bg-white" style={{ display: "flex" }}>
            <EntitiesStyle file={file} />
            <div className="p-0 m-0" style={{ width: `${100 - tableWidthPercent}%`, minWidth: 0 }}>
                <div className="anon-toolbar position-sticky top-0 bg-white p-0 m-0 d-flex" style={{ borderBottom: "1px solid #161616", zIndex: 1 }}>                    {requesting ? <ForceExitButton setUserFile={props.setUserFile} /> : <ExitButton file={file} setUserFile={props.setUserFile} />}
                    <SavedBadge file={file} />
                    <Button title="Gerir perfil" i="person-badge" text="Perfil" className="btn btn-sm text-body  alert alert-primary m-1 p-1" data-bs-toggle="modal" data-bs-target="#modal-profile" />
                    <Sep />
                    <Button title="Documento paginado" i="file-earmark-break" text="Paginar" className={"btn btn-sm m-1 p-1 " + (paginated ? "btn-success" : "btn-danger")} onClick={() => setPaginated(p => !p)} />
                    <select title="Escolher modo" className="text-body btn m-1 p-1 text-start alert alert-primary" onChange={(ev) => setAnonimizeSate(getAnonimizedStateCombined(ev.target.value as AnonimizeVisualState))} defaultValue={AnonimizeVisualState.ALL_TYPES}>
                        <option value={AnonimizeVisualState.ORIGINAL}>{AnonimizeVisualState.ORIGINAL}</option>
                        <option value={AnonimizeVisualState.REPLACE}>{AnonimizeVisualState.REPLACE}</option>
                        <option value={AnonimizeVisualState.REPLACE_NORMAL}>{AnonimizeVisualState.REPLACE_NORMAL}</option>
                        <option value={AnonimizeVisualState.REPLACE_OTHER}>{AnonimizeVisualState.REPLACE_OTHER}</option>
                        <option value={AnonimizeVisualState.ALL_TYPES}>{AnonimizeVisualState.ALL_TYPES}</option>
                        <option value={AnonimizeVisualState.NORMAL_TYPES}>{AnonimizeVisualState.NORMAL_TYPES}</option>
                        <option value={AnonimizeVisualState.OTHER_TYPES}>{AnonimizeVisualState.OTHER_TYPES}</option>
                        <option value={AnonimizeVisualState.ANONIMIZED}>{AnonimizeVisualState.ANONIMIZED}</option>
                    </select>
                    <ExportButton file={file} />
                    <Sep />
                    <Button title="Pesquisar" i="search" text="Pesquisar" className="btn btn-sm text-body  alert alert-primary m-1 p-1" data-bs-toggle="modal" data-bs-target="#modal-search" />
                    <SuggestButton file={file} state={anonimizeState.state} setRequesting={setRequesting} requesting={requesting} />
                    <HistoryCommands pool={file.pool} />
                    <a className="red-link m-1 p-1 btn" href="https://docs.google.com/document/d/e/2PACX-1vTaR6kTasw0iGYSSMbJpq2wMgrBN5K37jg5ab_qMih_VpXRO5ZAAeeeDiRYzvyrD_VDxBM2ccW-VuBQ/pub" target="_blank" title="Abrir ajuda" rel="noreferrer"><Bicon n="question-circle" /></a>
                </div>
                <div className="bg-white p-4">
                    {requesting && anonimizeState.state === AnonimizeStateState.TAGGED ?
                        <div className="alert alert-info">A processar o documento, esta operação poderá demorar.</div>
                        :
                        <AnonimizeContent paginated={paginated} accessHtml={(html) => anonimizedHTML.current = html} showTypes={anonimizeState.showTypes} file={file} anonimizeState={anonimizeState.state} />
                    }
                </div>
            </div>
            <div className="resize-handle" onMouseDown={onMouseDown} />
            <div id="entityTable" className="p-0 m-0" style={{ width: `${tableWidthPercent}%`, minWidth: 0 }}>
                <div className="m-0 position-sticky top-0">
                    <EntityTable file={file} />
                </div>
            </div>
        </div>
        <ImageEditorModal file={file} />
        <BootstrapModal id="modal-info">
            <InfoModalContent file={file} />
        </BootstrapModal>
        <BootstrapModal id="modal-search">
            <SearchModalContent file={file} />
        </BootstrapModal>
        <BootstrapModal id="modal-tools">
            <ToolsModalBody file={file} />
        </BootstrapModal>
    </>
}
