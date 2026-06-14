'use client'

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SavedUserFile } from "@/core/UserFile";
import { ExportType, exportSelectedFiles } from "@/core/UserFileExport";

function MultiExportAction({ selectedFiles, zipMode, label }: { selectedFiles: SavedUserFile[]; zipMode: boolean; label: string }) {
    const [loading, setLoading] = useState<boolean>(false);
    const [menuOpen, setMenuOpen] = useState<boolean>(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLUListElement>(null);
    const isSelected = selectedFiles.length > 0;

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (!menuOpen) return;
            const target = event.target as Node;
            if (
                buttonRef.current && !buttonRef.current.contains(target) &&
                menuRef.current && !menuRef.current.contains(target)
            ) {
                setMenuOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (menuOpen && event.key === 'Escape') {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [menuOpen]);

    const handleExport = async (anonimized: boolean, type: ExportType) => {
        setMenuOpen(false);
        if (!isSelected) return;

        setLoading(true);
        try {
            await exportSelectedFiles(selectedFiles, anonimized, type, zipMode);
        } catch (error) {
            console.error("ExportAllUserFilesAction failed", error);
            window.alert("Falha ao exportar ficheiro(s).");
        } finally {
            setLoading(false);
        }
    };

    const toggleMenu = () => {
        if (!buttonRef.current || !isSelected || loading) return;
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
        });
        setMenuOpen((open) => !open);
    };

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                className={`btn btn-primary m-1 ${loading ? "disabled" : ""}`}
                disabled={loading || !isSelected}
                onClick={toggleMenu}
                title={label}
            >
                <i className="bi bi-download"></i> {loading ? "A exportar..." : label}
            </button>
            {menuOpen && createPortal(
                <ul
                    ref={menuRef}
                    className="dropdown-menu show"
                    style={{
                        position: 'fixed',
                        top: menuPosition.top,
                        left: menuPosition.left,
                        zIndex: 2147483647,
                        minWidth: '220px',
                        display: 'block',
                    }}
                >
                    <li><button onClick={() => handleExport(true, "JSON")} className="dropdown-item" disabled={loading || !isSelected}>Ficheiro de trabalho (JSON)</button></li>
                    <li><button onClick={() => handleExport(false, "DOCX")} className="dropdown-item" disabled={loading || !isSelected}>Original (DOCX)</button></li>
                    <li><button onClick={() => handleExport(false, "PDF")} className="dropdown-item" disabled={loading || !isSelected}>Original (PDF)</button></li>
                    <li><button onClick={() => handleExport(true, "DOCX")} className="dropdown-item" disabled={loading || !isSelected}>Anonimizado (DOCX)</button></li>
                    <li><button onClick={() => handleExport(true, "PDF")} className="dropdown-item" disabled={loading || !isSelected}>Anonimizado (PDF)</button></li>
                </ul>,
                document.body
            )}
        </>
    );
}

export function ExportAllUserFilesZipAction({ selectedFiles }: { selectedFiles: SavedUserFile[] }) {
    return <MultiExportAction selectedFiles={selectedFiles} zipMode={true} label="Exportar Zip" />;
}

export function ExportAllUserFilesAction({ selectedFiles }: { selectedFiles: SavedUserFile[] }) {
    return <MultiExportAction selectedFiles={selectedFiles} zipMode={false} label={"Exportar Individualmente"} />;
}
