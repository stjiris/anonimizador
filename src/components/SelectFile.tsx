import React, { ChangeEvent, useEffect, useState } from "react";
import { createUserFile, deleteUserFile, readSavedUserFile, listUserFile } from "../util/UserFileCRUDL";
import { isSavedUserFile, SavedUserFile, UserFile } from "../types/UserFile";
import MaterialReactTable, { MRT_ColumnDef } from "material-react-table";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { Bicon, Button } from "../util/BootstrapIcons";

// https://stackoverflow.com/a/18650828/2573422
export function formatBytes(a: number, b = 2) { if (!+a) return "0 Bytes"; const c = 0 > b ? 0 : b, d = Math.floor(Math.log(a) / Math.log(1024)); return `${parseFloat((a / Math.pow(1024, d)).toFixed(c))} ${["Bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"][d]}` }

const intl = new Intl.DateTimeFormat(["pt", "en"], { dateStyle: "short", timeStyle: "medium" });

const cols: MRT_ColumnDef<SavedUserFile>[] = [
    {
        header: "Ficheiros Locais",
        Header: <><i className="bi bi-file-earmark-fill"></i> Ficheiros Locais</>,
        accessorKey: "name",
        size: 80,
        Cell: ({ row }) => <Button i="file-earmark" className="text-nowrap text-primary btn m-0 p-0" title={`Abrir ${row.original.name}`} text={row.original.name} />
    },
    {
        header: "Tamanho",
        accessorFn: file => formatBytes(new Blob([JSON.stringify(file)]).size) // Overengeneering text.length
    },
    {
        header: "N.º de Entidades / Ocurrências",
        accessorFn: file => `${file.ents.reduce((acc, c) => acc + 1, 0)} / ${file.ents.reduce((acc, c) => acc + c.offsets.length, 0)}`
    },
    {
        header: "Importado", accessorKey: "imported", accessorFn: (file) => intl.format(new Date(file.imported))
    },
    {
        header: "Modificado", accessorKey: "modified", accessorFn: (file) => intl.format(new Date(file.modified))
    }
]


export default function SelectFile({ setUserFile }: { setUserFile: (file: UserFile) => void }) {
    const [list, setList] = useState<SavedUserFile[]>(listUserFile());

    useEffect(() => {
        const update = () => setList(listUserFile());
        window.addEventListener("AlertUpdateListUserFile", update);
        return () => {
            window.removeEventListener("AlertUpdateListUserFile", update);
        }
    }, [])


    return <MaterialReactTable
        muiTablePaperProps={{ className: "container" }}
        renderTopToolbarCustomActions={({ table }) => <AddUserFileAction setUserFile={setUserFile} />}
        columns={cols}
        data={list}
        localization={{ ...MRT_Localization_PT, noRecordsToDisplay: "Sem ficheiros" }}
        enableRowActions={true}
        renderRowActions={({ row }) => <UserFileActions file={row.original} setUserFile={setUserFile} />}
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
        muiTableBodyRowProps={({ row }) => ({ onClick: (e) => setUserFile(new UserFile(row.original)) })}
    />
}

async function onFile(event: React.ChangeEvent<HTMLInputElement>): Promise<UserFile | undefined> {
    let files = event.target.files;
    if (files == null) return;

    let file = files[0];

    let formData = new FormData();
    formData.append("file", file);

    if (file.type === "application/json") {
        let loadedUserFile = await file.text().then(txt => {
            let obj = JSON.parse(txt);
            if (isSavedUserFile(obj)) {
                return obj
            }
            else {
                return null
            }
        }).catch(e => {
            console.log(e);
            return null;
        });
        if (loadedUserFile) {
            let savedUserFile = readSavedUserFile(loadedUserFile.name);
            if (savedUserFile != null) {
                let usrConfirm = window.confirm("Existe um ficheiro guardado localmente com o mesmo nome. Confirma que quer apagar ficheiro antigo?");
                if (!usrConfirm) {
                    event.target.value = "";
                    return;
                }
                deleteUserFile(savedUserFile);
            }
            try {
                createUserFile(loadedUserFile);
            }
            catch (e) {
                alert("Aviso! Ficheiro grande demais para ser guardado no browser. Poderá trabalhar nele à mesma.");
            }
            return new UserFile(loadedUserFile);
        }
    }

    let savedUserFile = readSavedUserFile(file.name);
    if (savedUserFile != null) {
        let usrConfirm = window.confirm("Existe um ficheiro guardado localmente com o mesmo nome. Confirma que quer apagar ficheiro antigo?");
        if (!usrConfirm) {
            event.target.value = "";
            return;
        }
        deleteUserFile(savedUserFile);
    }

    event.target.disabled = true;
    return fetch("./html", { method: "POST", body: formData }).then(async r => {
        let content = await r.text();

        if (r.status !== 200) return Promise.reject(new Error(content));

        let documentDom = new DOMParser().parseFromString(content, "text/html");

        return UserFile.newFrom(file.name, documentDom.body.innerHTML);

    }).catch(e => {
        console.error(e);
        window.alert("Falha ao interpertar ficheiro submetido.");
        return undefined
    }).finally(() => {
        event.target.value = "";
        event.target.disabled = false;
    })
}

export function AddUserFileAction({ setUserFile }: { setUserFile: (file: UserFile) => void }) {
    const [uploading, setUploading] = useState<boolean>(false);
    const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
        setUploading(true);
        await onFile(e).then(f => f ? setUserFile(f) : null)
        setUploading(false);
    }

    return <>
        <label htmlFor="file" role="button" className={`btn btn-primary m-auto ${uploading ? "disabled" : ""}`}>{uploading ? <><span className="spinner-border spinner-border-sm" role="status"></span> A carregar ficheiro...</> : <><Bicon n="file-earmark-plus" /> Adicionar Ficheiro</>}</label>
        <input hidden type="file" name="file" id="file" onChange={onChange}></input>
    </>

}

export function UserFileActions(props: { file: SavedUserFile, setUserFile: (file: UserFile) => void }) {
    return <Button className="m-1 p-1 text-danger btn" title="Eliminar" onClick={(ev) => { ev.stopPropagation(); deleteUserFile(props.file) }} i="trash" />
}
