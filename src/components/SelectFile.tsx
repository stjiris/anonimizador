import React from "react";
import { createUserFile, deleteUserFile, readUserFile, listUserFile } from "../util/UserFileCRUDL";
import { UserFile } from "../types/UserFile";
import MaterialReactTable, { MRT_ColumnDef } from "material-react-table";
import {MRT_Localization_PT} from "material-react-table/locales/pt";

type SelectFileProps = {
    setUserFile: (file: UserFile) => void
}

type SelectFileState = {
    list: UserFile[]
}

export default class SelectFile extends React.Component<SelectFileProps,SelectFileState>{
    state: SelectFileState = {
        list: listUserFile()
    }
    updateList = () => {this.setState({list: listUserFile()})}

    componentDidMount() {
        window.addEventListener("AlertUpdateListUserFile", this.updateList);
    }

    componentWillUnmount() {
        window.removeEventListener("AlertUpdateListUserFile", this.updateList);
    }

    render(): React.ReactNode {
        let cols: MRT_ColumnDef[] = [
            {header: "Ficheiros Locais", accessorKey: "name"},
            {header: "Número de Caracteres", accessorKey: "size"},
            {header: "Número de Entidade", accessorKey: "ents.length"},
        ]

        return (<MaterialReactTable 
            renderTopToolbarCustomActions={({table}) => <AddUserFileAction setUserFile={this.props.setUserFile}/>} 
            columns={cols}
            data={this.state.list}
            localization={MRT_Localization_PT}
            enableRowActions
            renderRowActions={({row}) => <UserFileActions file={this.state.list[row.index]} setUserFile={this.props.setUserFile} />}
            positionActionsColumn="last"
            enablePagination={false}
            enableDensityToggle={false}
            enableHiding={false}
        />);
    }
}

type UserFileActionsProps = {
    file: UserFile,
    setUserFile: (file: UserFile) => void
}

export class AddUserFileAction extends React.Component<SelectFileProps>{
    onFile: React.ChangeEventHandler<HTMLInputElement> = (event) => {
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

            let documentDom = new DOMParser().parseFromString(content, "text/html");
            
            userFile = {
                html_contents: documentDom.body.innerHTML,
                name: file.name,
                size: documentDom.body.innerHTML.length,
                ents: []
            };
            
            event.target.value = "";
            try{
                createUserFile(userFile);
            }
            catch(e){
                alert("Aviso! Ficheiro grande demais para ser guardado no browser. Poderá trabalhar nele à mesma.");
            }
            this.props.setUserFile(userFile);

        }).catch(e => {
            console.error(e);
            window.alert("Falha ao interpertar ficheiro submetido.");
        }).finally(() => {
            event.target.disabled = false;
        })
    }

    render(): React.ReactNode {
        return (<>
            <label htmlFor="file" role="button"><i className="bi bi-plus-circle"></i> Adicionar Ficheiro</label>
            <input hidden type="file" name="file" id="file" onInput={this.onFile}></input>
        </>);
    }
}

export class UserFileActions extends React.Component<UserFileActionsProps>{
    render(): React.ReactNode {
        return (<>
            <i className="bi bi-pencil-fill m-1 p-1 text-primary" role="button" onClick={() => this.props.setUserFile(this.props.file)}></i>
            <i className="bi bi-trash m-1 p-1 text-danger" role="button" onClick={() => deleteUserFile(this.props.file)}></i>
        </>);
    }
}
