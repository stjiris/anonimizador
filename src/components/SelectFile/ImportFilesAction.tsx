'use client'

import { ChangeEvent, useState } from "react";
import { Bicon } from "@/core/BootstrapIcons";
import { importUserFiles } from "@/core/UserFileImport";

export function ImportFilesAction({ clearSelection }: { clearSelection: () => void }) {
    const [uploading, setUploading] = useState<boolean>(false);

    const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;

        setUploading(true);
        try {
            await importUserFiles(Array.from(files), {
                confirmOverwrite: (name) => window.confirm(`Existe um ficheiro guardado com o nome "${name}". Confirma que quer apagar ficheiro antigo?`),
                onLargeFileWarning: () => window.alert("Aviso! Ficheiro grande demais para ser guardado no browser. Poderá trabalhar nele à mesma."),
                onParseError: () => window.alert("Falha ao interpertar ficheiro submetido."),
            });
            clearSelection();
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }

    return <>
        <label htmlFor="importFiles" role="button" className={`btn btn-primary m-1 ${uploading ? "disabled" : ""}`}>{uploading ? <><span className="spinner-border spinner-border-sm" role="status"></span> A importar...</> : <><Bicon n="file-earmark-plus" /> Importar Ficheiros</>}</label>
        <input hidden type="file" multiple name="importFiles" id="importFiles" onChange={onChange}></input>
    </>
}
