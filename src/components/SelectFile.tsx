import React from "react";
import { createUserFile, deleteUserFile, readSavedUserFile, listUserFile, updateOldSavedUserFile } from "../util/UserFileCRUDL";
import { isOldSavedUserFile, isSavedUserFile, loadSavedUserFile, SavedUserFile, UserFile } from "../types/UserFile";
import MaterialReactTable, { MRT_ColumnDef } from "material-react-table";
import {MRT_Localization_PT} from "material-react-table/locales/pt";
import { getEntityTypes } from "../types/EntityTypes";
import { Bicon, Button } from "../util/BootstrapIcons";

type SelectFileProps = {
    setUserFile: (file: UserFile) => void
}

type SelectFileState = {
    list: SavedUserFile[]
}

// https://stackoverflow.com/a/18650828/2573422
function formatBytes(a: number,b=2){if(!+a)return"0 Bytes";const c=0>b?0:b,d=Math.floor(Math.log(a)/Math.log(1024));return`${parseFloat((a/Math.pow(1024,d)).toFixed(c))} ${["Bytes","KiB","MiB","GiB","TiB","PiB","EiB","ZiB","YiB"][d]}`}

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
        let intl = new Intl.DateTimeFormat(["pt","en"], {dateStyle: "short", timeStyle: "medium"});
        let cols: MRT_ColumnDef<SavedUserFile>[] = [
            {
                header: "Ficheiros Locais",
                Header: <><i className="bi bi-file-earmark-fill"></i> Ficheiros Locais</>,
                accessorKey: "name",
                size: 80,
                Cell: ({row}) => <span className="text-nowrap" role="button" title="Abrir ficheiro" onClick={() => this.props.setUserFile(loadSavedUserFile(row.original))}><Bicon n="file-earmark"/> {row.original.name}</span>
            },
            {
                header: "Tamanho",
                accessorFn: file => formatBytes(new Blob([JSON.stringify(file)]).size) // Overengeneering text.length
            },
            {
                header: "N.º de Entidades / Ocurrências",
                accessorFn: file =>  `${file.ents.reduce((acc, c) => acc+1, 0)} / ${file.ents.reduce((acc, c) => acc+c.offsets.length, 0)}`
            },
            {
                header: "Importado", accessorKey: "imported", accessorFn: (file) => intl.format(new Date(file.imported))
            },
            {
                header: "Modificado", accessorKey: "modified", accessorFn: (file) => intl.format(new Date(file.modified))
            }
        ]

        return (<MaterialReactTable
            renderTopToolbarCustomActions={({table}) => <AddUserFileAction setUserFile={this.props.setUserFile}/>} 
            columns={cols}
            data={this.state.list}
            localization={{...MRT_Localization_PT, noRecordsToDisplay: "Sem ficheiros"}}
            enableRowActions={true}
            renderRowActions={({row}) => <UserFileActions file={row.original} setUserFile={this.props.setUserFile} />}
            positionActionsColumn="first"
            enablePagination={false}
            enableDensityToggle={false}
            enableHiding={false}
            enableColumnResizing={false}
            enableRowSelection={false}
            enableColumnOrdering={false}
            enableStickyHeader={false}
            enableEditing={true}
            enableColumnFilters={false}
            enableSorting={false}
            enableGlobalFilter={false}
            enableFullScreenToggle={false}
            enableColumnActions={false}
        />);
    }
}

type UserFileActionsProps = {
    file: SavedUserFile,
    setUserFile: (file: UserFile) => void
}

export class AddUserFileAction extends React.Component<SelectFileProps>{

    onFile: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
        let files = event.target.files;
        if( files == null) return;

        
        let file = files[0];

        let formData = new FormData();
        formData.append("file", file);

        if( file.type == "application/json"){
            let loadedUserFile = await file.text().then( txt => {
                let obj = JSON.parse(txt);
                if( isSavedUserFile(obj) )
                    return obj
                else if ( isOldSavedUserFile(obj) ){
                    return updateOldSavedUserFile(obj);
                }
                else
                    return null
            }).catch(e => {
                console.log(e);
                return null;
            });
            if( loadedUserFile ){
                let savedUserFile = readSavedUserFile(loadedUserFile.name);
                if( savedUserFile != null ){
                    let usrConfirm = window.confirm("Existe um ficheiro guardado localmente com o mesmo nome. Confirma que quer apagar ficheiro antigo?");
                    if( !usrConfirm ){
                        event.target.value = "";
                        return;
                    }
                    deleteUserFile(savedUserFile);
                }
                try{
                    createUserFile(loadedUserFile);
                }
                catch(e){
                    alert("Aviso! Ficheiro grande demais para ser guardado no browser. Poderá trabalhar nele à mesma.");
                }
                this.props.setUserFile(loadSavedUserFile(loadedUserFile))
                return;
            }
        }
        
        let savedUserFile = readSavedUserFile(file.name);
        if( savedUserFile != null ){
            let usrConfirm = window.confirm("Existe um ficheiro guardado localmente com o mesmo nome. Confirma que quer apagar ficheiro antigo?");
            if( !usrConfirm ){
                event.target.value = "";
                return;
            }
            deleteUserFile(savedUserFile);
        }
        
        event.target.disabled = true;
        fetch("./html", {method:"POST", body: formData}).then(async r => {
            let content = await r.text();

            if( r.status !== 200 ) return Promise.reject(new Error(content));

            let documentDom = new DOMParser().parseFromString(content, "text/html");
            
            let userFile: UserFile = {
                html_contents: documentDom.body.innerHTML,
                name: file.name,
                size: documentDom.body.innerHTML.length,
                ents: [],
                imported: new Date(),
                modified: new Date()
            } as UserFile;
            
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
            <label htmlFor="file" role="button" className="btn btn-primary m-auto"><Bicon n="file-earmark-plus"/> Adicionar Ficheiro</label>
            <input hidden type="file" name="file" id="file" onInput={this.onFile}></input>
        </>);
    }
}

export class UserFileActions extends React.PureComponent<UserFileActionsProps>{
    render(): React.ReactNode {
        return <Button className="m-1 p-1 text-danger btn" title="Eliminar" onClick={() => deleteUserFile(this.props.file)} i="trash"/>
    }
}
