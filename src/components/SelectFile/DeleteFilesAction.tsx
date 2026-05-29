'use client'

import { useState } from "react";
import { deleteUserFile } from "@/core/UserFileCRUDL";
import { SavedUserFile } from "@/core/UserFile";
import { Button } from "@/core/BootstrapIcons";

export function DeleteSelectedUserFilesAction({ selectedFiles, clearSelection }: { selectedFiles: SavedUserFile[], clearSelection: () => void }) {
    const [loading, setLoading] = useState<boolean>(false);
    const isSelected = selectedFiles.length > 0;

    const onClick = async () => {
        if (!isSelected) return;

        const usrConfirm = window.confirm(`Confirma que quer eliminar ${selectedFiles.length} ficheiro(s) selecionado(s)?`);
        if (!usrConfirm) return;

        setLoading(true);
        try {
            await Promise.all(selectedFiles.map(file => deleteUserFile(file)));
            clearSelection();
        } catch (error) {
            console.error("DeleteSelectedUserFilesAction failed", error);
            window.alert("Falha ao eliminar ficheiro(s) selecionado(s).");
        } finally {
            setLoading(false);
        }
    };

    return <Button
        type="button"
        className={`btn btn-danger m-1 ${loading ? "disabled" : ""}`}
        title="Eliminar ficheiros selecionados"
        onClick={onClick}
        disabled={loading || !isSelected}
        i="trash"
    />;
}
