import React from "react";
import { UserFile } from "../types/UserFile";
import MaterialReactTable, { MRT_ColumnDef, MRT_Row, MRT_TableInstance } from "material-react-table";
import AnonimizeContent from "./AnonimizeContent";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { Entity } from "../types/Entity";
import { runRemoteNlp } from "../util/runRemoteNlp";
import { updateUserFile } from '../util/UserFileCRUDL';
import { AnonimizeStateState, AnonimizeVisualState } from "../types/AnonimizeState";
import { EntityPool } from "../types/EntityPool";
import { getEntityType, getEntityTypes } from "../types/EntityTypes";
import { Bicon, Button } from "../util/BootstrapIcons";
import { VariableSizeList } from 'react-window';

interface AnonimizeProps{
    file: UserFile
    setUserFile: (file: UserFile | undefined) => void
    saveSateCallback: Function
    undoRedoCallback: Function
    stateIndex: any
    maxStateIndex: any
    listSize: number[]
    offsetIndex: {[key: number]: number}
}

interface AnonimizeState{
    anonimizeState: AnonimizeStateState
    showTypes: boolean
    ents: Entity[]
    saved: boolean
    requesting: boolean
}

let pool: EntityPool = (window as any).pool = new EntityPool("",[]);
let listRef: React.RefObject<VariableSizeList> = React.createRef();
let offsetGlobal: {[key: number]: number} = {}

export default class Anonimize extends React.Component<AnonimizeProps,AnonimizeState>{
    contentRef: React.RefObject<AnonimizeContent> = React.createRef();
    tableRef: React.RefObject<MRT_TableInstance<Entity>> = React.createRef();
    doc: HTMLElement = new DOMParser().parseFromString(this.props.file.html_contents, "text/html").body;
    
    constructor(props: AnonimizeProps){
        super(props);
        pool.originalText = this.doc.textContent?.normalize("NFKC") || ""
        pool.entities = this.props.file.ents;
        pool.updateOrder("Inicial");
        this.state ={
            anonimizeState: AnonimizeStateState.TAGGED,
            ents: [...pool.entities],
            saved: updateUserFile(props.file),
            showTypes: true,
            requesting: false
        };
        if( !this.state.saved ){
            alert("Atenção! O trabalho não será guardado automáticamente.")
        }
        this.props.saveSateCallback([...pool.entities], true)
    }

    setStateFrom(visual: AnonimizeVisualState){
        let showTypes: boolean = false;
        let anonimizeState: AnonimizeStateState = AnonimizeStateState.TAGGED;
        switch(visual){
            case AnonimizeVisualState.ANONIMIZED:
                anonimizeState = AnonimizeStateState.ANONIMIZED;
                break;
            case AnonimizeVisualState.ORIGINAL:
                anonimizeState = AnonimizeStateState.ORIGINAL;
                break;
            case AnonimizeVisualState.TYPES:
                showTypes = true;
            case AnonimizeVisualState.REPLACE:
                anonimizeState = AnonimizeStateState.TAGGED;
        }
        this.setState({ showTypes, anonimizeState });
    }

    selectedIndexes(): number[]{
        if( !this.tableRef.current ) return [];
        let state = this.tableRef.current.getState();

        return Object.keys(state.rowSelection).map( k => parseInt(k) ).filter( k => !isNaN(k) )
    }

    removeTableSelection() {
        if( !this.tableRef.current ) return;
        let state = this.tableRef.current.getState();

        this.tableRef.current.setState({...state, rowSelection: {}});
    }


    joinSelectedEntities = () => {
        let indexes = this.selectedIndexes();
        pool.joinEntities(indexes);
        this.removeTableSelection();
    }

    splitSelectedEntities = () => {
        let indexes = this.selectedIndexes();
        pool.splitEntities(indexes);
        this.removeTableSelection();
    }

    removeSelectedEntities = () => {
        let indexes = this.selectedIndexes();
        pool.removeEntities(indexes);
        this.removeTableSelection();
    }

    downloadHtml = () => {
        if( this.state.anonimizeState == AnonimizeStateState.TAGGED ){
            let jsonBlob = new Blob([JSON.stringify(this.props.file)]);
            let stubA = document.createElement("a");
            stubA.href = URL.createObjectURL(jsonBlob);
            stubA.target = "_blank";
            stubA.download = `${this.state.anonimizeState}_${this.props.file.name}.json`
            stubA.click();

            return;
        }
        let html = this.contentRef.current?.contentRef.current?.innerHTML;
        if( !html ) return;

        let formData = new FormData();
        let htmlBlob = new Blob([html]);
        let htmlFile = new File([htmlBlob], "tmp.html")
        formData.append("file", htmlFile);
        
        fetch("./docx", {method:"POST", body: formData}).then( r => {
            if( r.status === 200 ){
                r.blob().then(blob => {
                    let file = URL.createObjectURL(blob);
                    let stubA = document.createElement("a");
                    stubA.href = file;
                    stubA.target = "_blank";
                    stubA.download = `${this.state.anonimizeState}_${this.props.file.name}.docx`
                    stubA.click();
                })
            }
            else{
                alert( `Servidor respondeu: ${r.status} (${r.statusText})` )
            }
        })
    }

