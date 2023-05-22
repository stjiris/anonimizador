import { useEffect } from "react"
import { UserFile } from "../types/UserFile"
import { Bicon, Button } from "./BootstrapIcons"

export function SavedBadge({file}: {file: UserFile}){
    const saved = file.useSave()();

    const title = saved ? "Guardado automaticamente." : "Não guardado"
    const icon = saved ? "file-earmark-check-fill" : "file-earmark-x-fill"
    const alertClass = saved ? "alert-success" : "alert-danger"

    return <Button i={icon} text={file.name} title={title} className={`small text-body text-nowrap btn btn-sm ${alertClass} p-1 m-1`} data-bs-toggle="modal" data-bs-target="#modal-info"/>
}