import React from "react";
import { UserFile } from "../types/UserFile";
import MaterialReactTable from "material-react-table";
import AnonimizeContent from "./AnonimizeContent";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { AnonimizableEnt, EntType, EntTypeColors } from "../types/EntType";
import RemoteNlpStatus from "./RemoteNlpStatus";

interface AnonimizeProps{
    file: UserFile
    setUserFile: (file: UserFile | undefined) => void
}

interface AnonimizeState{
    ents: AnonimizableEnt[]
    types: EntType[]
}

export default class Anonimize extends React.Component<AnonimizeProps,AnonimizeState>{
    doc: HTMLElement = new DOMParser().parseFromString(this.props.file.html_contents, "text/html").body;
    state: AnonimizeState = {
        ents: [],
        types: []
    }

    addEntity = (ent: AnonimizableEnt | undefined) => {
        if( !ent ) return;

        this.setState({
            ents: this.state.ents.concat(ent)
        })
    }

    componentDidMount(): void {
        fetch("./types")
            .then(r => r.json())
            .then((types: string[]) => this.setState({types: types.map(s => ({name: s, color: s in EntTypeColors ? EntTypeColors[s] : EntTypeColors.default}))}));
    }

    render(): React.ReactNode {
        return (<div className="row container-fluid bg-dark m-0">
            <div className="col-8">
                <div className="bg-white p-4 m-2 d-flex">
                    <div className="mx-2">
                        <span className="text-danger" role="button" onClick={() => this.props.setUserFile(undefined)}><i className="bi bi-x"></i> Fechar</span>
                    </div>
                    <div className="mx-2">
                        <code className="text-body">{this.props.file.name}</code>
                    </div>
                    <div className="mx-2">
                        <a className="red-link fw-bold" role="button" data-bs-toggle="modal" data-bs-target="#modal-types">Ver/Editar Tipos</a>
                    </div>
                    <div>
                        <RemoteNlpStatus onEntity={this.addEntity} doc={this.doc} />
                    </div>
                </div>
                <div className="bg-white p-4 m-2">
                    <AnonimizeContent doc={this.doc} ents={this.state.ents} onEntity={this.addEntity} types={this.state.types}/>
                </div>
            </div>
            <div className="col-4">
                <div className="m-2">
                    <MaterialReactTable
                        key="ent-table"
                        enableRowSelection
                        enableColumnOrdering
                        enableDensityToggle={false}
                        enableHiding={false}
                        enableStickyHeader
                        enablePagination={false}
                        renderTopToolbarCustomActions={(_) => (<>Hello!</>)}
                        columns={[{header: "Texto", accessorKey: "text"},{header: "Start Offset", accessorFn: (o) => o.offsets[0].start}, {header: "End Offset", accessorFn: (o) => o.offsets[0].end}]} 
                        data={this.state.ents}
                        localization={MRT_Localization_PT}/>
                </div>
            </div>
            <div className="modal fade" id="modal-types" tabIndex={-1} role="dialog" aria-labelledby="modal-types" aria-hidden="true">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div>
                                <h5 className="modal-title" id="modal-label">Tipos de entidades:</h5>
                            </div>
                        </div>
                        <div className="modal-body p-0">
                            <MaterialReactTable
                                    key="type-table"
                                    enableRowSelection
                                    enableColumnOrdering
                                    enableDensityToggle={false}
                                    enableHiding={false}
                                    enableStickyHeader
                                    enablePagination={false}
                                    renderTopToolbarCustomActions={(_) => (<del>Adicionar</del>)}
                                    columns={[{header: "Tipo", accessorFn: (data) => <span style={{background: data.color}}>{data.name}</span>}]} 
                                    data={this.state.types}
                                    localization={MRT_Localization_PT}/>
                        </div>
                        <div className="modal-footer">
                            <div className="flex-grow-1">
                            </div>
                            <button className="btn btn-secondary" type="button" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>);
    }
}

function createAnonimizableEntFromSelectedElements(type: EntType): AnonimizableEnt | undefined {
     
    let entElems: HTMLElement[] = Array.from(document.querySelectorAll(".selected"));
    if( entElems.length <= 0 ) return;

    let startElement = entElems.at(0);
    let endElement = entElems.at(-1);
    if(startElement === undefined || typeof startElement.dataset.offset !== 'string') return;
    if(endElement === undefined || typeof endElement.dataset.offset !== 'string') return;

    let startOffset = parseInt(startElement.dataset.offset);
    let endOffset = parseInt(endElement.dataset.offset) + (endElement.textContent?.length || 0);

    return {
        text: entElems.map(o => o.textContent).join(""),
        cod: 'AAA',
        type: type,
        offsets: [
            {
                start: startOffset,
                end: endOffset
            }
        ]
    }
}
