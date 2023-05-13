import React, { useEffect, useRef, useState } from "react";
import { UserFile } from "../../types/UserFile";
import MaterialReactTable, { MRT_ColumnDef, MRT_Row, MRT_TableInstance } from "material-react-table";
import AnonimizeContent from "./Content";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { Entity, EntityI } from "../../types/Entity";
import { runRemoteNlp } from "../../util/runRemoteNlp";
import { updateUserFile } from '../../util/UserFileCRUDL';
import { AnonimizeStateCombined, AnonimizeStateState, AnonimizeVisualState, getAnonimizedStateCombined } from "../../types/AnonimizeState";
import { EntityPool } from "../../types/EntityPool";
import { getEntityType, getEntityTypes } from "../../types/EntityTypes";
import { Bicon, Button } from "../../util/BootstrapIcons";
import { table } from "console";
import { tab } from "@testing-library/user-event/dist/tab";
import { HistoryCommands } from "./HistoryCommands";
import { SavedBadge } from "../../util/savedBadge";
import BootstrapModal from "../../util/BootstrapModal";

interface AnonimizeProps{
    file: UserFile
    setUserFile: (file: UserFile | undefined) => void
}

const Sep = () => <small className="text-white text-nowrap p-1 m-1 flex-grow-1 text-center"><Bicon n="dot" /></small>;
export default function Anonimize(props: AnonimizeProps){
    // consts
    const doc: HTMLElement = new DOMParser().parseFromString(props.file.html_contents, "text/html").body;
    
    // refs
    const anonimizedHTML = useRef<string>("")
    const poolRef = useRef<EntityPool>();
    if( !poolRef.current ){
        poolRef.current = new EntityPool(doc.textContent?.normalize("NFKC") || "", props.file.ents)
    }

    const pool = poolRef.current!;

    // States
    const [anonimizeState, setAnonimizeSate] = useState<AnonimizeStateCombined>(getAnonimizedStateCombined(AnonimizeVisualState.TYPES));
    const [ents, setEnts] = useState<Entity[]>([...pool.entities]);
    const [saved, setSaved] = useState<boolean>(updateUserFile(props.file));
    const [requesting, setRequesting] = useState<boolean>(false);
    
    
    const onExit = (evt: BeforeUnloadEvent) => {
        if( !saved ){
            evt.preventDefault();
            evt.returnValue = "Trabalho em progresso não guardado automaticamente. Confirma que pertende sair?"
        }
    }

    const onPoolChange = (action: string): void => {
        props.file.ents = pool.entities;
        setEnts([...pool.entities]);
        setSaved(updateUserFile(props.file))
    }

    useEffect(() => {
        pool.onChange(onPoolChange)
        window.addEventListener("beforeunload", onExit)
        return () => {
            pool.offChange(onPoolChange)
            window.removeEventListener("beforeunload", onExit)
        }
    },[props.file])
    
    return <>
        <div className="row container-fluid bg-dark m-0 p-0">
            <div className="col-8">
                <div className="position-sticky top-0 bg-white p-0 m-0 d-flex" style={{borderBottom: "5px solid #161616",zIndex:1}}>
                    <Button className="btn red-link fw-bold m-1 p-1" onClick={() => (saved || window.confirm("Trabalho não será guardado no browser. Sair?")) ? props.setUserFile(undefined) : null} i="arrow-left" title="Fechar ficheiro"/>
                    <SavedBadge saved={saved} name={props.file.name} />
                    <Button title="Gerir tipos" i="file-earmark-font" text="Tipos" className="red-link btn m-1 p-1" data-bs-toggle="modal" data-bs-target="#modal-types"/>
                    <Button i="file-earmark-play" text="Sugerir" className="red-link btn m-1 p-1" onClick={() => {setRequesting(true); runRemoteNlp(doc, pool).finally(() => setRequesting(false))}} disabled={pool.entities.length > 0 || requesting || anonimizeState.state !== AnonimizeStateState.TAGGED} />
                    <Sep/>
                    <select title="Escolher modo" className="red-link btn m-1 p-1 text-start" onChange={(ev) => setAnonimizeSate(getAnonimizedStateCombined(ev.target.value as AnonimizeVisualState)) } defaultValue={AnonimizeVisualState.TYPES} style={{backgroundColor: "var(--secondary-gold)"}}>
                        <option value={AnonimizeVisualState.ORIGINAL}>{AnonimizeVisualState.ORIGINAL}</option>
                        <option value={AnonimizeVisualState.REPLACE}>{AnonimizeVisualState.REPLACE}</option>
                        <option value={AnonimizeVisualState.TYPES}>{AnonimizeVisualState.TYPES}</option>
                        <option value={AnonimizeVisualState.ANONIMIZED}>{AnonimizeVisualState.ANONIMIZED}</option>
                    </select>
                    <Button className="red-link btn m-1 p-1" onClick={() => onClickDownload(anonimizeState.state, props.file, anonimizedHTML.current)} i="download" title="Download ficheiro"/>
                    <Sep/>
                    <HistoryCommands pool={pool}/>
                    <a className="red-link m-1 p-1 btn" href="https://docs.google.com/document/d/e/2PACX-1vTaR6kTasw0iGYSSMbJpq2wMgrBN5K37jg5ab_qMih_VpXRO5ZAAeeeDiRYzvyrD_VDxBM2ccW-VuBQ/pub" target="_blank" title="Abrir ajuda"><Bicon n="question-circle"/></a>
                </div>
                <div className="bg-white p-4">
                    {requesting && anonimizeState.state === AnonimizeStateState.TAGGED ?
                        <div className="alert alert-info">A processar o documento, esta operação poderá demorar.</div>
                    :   
                        <AnonimizeContent accessHtml={(html) => anonimizedHTML.current = html} showTypes={anonimizeState.showTypes} doc={doc} pool={pool} ents={ents} anonimizeState={anonimizeState.state}/>
                    }
                </div>
            </div>
            <div className="col-4">
                <div className="m-0 position-sticky top-0">
                    <MaterialReactTable
                    key="ent-table"
                    enableRowSelection
                    enableColumnOrdering
                        enableEditing
                        positionActionsColumn="last"
                        editingMode="cell"
                        enableDensityToggle={false}
                        enableHiding={true}
                        enableStickyHeader
                        enablePagination={false}
                        enableFullScreenToggle={false}
                        renderDetailPanel={entityDetails(pool)}
                        renderTopToolbarCustomActions={({table}) => {
                            let selectedeKeys = selectedIndexes(table).length
                            return <div className="d-flex w-100"> 
                                <Button i="union" text="Juntar" className="btn btn-primary" disabled={selectedeKeys <= 1} onClick={() => joinSelectedEntities(table, pool)} />
                                <Button i="exclude" text="Separar" className="btn btn-warning mx-2" disabled={selectedeKeys === 0} onClick={() => splitSelectedEntities(table, pool)} />
                                <Button i="trash" text="Remover" className="btn btn-danger" disabled={selectedeKeys === 0} onClick={() => removeSelectedEntities(table, pool)} />
                            </div>
                        }}
                        muiTableBodyCellProps={{style: {
                            whiteSpace: "normal",
                            wordWrap:"break-word" 
                        }}}
                        muiTableHeadCellProps={{
                            style: {
                                borderBottom: "5px solid #161616"
                            }
                        }}
                        positionToolbarAlertBanner="bottom"
                        initialState={{
                            density: 'compact'
                        }}
                        columns={[HEADER,ENTITY,TYPE(pool),ANONIMIZE(pool)]} 
                        data={ents}
                        localization={{...MRT_Localization_PT, noRecordsToDisplay: "Sem ocurrências de entidades"}}/>
                </div>
            </div>
        </div>
        <BootstrapModal id="modal-types"><></></BootstrapModal>
    </>
}

