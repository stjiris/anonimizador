"use client";
import { Button } from "./BootstrapIcons"
import { useSave } from "./uses";
import { UserFileInterface } from "@/types/UserFile";

export function SavedBadge({ file }: { file: UserFileInterface }) {
    const saved = useSave(file);
    const name = file.name.length > 30 ? file.name.slice(0, 15) + '...' + file.name.slice(-15) : file.name;

    const title = saved ? "Guardado automaticamente." : "Não guardado"
    const icon = saved ? "file-earmark-check-fill" : "file-earmark-x-fill"
    const alertClass = saved ? "alert-success" : "alert-danger"

    return <Button i={icon} text={name} title={title} className={`small text-body text-nowrap btn btn-sm ${alertClass} p-1 m-1`} data-bs-toggle="modal" data-bs-target="#modal-info" />
}