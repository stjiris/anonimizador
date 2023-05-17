import { useEffect } from "react"
import { UserFile } from "../types/UserFile"
import { Bicon } from "./BootstrapIcons"

export function SavedBadge({file}: {file: UserFile}){
    const saved = file.useSave()();

    const title = saved ? "Guardado automaticamente." : "Não guardado"

    return <span title={title} className={`text-body text-nowrap alert alert-${saved ? "success" : "danger"} p-1 m-1`}><Bicon n={saved ? "file-earmark-check-fill" : "file-earmark-x-fill"}/> <small>{file.name}</small></span>
}