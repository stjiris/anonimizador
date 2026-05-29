'use client'

import { exportFile, exportFileBlob } from "@/components/Anonimize/ExportButton";
import { SavedUserFile, UserFile } from "@/core/UserFile";
import { EntityTypeI } from "@/types/EntityType";
import type JSZip from "jszip";

export type ExportType = "DOCX" | "PDF" | "JSON";

const normalizeFileName = (name: string) => name.replace(/\.[^.]+$/, "");

const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
};

const makeZipFileName = () => {
    const now = new Date();
    const timestamp = `${now.toISOString().split("T")[0]}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
    return `anonimizador_userfiles_${timestamp}.zip`;
}

const buildEntityTypes = (userFile: UserFile) => {
    const entityTypes: Record<string, EntityTypeI> = {};
    userFile.types.forEach(t => entityTypes[t.name] = t);
    return entityTypes;
}

async function addFilesToZip(zip: JSZip, files: SavedUserFile[], anonimized: boolean, type: ExportType) {
    if (type === "JSON") {
        files.forEach((file) => {
            zip.file(`${normalizeFileName(file.name)}.json`, JSON.stringify(file, null, 2));
        });
        return;
    }

    for (const savedFile of files) {
        const userFile = new UserFile(savedFile);
        const blob = await exportFileBlob(userFile, buildEntityTypes(userFile), anonimized, type);
        if (!blob) {
            console.warn(`Failed to generate ${type} for ${savedFile.name}`);
            continue;
        }
        const fileName = `${anonimized ? "anonimizado_" : "original_"}${normalizeFileName(savedFile.name)}.${type.toLowerCase()}`;
        zip.file(fileName, blob);
    }
}

async function exportSelectedFilesZip(files: SavedUserFile[], anonimized: boolean, type: ExportType) {
    const JSZipModule = await import("jszip");
    const JSZip = JSZipModule.default || JSZipModule;
    const zip = new JSZip();

    await addFilesToZip(zip, files, anonimized, type);

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, makeZipFileName());
}

async function exportSelectedFilesIndividually(files: SavedUserFile[], anonimized: boolean, type: ExportType) {
    if (type === "JSON") {
        for (const file of files) {
            const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
            downloadBlob(blob, `${normalizeFileName(file.name)}.json`);
        }
        return;
    }

    for (const savedFile of files) {
        const userFile = new UserFile(savedFile);
        exportFile(userFile, buildEntityTypes(userFile), anonimized, type);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

export async function exportSelectedFiles(files: SavedUserFile[], anonimized: boolean, type: ExportType, zipMode: boolean) {
    if (files.length === 0) return;

    if (zipMode) {
        await exportSelectedFilesZip(files, anonimized, type);
        return;
    }

    await exportSelectedFilesIndividually(files, anonimized, type);
}
