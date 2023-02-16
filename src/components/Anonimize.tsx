import React from "react";
import { UserFile } from "../types/UserFile";
import MaterialReactTable, { MRT_ColumnDef, MRT_TableInstance } from "material-react-table";
import AnonimizeContent from "./AnonimizeContent";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { Entity } from "../types/Entity";
import RemoteNlpStatus from "./RemoteNlpStatus";
import { updateUserFile } from '../util/UserFileCRUDL';
import { AnonimizeStateState } from "../types/AnonimizeState";
import { EntityPool } from "../types/EntityPool";
import { getEntityType, getEntityTypes, TypeNames } from "../types/EntityTypes";

interface AnonimizeProps{
    file: UserFile
    setUserFile: (file: UserFile | undefined) => void,
}

interface AnonimizeState{
    anonimizeState: AnonimizeStateState
    ents: Entity[]
}

let pool: EntityPool = new EntityPool("",[]);

export default class Anonimize extends React.Component<AnonimizeProps,AnonimizeState>{
    contentRef: React.RefObject<AnonimizeContent> = React.createRef();
    tableRef: React.RefObject<MRT_TableInstance<Entity>> = React.createRef();
    doc: HTMLElement = new DOMParser().parseFromString(this.props.file.html_contents, "text/html").body;
    
    constructor(props: AnonimizeProps){
        super(props);
        pool.originalText = this.doc.textContent || ""
        pool.entities = this.props.file.ents;
        this.state ={
            anonimizeState: AnonimizeStateState.TAGGED,
            ents: [...pool.entities]
        };
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
                    stubA.download = `${this.state.anonimizeState}_${this.props.file.name}`
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
        updateUserFile(this.props.file);
        this.setState({ ents: [...pool.entities] })
    }

    componentDidMount(): void {
        pool.onChange( this.onPoolChange )
    }

    componentWillUnmount(): void {
        pool.offChange( this.onPoolChange )
    }

    render(): React.ReactNode {
        return (<div className="row container-fluid bg-dark m-0">
            <div className="col-8">
                <div className="bg-white py-3 px-4 m-2 d-flex">
                    <div className="mx-2">
                        <button className="btn red-link fw-bold" onClick={() => this.props.setUserFile(undefined)}><i className="bi bi-x"></i> Fechar</button>
                    </div>
                    <div className="mx-2">
                        <span className="text-body btn"><i className="bi bi-file-earmark-fill"></i> {this.props.file.name}</span>
                    </div>
                    <div className="flex-grow-1"></div>
                    <div>
                        <button className="red-link fw-bold btn" onClick={this.downloadHtml} disabled={this.state.anonimizeState === AnonimizeStateState.TAGGED}><i className="bi bi-download"></i> Download</button>
                    </div>
                    <div>
                        <select className="red-link fw-bold btn" onChange={(ev) => this.setState({anonimizeState: ev.target.value as AnonimizeStateState}) } defaultValue={AnonimizeStateState.TAGGED}>
                            <option value={AnonimizeStateState.ORIGINAL}>{AnonimizeStateState.ORIGINAL}</option>
                            <option value={AnonimizeStateState.TAGGED}>{AnonimizeStateState.TAGGED}</option>
                            <option value={AnonimizeStateState.TAGGED_ANONIMIZED}>{AnonimizeStateState.TAGGED_ANONIMIZED}</option>
                            <option value={AnonimizeStateState.ANONIMIZED}>{AnonimizeStateState.ANONIMIZED}</option>
                        </select>
                    </div>
                    <div>
                        <RemoteNlpStatus pool={pool} disabled={this.state.anonimizeState !== AnonimizeStateState.TAGGED}/>
                    </div>
                </div>
                <div className="bg-white p-4 m-2">
                    <AnonimizeContent ref={this.contentRef} doc={this.doc} pool={pool} ents={this.state.ents} anonimizeState={this.state.anonimizeState}/>
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
                        enableHiding={false}
                        enableStickyHeader
                        enablePagination={false}
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
                        initialState={{density: 'compact'}}
                        columns={columns} 
                        data={this.state.ents}
                        localization={MRT_Localization_PT}/>
                </div>
            </div>
        </div>);
    }
}

let columns: MRT_ColumnDef<Entity>[] = [{
    header: "#",
    accessorKey: "offsetsLength",
    enableColumnFilter: false,
    enableColumnDragging: false,
    enableColumnActions: false,
    enableEditing: false,
    size: 40
},
{
    header: "Entidade", 
    accessorKey: "previewText",
    enableEditing: false,
    size: 40,
    muiTableBodyCellProps: ({row}) => ({
        onClick: () => {
            if( row.original.offsets.length === 0 ) return;
            let off = row.original.offsets[0];
            let elm = document.querySelector(`[data-offset="${off.start}"]`);
            if( elm ){
                elm.scrollIntoView();
            }
        }
    })
},
{
    header: "Tipo",
    accessorKey: "type",
    size: 40,
    Cell: ({row}) => {
        let t = getEntityType(row.original.type);
        return <span className='badge text-body' style={{background: t.color}}>{t.name}</span>
    },
    muiTableBodyCellEditTextFieldProps: ({row}) => ({
        select: true,
        children: getEntityTypes().map( t => <option key={t.name} label={t.name} value={t.name}>{t.name}</option>),
        SelectProps: {
            native: true
        },
        onChange: (event) => {
            let o = row.original.type;
            row.original.type = event.target.value as TypeNames;
            if( o !== row.original.type ) pool.updateOrder();
        }
    })
    
},
{
    header: "Substituição",
    accessorKey: "overwriteAnonimization",
    enableColumnFilter: false,
    enableColumnDragging: false,
    enableColumnActions: false,
    size: 40,
    muiTableBodyCellEditTextFieldProps: ({row}) => ({
        placeholder: row.original.anonimizingFunction()(row.original.previewText, row.original.type, row.original.index, row.original.typeIndex),
        onBlur: (event) => {
            let o = row.original.overwriteAnonimization;
            row.original.overwriteAnonimization = event.target.value;
            if( o !== row.original.overwriteAnonimization ) pool.updateOrder();
        }
    })
}]