const selectedIndexes = (table: MRT_TableInstance<Entity>) => Object.keys(table.getState().rowSelection).map(k => parseInt(k)).filter(k => !isNaN(k));
const removeTableSelection = (table: MRT_TableInstance<Entity>) => table.setRowSelection({})
const joinSelectedEntities = (table: MRT_TableInstance<Entity>, pool: EntityPool) => {
    pool.joinEntities(selectedIndexes(table))
    removeTableSelection(table);
}
const splitSelectedEntities = (table: MRT_TableInstance<Entity>, pool: EntityPool) => {
    pool.splitEntities(selectedIndexes(table))
    removeTableSelection(table)
}

const removeSelectedEntities = (table: MRT_TableInstance<Entity>, pool: EntityPool) => {
    pool.removeEntities(selectedIndexes(table));
    removeTableSelection(table)
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
    return new Blob([JSON.stringify(file)]);
}

function makeDocxDowload(html: string){
    let formData = new FormData();
    let htmlBlob = new Blob([html]);
    let htmlFile = new File([htmlBlob], "tmp.html")

    formData.append("file", htmlFile);

    return fetch("./docx", {method:"POST", body: formData}).then( r => r.status == 200 ? r.blob() : null)
}

const entityDetails = (pool: EntityPool) => ({row}:{row: MRT_Row<Entity>}) => row.original.offsets.map((off,i) => <div key={i} className="d-flex align-items-center border-bottom">
    <span role="button" className="text-end flex-grow-1" onClick={() => document.querySelector(`[data-offset="${off.start}"]`)?.scrollIntoView({block: "center"})}>{off.preview}</span>
    <span className="flex-grow-1"></span>
    <button className="btn btn-warning m-1 p-1" disabled={row.original.offsets.length <= 1} onClick={() => pool.splitOffset(off.start, off.end)}><i className="bi bi-exclude"></i> Separar</button>
    <button role="button" className="btn btn-danger m-1 p-1" onClick={() => pool.removeOffset(off.start, off.end)}><i className="bi bi-trash"></i> Remover</button>
</div>)