    onPoolChange = (action: string): void => {
        this.props.file.ents = pool.entities;
        this.props.saveSateCallback([...pool.entities], false)
        this.setState({ ents: [...pool.entities], saved: updateUserFile(this.props.file) })
    }

    confirmExit = (evt: BeforeUnloadEvent) => {
        if( !this.state.saved ){
            evt.preventDefault();
            evt.returnValue = "Trabalho em progresso não guardado automaticamente. Confirma que pertende sair?"
        }
    }

    componentDidMount(): void {
        pool.onChange( this.onPoolChange )
        window.addEventListener("beforeunload", this.confirmExit)
    }

    componentWillUnmount(): void {
        pool.offChange( this.onPoolChange )
        window.removeEventListener("beforeunload", this.confirmExit)
    }

    onUndo = (): void => {
        let newEnts = this.props.undoRedoCallback(this.props.stateIndex.current-1)
        this.props.file.ents = newEnts
        pool.overwriteEntities(newEnts)
        this.setState({ents: newEnts, saved: updateUserFile(this.props.file)})
    }

    onRedo = (): void => {
        let newEnts = this.props.undoRedoCallback(this.props.stateIndex.current+1)
        this.props.file.ents = newEnts
        pool.overwriteEntities(newEnts)
        this.setState({ents: newEnts, saved: updateUserFile(this.props.file)})
    }

