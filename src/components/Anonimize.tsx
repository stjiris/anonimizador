import React from "react";
import { UserFile } from "../types/UserFile";

interface AnonimizeProps{
    file: UserFile,
    setUserFile: (file: UserFile | undefined) => void
}

export default class Anonimize extends React.Component<AnonimizeProps>{
    render(): React.ReactNode {
        return (<div className="row container-fluid">
            <div className="col-8">
                <div>
                    // FICHEIRO E Ações
                    <i className="bi bi-x" role="button" onClick={() => this.props.setUserFile(undefined)}></i>
                    Anonimizando {this.props.file.name}
                </div>
                <div dangerouslySetInnerHTML={{__html: this.props.file.html_contents}}></div>
            </div>
            <div className="col-4">
                // table
            </div>
        </div>);
    }
}
