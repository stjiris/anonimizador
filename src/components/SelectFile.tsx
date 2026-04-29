'use client'
import React, { ChangeEvent, useEffect, useState } from "react";
import { createUserFile, deleteUserFile, readSavedUserFile, listUserFile } from "@/core/UserFileCRUDL";
import { isSavedUserFile, SavedUserFile, UserFile } from "@/core/UserFile";
import { MRT_ColumnDef, MaterialReactTable } from "material-react-table";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { Bicon, Button } from "@/core/BootstrapIcons";
import ReactDOM from "react-dom";

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
        header: "N.º de Entidades / Ocorrências",
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
    const [list, setList] = useState<SavedUserFile[]>([]);

    useEffect(() => {
        (async () => {
            const files = await listUserFile();
            setList(files);
        })();
    }, []);

    useEffect(() => {
        const update = () => {
            (async () => {
                const files = await listUserFile();
                setList(files);
            })();
        };
        window.addEventListener("AlertUpdateListUserFile", update);
        return () => window.removeEventListener("AlertUpdateListUserFile", update);
    }, []);

    return (
        <MaterialReactTable
            muiTablePaperProps={{ className: "container" }}
            columns={cols}
            data={list}
            localization={{ ...MRT_Localization_PT, noRecordsToDisplay: "Sem ficheiros" }}
            enableRowActions
            renderRowActions={({ row }) => <UserFileActions file={row.original} setUserFile={setUserFile} />}
            positionActionsColumn="first"
            muiTableBodyRowProps={({ row }) => ({
                onClick: () => setUserFile(new UserFile(row.original))
            })}
            renderTopToolbarCustomActions={() => <AddUserFileAction setUserFile={setUserFile} />}
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
        />
    );
}

async function onFile(event: React.ChangeEvent<HTMLInputElement>, askMemoryAlert: () => Promise<boolean>): Promise<UserFile | undefined> {
    let files = event.target.files;
    if (files == null) return;

    let file = files[0];

    if (navigator.storage && navigator.storage.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    const freeSpace = (quota ?? 0) - (usage ?? 0);
    if (freeSpace < file.size * 3) { //testar: Number.MAX_SAFE_INTEGER) { ||| final: if (freeSpace < file.size * 3) {
        const continuar = await askMemoryAlert();
        if (!continuar) {
            event.target.value = "";
            return;
        }
    }
}

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
            let savedUserFile = await readSavedUserFile(loadedUserFile.name);
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

    let savedUserFile = await readSavedUserFile(file.name);
    if (savedUserFile != null) {
        let usrConfirm = window.confirm("Existe um ficheiro guardado localmente com o mesmo nome. Confirma que quer apagar ficheiro antigo?");
        if (!usrConfirm) {
            event.target.value = "";
            return;
        }
        deleteUserFile(savedUserFile);
    }

    event.target.disabled = true;
    return fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/api/to_html`, { method: "POST", body: formData }).then(async r => {
        let content = await r.text();

        if (r.status !== 200)
            return Promise.reject(new Error(content));

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
    
    const [showMemoryAlert, setShowMemoryAlert] = useState(false);
    const [resolveMemoryAlert, setResolveMemoryAlert] = useState<((v: boolean) => void) | null>(null);

    const askMemoryAlert = (): Promise<boolean> => {
        return new Promise((resolve) => {
            setResolveMemoryAlert(() => resolve);
            setShowMemoryAlert(true);
        });
    };
    const [uploading, setUploading] = useState<boolean>(false);
    const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
        setUploading(true);
        await onFile(e, askMemoryAlert).then(f => f ? setUserFile(f) : null)
        setUploading(false);
    }
    return <>
        {showMemoryAlert && ReactDOM.createPortal(
            <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 9999 }} role="dialog">
                <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "380px" }}>
                    <div className="modal-content" style={{ border: "3px solid #dc3545", borderRadius: "12px" }}>
                        <div className="modal-body text-center p-4">
                            <div style={{ fontSize: "3rem" }}>⚠️</div>
                            <h5 className="text-danger fw-bold mt-2">ALERTA DE MEMÓRIA</h5>
                            <p className="fw-bold">PODERÁ NÃO VIR A TER ESPAÇO PARA TRABALHAR ESTE DOCUMENTO!!!</p>
                            <p className="text-muted">Remova documentos antigos para libertar espaço...</p>
                            <p>Deseja continuar mesmo assim?</p>
                        </div>
                        <div className="modal-footer justify-content-center border-0 pb-4">
                            <button className="btn btn-secondary px-4" onClick={() => { setShowMemoryAlert(false); resolveMemoryAlert?.(false); }}>Cancelar</button>
                            <button className="btn btn-danger px-4" onClick={() => { setShowMemoryAlert(false); resolveMemoryAlert?.(true); }}>Continuar</button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )}
        <label htmlFor="file" role="button" className={`btn btn-primary m-auto ${uploading ? "disabled" : ""}`}>{uploading ? <><span className="spinner-border spinner-border-sm" role="status"></span> A carregar ficheiro...</> : <><Bicon n="file-earmark-plus" /> Adicionar Ficheiro</>}</label>
        <input hidden type="file" name="file" id="file" onChange={onChange}></input>
    </>

}

export function UserFileActions(props: { file: SavedUserFile, setUserFile: (file: UserFile) => void }) {
    return <Button className="m-1 p-1 text-danger btn" title="Eliminar" onClick={(ev) => { ev.stopPropagation(); deleteUserFile(props.file) }} i="trash" />
}
