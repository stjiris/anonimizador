'use client'

import { createUserFile, deleteUserFile, readSavedUserFile } from "@/core/UserFileCRUDL";
import { isSavedUserFile, SavedUserFile, UserFile } from "@/core/UserFile";

type ImportCallbacks = {
    confirmOverwrite?: (name: string) => boolean | Promise<boolean>;
    onLargeFileWarning?: () => void;
    onParseError?: (error: unknown) => void;
}

async function canOverwriteFile(name: string, confirmOverwrite?: ImportCallbacks["confirmOverwrite"]) {
    const savedUserFile = await readSavedUserFile(name);
    if (savedUserFile == null) return true;

    const confirmed = await confirmOverwrite?.(name);
    if (!confirmed) return false;

    await deleteUserFile(savedUserFile);
    return true;
}

async function saveImportedUserFile(userFile: SavedUserFile, callbacks: ImportCallbacks) {
    const saved = await createUserFile(userFile);
    if (!saved) {
        callbacks.onLargeFileWarning?.();
    }
    return new UserFile(userFile);
}

async function parseSavedUserFileJson(content: string) {
    const obj = JSON.parse(content);
    return isSavedUserFile(obj) ? obj : null;
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

async function getOriginalPdfSource(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        return undefined;
    }

    return {
        name: file.name,
        type: file.type || "application/pdf",
        dataUrl: await fileToDataUrl(file),
    };
}

async function importJsonUserFile(file: File, callbacks: ImportCallbacks) {
    const loadedUserFile = await file.text()
        .then(parseSavedUserFileJson)
        .catch((error) => {
            console.log(error);
            return null;
        });

    if (!loadedUserFile) return undefined;

    const importedUserFile = { ...loadedUserFile, imported: new Date().toString(), importedFromJson: true };
    if (!await canOverwriteFile(importedUserFile.name, callbacks.confirmOverwrite)) {
        return undefined;
    }

    return saveImportedUserFile(importedUserFile, callbacks);
}

async function importConvertedUserFile(file: File, callbacks: ImportCallbacks) {
    if (!await canOverwriteFile(file.name, callbacks.confirmOverwrite)) {
        return undefined;
    }

    const formData = new FormData();
    formData.append("file", file);

    return fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/api/to_html`, { method: "POST", body: formData }).then(async r => {
        const content = await r.text();

        if (r.status !== 200)
            return Promise.reject(new Error(content));

        const documentDom = new DOMParser().parseFromString(content, "text/html");

        return UserFile.newFrom(file.name, documentDom.body.innerHTML, {
            originalPdf: await getOriginalPdfSource(file),
        });

    }).catch(error => {
        console.error(error);
        callbacks.onParseError?.(error);
        return undefined
    })
}

export async function importUserFile(file: File, callbacks: ImportCallbacks = {}) {
    if (file.type === "application/json") {
        const importedFile = await importJsonUserFile(file, callbacks);
        if (importedFile) return importedFile;
    }

    return importConvertedUserFile(file, callbacks);
}

export async function importUserFiles(files: File[], callbacks: ImportCallbacks = {}) {
    for (const file of files) {
        if (file.name.toLowerCase().endsWith('.zip')) {
            await importUserFilesZip(file, callbacks);
        } else {
            await importUserFile(file, callbacks);
        }
    }
}

export async function importUserFilesZip(zipFile: File, callbacks: ImportCallbacks = {}) {
    try {
        const JSZipModule = await import("jszip");
        const JSZip = JSZipModule.default || JSZipModule;
        const zip = await JSZip.loadAsync(zipFile);

        const entries = Object.values(zip.files).sort((a, b) => (a.name > b.name ? 1 : -1));

        for (const entry of entries) {
            if (entry.dir || !entry.name.toLowerCase().endsWith(".json")) continue;
            try {
                const content = await entry.async("string");
                const obj = await parseSavedUserFileJson(content);
                if (!obj) {
                    console.warn(`Skipped invalid entry ${entry.name}`);
                    continue;
                }

                const importedUserFile = { ...obj, imported: new Date().toString(), importedFromJson: true };
                if (!await canOverwriteFile(importedUserFile.name, callbacks.confirmOverwrite)) {
                    continue;
                }

                await createUserFile(importedUserFile);
            } catch (innerError) {
                console.error(`Failed to import entry ${entry.name}`, innerError);
            }
        }
    } catch (error) {
        console.error("importUserFilesZip failed", error);
    }
}
