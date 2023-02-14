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
import { RowSelectionState } from "@tanstack/table-core/build/lib/features/RowSelection";

interface AnonimizeProps{
    file: UserFile
    setUserFile: (file: UserFile | undefined) => void,
}

interface AnonimizeState{
    anonimizeState: AnonimizeStateState
    ents: Entity[],
    selected: RowSelectionState
}

export default class Anonimize extends React.Component<AnonimizeProps,AnonimizeState>{
    contentRef: React.RefObject<AnonimizeContent> = React.createRef();
    tableRef: React.RefObject<MRT_TableInstance<Entity>> = React.createRef();
    doc: HTMLElement = new DOMParser().parseFromString(this.props.file.html_contents, "text/html").body;
    pool: EntityPool = new EntityPool(this.props.file.ents);
    state: AnonimizeState = {
        anonimizeState: AnonimizeStateState.TAGGED,
        ents: [...this.pool.entities],
        selected: {}
    }

    downloadHtml = () => {
        let html = this.contentRef.current?.contentRef.current?.innerHTML;
        if( !html ) return;

        let formData = new FormData();
        let htmlBlob = new Blob([html]);
        let htmlFile = new File([htmlBlob], "tmp.html")
        formData.append("file", htmlFile);
        
        fetch("./docx", {method:"POST", body: formData}).then( r => {
            if( r.status == 200 ){
                r.blob().then(blob => {
                    let file = URL.createObjectURL(blob);
                    window.open(file, "_blank");
                })
            }
            else{
                alert( `Servidor mandou código: ${r.status} (${r.statusText})` )
            }
        })
    }

    onPoolChange = (): void => {
        this.props.file.ents = this.pool.entities;
        updateUserFile(this.props.file);
        this.setState({ ents: [...this.pool.entities] })
    }

    componentDidMount(): void {
        this.pool.onChange( this.onPoolChange )
    }

    componentWillUnmount(): void {
        this.pool.offChange( this.onPoolChange )
    }

    render(): React.ReactNode {
        let columns: MRT_ColumnDef<Entity>[] = [{header: "#", accessorKey: "offsetsLength"},{header: "Entidade", accessorKey: "previewText"}, {header: "Tipo", accessorKey: "type"}, {header: "Anonimização", accessorKey: "anonimizeFunctionName"}]
        return (<div className="row container-fluid bg-dark m-0">
            <div className="col-8">
                <div className="bg-white p-4 m-2 d-flex">
                    <div className="mx-2">
                        <span className="text-danger" role="button" onClick={() => this.props.setUserFile(undefined)}><i className="bi bi-x"></i> Fechar</span>
                    </div>
                    <div className="mx-2">
                        <code className="text-body">{this.props.file.name}</code>
                    </div>
                    <div>
                        <a className="red-link fw-bold" role="button" onClick={this.downloadHtml}>Download</a>
                    </div>
                    <div>
                        <select onChange={(ev) => this.setState({anonimizeState: ev.target.value as AnonimizeStateState}) }>
                            <option value={AnonimizeStateState.ORIGINAL}>{AnonimizeStateState.ORIGINAL}</option>
                            <option selected value={AnonimizeStateState.TAGGED}>{AnonimizeStateState.TAGGED}</option>
                            <option value={AnonimizeStateState.ANONIMIZED}>{AnonimizeStateState.ANONIMIZED}</option>
                        </select>
                    </div>
                    <div>
                        <RemoteNlpStatus pool={this.pool} doc={this.doc} />
                    </div>
                </div>
                <div className="bg-white p-4 m-2">
                    <AnonimizeContent ref={this.contentRef} doc={this.doc} pool={this.pool} ents={this.state.ents} anonimizeState={this.state.anonimizeState}/>
                </div>
            </div>
            <div className="col-4">
                <div className="m-2 position-sticky top-0">
                    <MaterialReactTable
                        tableInstanceRef={this.tableRef}
                        key="ent-table"
                        enableRowSelection
                        enableColumnOrdering
                        enableDensityToggle={false}
                        enableHiding={false}
                        enableStickyHeader
                        enablePagination={false}
                        renderTopToolbarCustomActions={(_) => [
                            <div className="d-flex w-100">
                                <button className="btn btn-primary" disabled={Object.keys(this.state.selected).length > 1}><i className="bi bi-union"></i>Juntar</button>
                                <button className="btn btn-warning mx-2" disabled={Object.keys(this.state.selected).length > 0}><i className="bi bi-exclude"></i>Separar</button>
                                <button className="btn btn-danger" disabled={Object.keys(this.state.selected).length > 0}><i className="bi bi-trash"></i>Remover</button>
                            </div>
                        ]}
                        onRowSelectionChange={(updaterOrValue) => {
                            if( typeof updaterOrValue == "function" ){
                                this.setState({selected: updaterOrValue(this.state.selected)})
                            }
                        }}
                        state={{rowSelection: this.state.selected}}
                        columns={columns} 
                        data={this.state.ents}
                        localization={MRT_Localization_PT}/>
                </div>
            </div>
        </div>);
    }
}