const HEADER: MRT_ColumnDef<Entity> = {
    header: "#",
    accessorKey: "offsetsLength",
    enableColumnFilter: false,
    enableColumnDragging: false,
    enableColumnActions: false,
    enableEditing: false,
    size: 40
}

const ENTITY: MRT_ColumnDef<Entity> = {
    header: "Entidade", 
    accessorFn: (ent) => ent.offsets[0].preview,
    enableEditing: false,
    size: 60,
    muiTableBodyCellProps: ({row}) => ({
        onClick: async () => {
            if( row.original.offsets.length === 0 ) return;
            let off = row.original.offsets[0];

            let elm = document.querySelector(`[data-offset="${off.start}"]`);
            if( elm ){
                elm.scrollIntoView({ block: "center" });
            }
        }
    })
}

const TYPE: (pool: EntityPool) => MRT_ColumnDef<Entity> = (pool) => ({
    header: "Tipo",
    accessorKey: "type",
    size: 40,
    Cell: ({row, cell, table}) => {
        let t = getEntityType(row.original.type);
        return <span className='badge text-body' onClick={() => table.setEditingCell(cell)} style={{background: t.color}}>{t.name}</span>
    },
    muiTableBodyCellEditTextFieldProps: ({row}) => ({
        select: true,
        children: getEntityTypes().map( t => <option key={t.name} label={t.name} value={t.name}>{t.name}</option>),
        SelectProps: {
            native: true
        },
        onChange: (event) => {
            let o = row.original.type;
            row.original.type = event.target.value;
            if( o !== row.original.type ) pool.updateOrder("Modificar tipo");
        }
    })
})


const ANONIMIZE: (pool: EntityPool) => MRT_ColumnDef<Entity> = (pool) => ({
    header: "Anonimização",
    accessorKey: "overwriteAnonimization",
    enableColumnFilter: false,
    enableColumnDragging: false,
    enableColumnActions: false,
    size: 40,
    Cell: ({row}) => row.original.overwriteAnonimization ? row.original.overwriteAnonimization : <span className="text-muted">{row.original.anonimizingFunction()(row.original.offsets[0].preview, row.original.type, row.original.index, row.original.typeIndex, row.original.funcIndex)}</span>,
    muiTableBodyCellProps: ({cell, table}) => ({
        onClick: () => table.setEditingCell(cell)
    }),
    muiTableBodyCellEditTextFieldProps: ({row}) => ({
        placeholder: row.original.anonimizingFunction()(row.original.offsets[0].preview, row.original.type, row.original.index, row.original.typeIndex, row.original.funcIndex),
        onBlur: (event) => {
            let o = row.original.overwriteAnonimization;
            row.original.overwriteAnonimization = event.target.value;
            if( o !== row.original.overwriteAnonimization ) pool.updateOrder("Modificar anonimização de entidade");
        }
    })
})