    render(): React.ReactNode {
        offsetGlobal = this.props.offsetIndex
        return (<div className="row container-fluid bg-dark m-0 p-0">
            <div className="col-8">
                <div className="position-sticky top-0 bg-white p-0 m-0 d-flex" style={{borderBottom: "5px solid #161616",zIndex:1}}>
                    <Button className="btn red-link fw-bold m-1 p-1" onClick={() => (this.state.saved || window.confirm("Trabalho não será guardado no browser. Sair?")) ? this.props.setUserFile(undefined) : null} i="arrow-left" title="Fechar ficheiro"/>
                    {this.state.saved ? 
                        <span title="Guardado automaticamente." className="text-body text-nowrap alert alert-success p-1 m-1"><Bicon n="file-earmark-check-fill"/> <small>{this.props.file.name}</small></span>
                    : 
                        <span title="Não guardado." className="text-body text-nowrap alert alert-danger p-1 m-1"><Bicon n="file-earmark-x-fill"/> <small>{this.props.file.name}</small></span>
                    }
                    <Button title="Gerir tipos" i="file-earmark-font" text="Tipos" className="red-link btn m-1 p-1" data-bs-toggle="modal" data-bs-target="#modal-types"/>
                    <button className="red-link btn m-1 p-1" onClick={() => {this.setState({requesting: true}); runRemoteNlp(this.doc, pool).finally(() => this.setState({requesting: false}))}} disabled={pool.entities.length > 0 || this.state.requesting || this.state.anonimizeState !== AnonimizeStateState.TAGGED}>
                        {pool.entities.length > 0 || this.state.requesting || this.state.anonimizeState !== AnonimizeStateState.TAGGED ? 
                            <del><Bicon n="file-earmark-play"/> Sugerir</del>
                        :
                            <><Bicon n="file-earmark-play"/> Sugerir</>
                        }
                    </button>
                    <small className="text-white text-nowrap p-1 m-1 flex-grow-1 text-center"><Bicon n="dot"/></small>
                    <select title="Escolher modo" className="red-link btn m-1 p-1 text-start" onChange={(ev) => this.setStateFrom(ev.target.value as AnonimizeVisualState) } defaultValue={AnonimizeVisualState.TYPES} style={{backgroundColor: "var(--secondary-gold)"}}>
                        <option value={AnonimizeVisualState.ORIGINAL}>{AnonimizeVisualState.ORIGINAL}</option>
                        <option value={AnonimizeVisualState.REPLACE}>{AnonimizeVisualState.REPLACE}</option>
                        <option value={AnonimizeVisualState.TYPES}>{AnonimizeVisualState.TYPES}</option>
                        <option value={AnonimizeVisualState.ANONIMIZED}>{AnonimizeVisualState.ANONIMIZED}</option>
                    </select>
                    <Button className="red-link btn m-1 p-1" onClick={this.downloadHtml} i="download" title="Download ficheiro"/>
                    <small className="text-white text-nowrap p-1 m-1 flex-grow-1 text-center"><Bicon n="dot"/></small>
                    <Button id="undoButton" className="red-link m-1 p-1 btn" onClick={this.onUndo} disabled={this.props.stateIndex.current==0} title="Desfazer" i="arrow-counterclockwise"/>
                    <Button id="undoButton" className="red-link m-1 p-1 btn" onClick={this.onRedo} disabled={this.props.stateIndex.current==this.props.maxStateIndex.current} title="Refazer" i="arrow-clockwise"/>
                    <small className="text-white text-nowrap p-1 m-1 text-center"><Bicon n="dot"/></small>
                    <a className="red-link m-1 p-1 btn" href="https://docs.google.com/document/d/e/2PACX-1vTaR6kTasw0iGYSSMbJpq2wMgrBN5K37jg5ab_qMih_VpXRO5ZAAeeeDiRYzvyrD_VDxBM2ccW-VuBQ/pub" target="_blank" title="Abrir ajuda"><Bicon n="question-circle"/></a>
                </div>
                <div className="bg-white p-4">
                    {this.state.requesting && this.state.anonimizeState === AnonimizeStateState.TAGGED ?
                        <div className="alert alert-info">A processar o documento, esta operação poderá demorar.</div>
                    :
                        <AnonimizeContent ref={this.contentRef} showTypes={this.state.showTypes} doc={this.doc} pool={pool} ents={this.state.ents} anonimizeState={this.state.anonimizeState} listSize={this.props.listSize} listRef={listRef} offsetIndex={this.props.offsetIndex} />
                    }
                </div>
            </div>
            <div className="col-4">
                <div className="m-0 position-sticky top-0">
                    <MaterialReactTable
                        tableInstanceRef={this.tableRef}
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
                        renderDetailPanel={entityDetails}
                        renderTopToolbarCustomActions={(_) => {
                            let selectedeKeys = this.selectedIndexes().length
                            return <div className="d-flex w-100">
                                <button className="btn btn-primary" disabled={selectedeKeys <= 1} onClick={this.joinSelectedEntities}><i className="bi bi-union"></i> Juntar</button>
                                <button className="btn btn-warning mx-2" disabled={selectedeKeys === 0} onClick={this.splitSelectedEntities}><i className="bi bi-exclude"></i> Separar</button>
                                <button className="btn btn-danger" disabled={selectedeKeys === 0} onClick={this.removeSelectedEntities}><i className="bi bi-trash"></i> Remover</button>
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
                        columns={columns} 
                        data={this.state.ents}
                        localization={{...MRT_Localization_PT, noRecordsToDisplay: "Sem ocurrências de entidades"}}/>
                </div>
            </div>
        </div>);
    }
}

let entityDetails: ((props: {
    row: MRT_Row<Entity>;
    table: MRT_TableInstance<Entity>;
}) => React.ReactNode) = ({row}) => row.original.offsets.map((off,i) => <div key={i} className="d-flex align-items-center border-bottom">
    <span role="button" className="text-end flex-grow-1" onClick={() => document.querySelector(`[data-offset="${off.start}"]`)?.scrollIntoView({block: "center"})}>{off.preview}</span>
    <span className="flex-grow-1"></span>
    <button className="btn btn-warning m-1 p-1" disabled={row.original.offsets.length <= 1} onClick={() => pool.splitOffset(off.start, off.end)}><i className="bi bi-exclude"></i> Separar</button>
    <button role="button" className="btn btn-danger m-1 p-1" onClick={() => pool.removeOffset(off.start, off.end)}><i className="bi bi-trash"></i> Remover</button>
</div>)

let columns: MRT_ColumnDef<Entity>[] = [{
    header: "#",
    accessorKey: "offsetsLength",
    enableColumnFilter: false,
    enableColumnDragging: false,
    enableColumnActions: false,
    enableEditing: false,
    size: 40,
},
{
    header: "Entidade", 
    accessorFn: (ent) => ent.offsets[0].preview,
    enableEditing: false,
    size: 60,
    muiTableBodyCellProps: ({row}) => ({
        onClick: async () => {
            if( row.original.offsets.length === 0 ) return;
            let off = row.original.offsets[0];

            let index = 0
            for (let o in offsetGlobal) {
                if (parseInt(o) == off.start) {
                    break;
                }
                if (parseInt(o) > off.start){
                    index--;
                    break;
                };
                index++;
            }
            let elm = document.querySelector(`[data-offset="${off.start}"]`);
            if( elm ){
                elm.scrollIntoView({ block: "center" });
            } else {
                listRef.current?.scrollToItem(index, "center")
                // Wait for new items to be rendered
                await new Promise(resolve => setTimeout(resolve, 100))
                document.querySelector(`[data-offset="${off.start}"]`)?.scrollIntoView({ block: "center" });
            }
        }
    })
},
{
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
    
},
{
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
}]
