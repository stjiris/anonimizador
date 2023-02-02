import React from "react";
import { UserFile } from "../types/UserFile";
import MaterialReactTable from "material-react-table";
import AnonimizeContent from "./AnonimizeContent";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { AnonimizableEnt, EntType } from "../types/EntType";
import RemoteNlpStatus from "./RemoteNlpStatus";
import { updateUserFile } from '../util/UserFileCRUDL';
import { AnonimizeStateState } from "../types/AnonimizeState";

interface AnonimizeProps{
    file: UserFile
    setUserFile: (file: UserFile | undefined) => void,
    types: EntType[]
}

interface AnonimizeState{
    ents: AnonimizableEnt[]
    anonimizeState: AnonimizeStateState
}

export default class Anonimize extends React.Component<AnonimizeProps,AnonimizeState>{
    contentRef: React.RefObject<AnonimizeContent> = React.createRef();
    doc: HTMLElement = new DOMParser().parseFromString(this.props.file.html_contents, "text/html").body;
    state: AnonimizeState = {
        ents: this.props.file.ents || [],
        anonimizeState: AnonimizeStateState.TAGGED
    }

    addEntity = (ent: AnonimizableEnt | undefined) => {
        if( !ent ) return;
        let ents: AnonimizableEnt[] = this.state.ents.concat(ent);
        ents.forEach( (ent, i) => ent.cod = `${i}${i}${i}` )

        this.setState({
            ents: ents
        })
    }

    componentDidUpdate(prevProps: Readonly<AnonimizeProps>, prevState: Readonly<AnonimizeState>, snapshot?: any): void {
        if(this.state.ents !== prevState.ents){
            this.props.file.ents = this.state.ents;
            updateUserFile(this.props.file);
        }
    }

    downloadHtml = () => {
        let html = this.contentRef.current?.contentRef.current?.innerHTML;
        if( !html ) return;

        let formData = new FormData();
        let htmlBlob = new Blob([html]);
        let htmlFile = new File([htmlBlob], "tmp.html")
        formData.append("file", htmlFile);
        
        fetch("./docx", {method:"POST", body: formData}).then( r => {
            r.blob().then(blob => {
                let file = URL.createObjectURL(blob);
                window.open(file, "_blank");
            })
        })
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
                        <RemoteNlpStatus onEntity={this.addEntity} doc={this.doc} />
                    </div>
                </div>
                <div className="bg-white p-4 m-2">
                    <style>
                        {/* Generate type colors */}
                        {this.props.types.map( o => `[data-anonimize-type="${o.name}"]{background:${o.color}}`)}
                    </style>
                    <AnonimizeContent ref={this.contentRef} doc={this.doc} ents={this.state.ents} onEntity={this.addEntity} types={this.props.types} anonimizeState={this.state.anonimizeState}/>
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
        </div>);
    }
}
