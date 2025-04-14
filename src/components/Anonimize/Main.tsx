import { useEffect, useRef, useState } from "react";
import { AnonimizeStateCombined, AnonimizeStateState, AnonimizeVisualState, getAnonimizedStateCombined } from "../../types/AnonimizeState";
import { UserFile } from "../../types/UserFile";
import { Bicon, Button } from "../../util/BootstrapIcons";
import BootstrapModal from "../../util/BootstrapModal";
import { EntitiesStyle } from "../../util/entitiesStyle";
import { ExitButton, ForceExitButton } from "../../util/exitButton";
import { InfoModalContent } from "../../util/infoModalContent";
import { SuggestButton } from "../../util/runRemoteNlp";
import { SavedBadge } from "../../util/savedBadge";
import { useSave } from "../../util/uses";
import AnonimizeContent from "./Content";
import { EntityTable } from "./EntityTable";
import { HistoryCommands } from "./HistoryCommands";
import { ImageEditorModal } from "./ImageEditorModal";
import { SearchModalContent } from "./SearchModalContent";
import { TypesModalContent } from "./TypesModalContent";
import { ToolsButton, ToolsModalBody } from "./Tools";
import { ExportButton } from "./ExportButton";

interface AnonimizeProps {
    file: UserFile
    setUserFile: (file: UserFile | undefined) => void
}

const Sep = () => <small className="text-white text-nowrap p-1 m-1 flex-grow-1 text-center"><Bicon n="dot" /></small>;

export default function Anonimize({ file, ...props }: AnonimizeProps) {
    // States
    const [anonimizeState, setAnonimizeSate] = useState<AnonimizeStateCombined>(getAnonimizedStateCombined(AnonimizeVisualState.TYPES));
    const saved = useSave(file);
    const [requesting, setRequesting] = useState<boolean>(false);

    const anonimizedHTML = useRef<string>("");


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

    return <>
        <div className="row container-fluid bg-dark m-0 p-0">
            <EntitiesStyle file={file} />
            <div className="col-9">
                <div className="position-sticky top-0 bg-white p-0 m-0 d-flex" style={{ borderBottom: "5px solid #161616", zIndex: 1 }}>
                    {requesting ? <ForceExitButton setUserFile={props.setUserFile} /> : <ExitButton file={file} setUserFile={props.setUserFile} />}
                    <SavedBadge file={file} />
                    <ToolsButton />
                    <Button title="Gerir tipos" i="file-earmark-font" text="Tipos" className="btn btn-sm text-body  alert alert-primary m-1 p-1" data-bs-toggle="modal" data-bs-target="#modal-types" />
                    <Sep />
                    <select title="Escolher modo" className="text-body btn m-1 p-1 text-start alert alert-primary" onChange={(ev) => setAnonimizeSate(getAnonimizedStateCombined(ev.target.value as AnonimizeVisualState))} defaultValue={AnonimizeVisualState.TYPES}>
                        <option value={AnonimizeVisualState.ORIGINAL}>{AnonimizeVisualState.ORIGINAL}</option>
                        <option value={AnonimizeVisualState.REPLACE}>{AnonimizeVisualState.REPLACE}</option>
                        <option value={AnonimizeVisualState.TYPES}>{AnonimizeVisualState.TYPES}</option>
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
                        <AnonimizeContent accessHtml={(html) => anonimizedHTML.current = html} showTypes={anonimizeState.showTypes} file={file} anonimizeState={anonimizeState.state} />
                    }
                </div>
            </div>
            <div className="col-3">
                <div className="m-0 position-sticky top-0">
                    <EntityTable file={file} />
                </div>
            </div>
        </div>
        <BootstrapModal id="modal-types">
            <TypesModalContent file={file} />
        </BootstrapModal>
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
