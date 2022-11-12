import React from "react";
import { createUserFile, deleteUserFile, readUserFile, listUserFile } from "../util/UserFileCRUDL";
import { UserFile } from "../types/UserFile";

type SelectFileProps = {
    setUserFile: (file: UserFile) => void
}

export default class SelectFile extends React.Component<SelectFileProps,{list: UserFile[]}>{
    updateList: () => void

    constructor(props: SelectFileProps){
        super(props);
        this.state = {
            list: listUserFile()
        }
        this.updateList = () => {
            console.log(this);
            console.log("Update List");
            console.log(this.state);
            this.setState({list: listUserFile()})
        }
    }

    componentDidMount(): void {
        window.addEventListener("AlertUpdateListUserFile", this.updateList);
    }

    componentWillUnmount(): void {
        window.removeEventListener("AlertUpdateListUserFile", this.updateList);
    }
    
    onFile(event: React.ChangeEvent<HTMLInputElement>): void{
        let files = event.target.files;
        if( files == null) return;

        
        let file = files[0];
        let formData = new FormData();
        formData.append("file", file);
        
        let userFile = readUserFile(file.name);
        if( userFile != null ){
            let usrConfirm = window.confirm("Existe um ficheiro guardado localmente com o mesmo nome. Confirma que quer apagar ficheiro antigo?");
            if( !usrConfirm ){
                event.target.value = "";
                return;
            }
            deleteUserFile(userFile);
        }
        
        event.target.disabled = true;
        fetch("./html", {method:"POST", body: formData}).then(async r => {
            let content = await r.text();

            if( r.status !== 200 ) return Promise.reject(new Error(content));
            
            userFile = {
                html_contents: content,
                name: file.name
            };
            
            event.target.value = "";
            createUserFile(userFile);
            this.props.setUserFile(userFile);

        }).catch(e => {
            console.error(e);
            window.alert("Falha ao interpertar ficheiro submetido.");
        }).finally(() => {
            event.target.disabled = false;
        })
    }

    render(): React.ReactNode {
        return (<div className="container">
            <table className="table table-sm">
                <thead>
                    <tr>
                        <th>Ficheiros Locais</th><th>Número de caracteres</th><th>Acções</th>
                    </tr>
                </thead>
                <tbody>
                    {this.state.list.map(f => <SavedFileRow file={f} setUserFile={this.props.setUserFile} />)}
                    <tr>
                        <td><label role="button" htmlFor="file">Adicionar ficheiro</label></td>
                        <td></td>
                        <td><input id="file" type="file" name="file" onInput={this.onFile.bind(this)}></input> </td>
                    </tr>
                </tbody>
            </table>
        </div>)
    }
}

type SavedFileRowProps = {
    file: UserFile,
    setUserFile: (file: UserFile) => void
}

export class SavedFileRow extends React.Component<SavedFileRowProps>{
    render(): React.ReactNode {
        return (<tr>
            <td>{this.props.file.name}</td>
            <td>{this.props.file.html_contents.length}</td>
            <td>
                <div className="d-flex">
                    <i className="bi bi-play-fill" role="button" onClick={() => this.props.setUserFile(this.props.file)}></i>
                    <i className="bi bi-x" role="button" onClick={() => deleteUserFile(this.props.file)}></i>
                </div>
            </td>
        </tr>);
    }
}
