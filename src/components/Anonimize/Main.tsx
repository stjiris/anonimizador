import React, { useEffect, useRef, useState } from "react";
import { UserFile } from "../../types/UserFile";
import MaterialReactTable, { MRT_ColumnDef, MRT_Row, MRT_TableInstance } from "material-react-table";
import AnonimizeContent from "./Content";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { Entity, EntityI } from "../../types/Entity";
import { runRemoteNlp, SuggestButton } from "../../util/runRemoteNlp";
import { updateUserFile } from '../../util/UserFileCRUDL';
import { AnonimizeStateCombined, AnonimizeStateState, AnonimizeVisualState, getAnonimizedStateCombined } from "../../types/AnonimizeState";
import { EntityPool } from "../../types/EntityPool";
import { Bicon, Button } from "../../util/BootstrapIcons";
import { table } from "console";
import { tab } from "@testing-library/user-event/dist/tab";
import { HistoryCommands } from "./HistoryCommands";
import { SavedBadge } from "../../util/savedBadge";
import BootstrapModal from "../../util/BootstrapModal";
import { EntityTable } from "./EntityTable";
import { ExitButton } from "../../util/exitButton";
import { EntitiesStyle } from "../../util/entitiesStyle";
import { TypesModalContent } from "./TypesModalContent";
import { ImageEditorModal } from "./ImageEditorModal";
import { InfoModalContent } from "../../util/infoModalContent";

interface AnonimizeProps{
    file: UserFile
    setUserFile: (file: UserFile | undefined) => void
}

const Sep = () => <small className="text-white text-nowrap p-1 m-1 flex-grow-1 text-center"><Bicon n="dot" /></small>;

export default function Anonimize({file, ...props}: AnonimizeProps){
    // States
    const [anonimizeState, setAnonimizeSate] = useState<AnonimizeStateCombined>(getAnonimizedStateCombined(AnonimizeVisualState.TYPES));
    const saved = file.useSave()();
    const [requesting, setRequesting] = useState<boolean>(false);

    const anonimizedHTML = useRef<string>("");    
    
    const onExit = (evt: BeforeUnloadEvent) => {
        if( !saved ){
            evt.preventDefault();
            evt.returnValue = "Trabalho em progresso não guardado automaticamente. Confirma que pertende sair?"
        }
    }

    useEffect(() => {
        window.addEventListener("beforeunload", onExit)
        return () => {
            window.removeEventListener("beforeunload", onExit)
        }
    },[])
    
    return <>
        <div className="row container-fluid bg-dark m-0 p-0">
            <EntitiesStyle file={file}/>
            <div className="col-8">
                <div className="position-sticky top-0 bg-white p-0 m-0 d-flex" style={{borderBottom: "5px solid #161616",zIndex:1}}>
                    <ExitButton file={file} setUserFile={props.setUserFile} />
                    <SavedBadge file={file} />
                    <Button title="Gerir tipos" i="file-earmark-font" text="Tipos" className="red-link btn m-1 p-1" data-bs-toggle="modal" data-bs-target="#modal-types"/>
                    <Sep/>
                    <select title="Escolher modo" className="red-link btn m-1 p-1 text-start" onChange={(ev) => setAnonimizeSate(getAnonimizedStateCombined(ev.target.value as AnonimizeVisualState)) } defaultValue={AnonimizeVisualState.TYPES} style={{backgroundColor: "var(--secondary-gold)"}}>
                        <option value={AnonimizeVisualState.ORIGINAL}>{AnonimizeVisualState.ORIGINAL}</option>
                        <option value={AnonimizeVisualState.REPLACE}>{AnonimizeVisualState.REPLACE}</option>
                        <option value={AnonimizeVisualState.TYPES}>{AnonimizeVisualState.TYPES}</option>
                        <option value={AnonimizeVisualState.ANONIMIZED}>{AnonimizeVisualState.ANONIMIZED}</option>
                    </select>
                    <Button className="red-link btn m-1 p-1" onClick={() => onClickDownload(anonimizeState.state, file, anonimizedHTML.current)} i="download" title="Download ficheiro"/>
                    <Sep/>
                    <SuggestButton file={file} state={anonimizeState.state} setRequesting={setRequesting} requesting={requesting}/>
                    <HistoryCommands pool={file.pool}/>
                    <a className="red-link m-1 p-1 btn" href="https://docs.google.com/document/d/e/2PACX-1vTaR6kTasw0iGYSSMbJpq2wMgrBN5K37jg5ab_qMih_VpXRO5ZAAeeeDiRYzvyrD_VDxBM2ccW-VuBQ/pub" target="_blank" title="Abrir ajuda"><Bicon n="question-circle"/></a>
                </div>
                <div className="bg-white p-4">
                    {requesting && anonimizeState.state === AnonimizeStateState.TAGGED ?
                        <div className="alert alert-info">A processar o documento, esta operação poderá demorar.</div>
                    :   
                        <AnonimizeContent accessHtml={(html) => anonimizedHTML.current = html} showTypes={anonimizeState.showTypes} file={file} anonimizeState={anonimizeState.state}/>
                    }
                </div>
            </div>
            <div className="col-4">
                <div className="m-0 position-sticky top-0">
                    <EntityTable file={file}/>                    
                </div>
            </div>
        </div>
        <BootstrapModal id="modal-types">
            <TypesModalContent file={file}/>
        </BootstrapModal>
        <ImageEditorModal file={file}/>
        <BootstrapModal id="modal-info">
            <InfoModalContent file={file}/>
        </BootstrapModal>
    </>
}

async function onClickDownload(state: AnonimizeStateState, file: UserFile, html: string){
    let blobToDownload;
    let ext;
    if( state == AnonimizeStateState.TAGGED ){
        blobToDownload = makeJsonDownload(file)
        ext = ".json"
    }
    else{
        blobToDownload = await makeDocxDowload(html)
        ext = ".docx"
    }
    if( !blobToDownload ){
        alert("Não foi possível concluir a operação. Ocorreu um erro.")
        return;
    }
    let stubAnchor = document.createElement("a");
    stubAnchor.href = URL.createObjectURL(blobToDownload);
    stubAnchor.target = "_blank";
    stubAnchor.download = `${state}_${file.name}${ext}`;
    stubAnchor.click();
}

function makeJsonDownload(file: UserFile){
    return new Blob([JSON.stringify(file.toSavedFile())]);
}

function makeDocxDowload(html: string){
    let formData = new FormData();
    let htmlBlob = new Blob([html]);
    let htmlFile = new File([htmlBlob], "tmp.html")

    formData.append("file", htmlFile);

    return fetch("./docx", {method:"POST", body: formData}).then( r => r.status == 200 ? r.blob() : null)
}
