import React from "react";
import { UserFile } from "../types/UserFile";
import MaterialReactTable, { MRT_ColumnDef, MRT_Row, MRT_TableInstance } from "material-react-table";
import AnonimizeContent from "./AnonimizeContent";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { Entity } from "../types/Entity";
import RemoteNlpStatus from "./RemoteNlpStatus";
import { updateUserFile } from '../util/UserFileCRUDL';
import { AnonimizeStateState } from "../types/AnonimizeState";
import { EntityPool } from "../types/EntityPool";
import { getEntityType, getEntityTypes } from "../types/EntityTypes";
import { FiltersI } from "../types/EntityFilters";
import { Bicon } from "../util/BootstrapIcons";

interface AnonimizeProps{
    file: UserFile
    setUserFile: (file: UserFile | undefined) => void,
    filters: FiltersI[]
    saveSateCallback: Function
    undoRedoCallback: Function
    stateIndex: any
    maxStateIndex: any
    listSize: number[]
}

interface AnonimizeState{
    anonimizeState: AnonimizeStateState
    ents: Entity[],
    saved: boolean,
    showTypes: boolean
}

let pool: EntityPool = (window as any).pool = new EntityPool("",[]);

export default class Anonimize extends React.Component<AnonimizeProps,AnonimizeState>{
    contentRef: React.RefObject<AnonimizeContent> = React.createRef();
    tableRef: React.RefObject<MRT_TableInstance<Entity>> = React.createRef();
    doc: HTMLElement = new DOMParser().parseFromString(this.props.file.html_contents, "text/html").body;
    
    constructor(props: AnonimizeProps){
        super(props);
        pool.originalText = this.doc.textContent?.normalize("NFKC") || ""
        pool.entities = this.props.file.ents;
        pool.updateOrder();
        this.state ={
            anonimizeState: AnonimizeStateState.TAGGED,
            ents: [...pool.entities],
            saved: updateUserFile(props.file),
            showTypes: true
        };
        if( !this.state.saved ){
            alert("Atenção! O trabalho não será guardado automáticamente.")
        }
        this.props.saveSateCallback([...pool.entities], true)
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

    onPoolChange = (): void => {
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
        return (<div className="row container-fluid bg-dark m-0">
            <div className="col-8">
                <div className="position-sticky top-0 bg-white py-3 px-4 mt-2 d-flex" style={{borderBottom: "5px solid #161616",zIndex:1}}>
                    <div className="mx-2">
                        <button className="btn red-link fw-bold" onClick={() => (this.state.saved || window.confirm("Trabalho não será guardado no browser. Sair?")) ? this.props.setUserFile(undefined) : null}><i className="bi bi-x"></i> Fechar</button>
                    </div>
                    <div className="mx-2 d-flex align-items-baseline">
                        <span className="text-body btn"><i className="bi bi-file-earmark-fill"></i> {this.props.file.name}</span>
                        {this.state.saved ? <span className="alert alert-success m-0 p-1"><i className="bi bi-check"></i> Guardado</span> : <span className="alert alert-danger m-0 p-1"><i className="bi bi-exclamation-triangle-fill"></i> Não guardado</span>}
                    </div>
                    <div className="flex-grow-1"></div>
                    <div>
                        <button className="red-link fw-bold btn" onClick={this.downloadHtml}><i className="bi bi-download"></i> Download</button>
                    </div>
                    <div>
                        <button className="red-link fw-bold btn" onClick={() => this.setState({showTypes: !this.state.showTypes})} disabled={this.state.anonimizeState !== AnonimizeStateState.TAGGED}><Bicon n="eye"/> {this.state.showTypes ? "Substituições" : "Tipos"}</button>
                    </div>
                    <div>
                        <select className="red-link fw-bold btn text-end" onChange={(ev) => this.setState({anonimizeState: ev.target.value as AnonimizeStateState}) } defaultValue={AnonimizeStateState.TAGGED}>
                            <option value={AnonimizeStateState.ORIGINAL}>{AnonimizeStateState.ORIGINAL}</option>
                            <option value={AnonimizeStateState.TAGGED}>{AnonimizeStateState.TAGGED}</option>
                            <option value={AnonimizeStateState.ANONIMIZED}>{AnonimizeStateState.ANONIMIZED}</option>
                        </select>
                    </div>
                    <div>
                        {pool.entities.length <= 0 ? 
                            <RemoteNlpStatus pool={pool} doc={this.doc} filters={this.props.filters} disabled={this.state.anonimizeState !== AnonimizeStateState.TAGGED}/> :
                            <button className="red-link fw-bold btn" onClick={() => window.alert( `Filtradas ${pool.applyFilters(this.props.filters)} entidade(s)` )}><Bicon n="funnel"/> Filtrar</button>
                        }
                    </div>
                    <div>
                        <button id="undoButton" className="red-link fw-bold btn" onClick={this.onUndo} disabled={this.props.stateIndex.current==0 ? true : false}><i className="bi bi-arrow-counterclockwise"></i></button>
                        <button id="redoButton" className="red-link fw-bold btn" onClick={this.onRedo} disabled={this.props.stateIndex.current==this.props.maxStateIndex.current ? true : false}><i className="bi bi-arrow-clockwise"></i></button>
                    </div>
                </div>
                <div className="bg-white p-4">
                    <AnonimizeContent ref={this.contentRef} showTypes={this.state.showTypes} doc={this.doc} pool={pool} ents={this.state.ents} anonimizeState={this.state.anonimizeState} listSize={this.props.listSize}/>
                </div>
            </div>
            <div className="col-4">
                <div className="mt-2 position-sticky top-0">
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
                        localization={MRT_Localization_PT}/>
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
        onClick: () => {
            if( row.original.offsets.length === 0 ) return;
            let off = row.original.offsets[0];
            let elm = document.querySelector(`[data-offset="${off.start}"]`);
            if( elm ){
                elm.scrollIntoView({ block: "center" });
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
            if( o !== row.original.type ) pool.updateOrder();
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
            if( o !== row.original.overwriteAnonimization ) pool.updateOrder();
        }
    })
}]
