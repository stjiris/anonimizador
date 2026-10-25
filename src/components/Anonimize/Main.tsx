import {useCallback, useEffect, useRef, useState} from "react";

import {
    AnonimizeStateCombined,
    AnonimizeStateState,
    AnonimizeVisualState,
    getAnonimizedStateCombined
} from "@/types/AnonimizeState";
import AnonimizeContent from "./Content";
import { EntityTable } from "./EntityTable";
import { HistoryCommands } from "./HistoryCommands";
import { ImageEditorModal } from "./ImageEditorModal";
import { ToolsModalBody } from "./Tools";
import { ExportButton } from "./ExportButton";
import { UserFile } from "@/core/UserFile";
import { Bicon, Button } from "@/core/BootstrapIcons";
import { useEntities, useSave } from "@/hooks";
import { EntitiesStyle } from "@/core/entitiesStyle";
import { ExitButton, ForceExitButton } from "./ExitButton";
import { SavedBadge } from "@/components/SavedBadge";
import { SuggestButton } from "@/core/runRemoteNlp";
import BootstrapModal from "@/core/BootstrapModal";
import { InfoModalContent } from "@/core/infoModalContent";
import { Entity, SpecificOffsetRange } from "@/types/EntityType";
import { AddEntityDryRun } from "@/types/EntityPool";

interface AnonimizeProps {
    file: UserFile
    setUserFile: (file: UserFile | undefined) => void
}

const Sep = () => (
    <small className="text-white text-nowrap p-1 m-1 flex-grow-1 text-center">
        <Bicon n="dot" />
    </small>
);

export default function Main({ file, ...props }: AnonimizeProps) {
    const [anonimizeState, setAnonimizeSate] = useState<AnonimizeStateCombined>(getAnonimizedStateCombined(AnonimizeVisualState.ALL_TYPES));

    const [requesting, setRequesting] = useState<boolean>(false);
    const [paginated, setPaginated] = useState<boolean>(false);

    const saved = useSave(file);

    const [searchText, setSearchText] = useState<string | undefined>(undefined);
    const [searchResults, setSearchResults] = useState<SpecificOffsetRange[]>([]);

    const ents = useEntities(file.pool);

    useEffect(() => {
        const text = file.doc.textContent || "";
        const timer = setTimeout(() => {
            if (searchText) {
                setSearchResults(search(text, searchText).filter(result =>
                    file.pool.addEntityDryRun(result.start, result.end, result.preview)[0] !== AddEntityDryRun.CHANGE_TYPE
                ));
            } else {
                setSearchResults([]);
            }
        }, 750);

        return () => clearTimeout(timer);
    }, [file.doc, file.pool, ents, searchText]);

    useEffect(() => {
        const onExit = (evt: BeforeUnloadEvent) => {
            if (!saved) {
                evt.preventDefault();
                evt.returnValue = "Trabalho em progresso não guardado automaticamente. Confirma que pertende sair?"
            }
            if (requesting) {
                evt.preventDefault();
                evt.returnValue = "A anonimização automática será cancelada. Confirma que pertende sair?"
            }
        }
        window.addEventListener("beforeunload", onExit)
        return () => {
            window.removeEventListener("beforeunload", onExit)
        }
    }, [requesting, saved])

    const [tableWidthPercent, setTableWidthPercent] = useState(41.67); // ~col-5
    const isDragging = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const rightPercent = ((rect.right - e.clientX) / rect.width) * 100;
            setTableWidthPercent(Math.min(70, Math.max(20, rightPercent)));
        };

        const onMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    }, []);

    return <>
        <div id="doc" ref={containerRef} className="vh-100 vw-100 d-flex flex-column overflow-hidden">
            <EntitiesStyle file={file} />
            <header className="anon-toolbar d-flex border-bottom border-black">
                {requesting ? <ForceExitButton setUserFile={props.setUserFile} /> : <ExitButton file={file} setUserFile={props.setUserFile} />}
                <SavedBadge file={file} />
                <Button title="Gerir perfil" i="person-badge" text="Perfil" className="btn btn-sm text-body  alert alert-primary m-1 p-1" data-bs-toggle="modal" data-bs-target="#modal-profile" />
                <Sep />
                <Button title="Documento paginado" i="file-earmark-break" text="Paginar" className={"btn btn-sm m-1 p-1 " + (paginated ? "btn-success" : "btn-danger")} onClick={() => setPaginated(p => !p)} />
                <select title="Escolher modo" className="text-body btn m-1 p-1 text-start alert alert-primary" onChange={(ev) => setAnonimizeSate(getAnonimizedStateCombined(ev.target.value as AnonimizeVisualState))} defaultValue={AnonimizeVisualState.ALL_TYPES}>
                    <option value={AnonimizeVisualState.ORIGINAL}>{AnonimizeVisualState.ORIGINAL}</option>
                    <option value={AnonimizeVisualState.REPLACE}>{AnonimizeVisualState.REPLACE}</option>
                    <option value={AnonimizeVisualState.REPLACE_NORMAL}>{AnonimizeVisualState.REPLACE_NORMAL}</option>
                    <option value={AnonimizeVisualState.REPLACE_OTHER}>{AnonimizeVisualState.REPLACE_OTHER}</option>
                    <option value={AnonimizeVisualState.ALL_TYPES}>{AnonimizeVisualState.ALL_TYPES}</option>
                    <option value={AnonimizeVisualState.NORMAL_TYPES}>{AnonimizeVisualState.NORMAL_TYPES}</option>
                    <option value={AnonimizeVisualState.OTHER_TYPES}>{AnonimizeVisualState.OTHER_TYPES}</option>
                    <option value={AnonimizeVisualState.ANONIMIZED}>{AnonimizeVisualState.ANONIMIZED}</option>
                </select>
                <ExportButton file={file} />
                <Sep />
                <Button title="Pesquisar" i="search" text="Pesquisar" className="btn btn-sm text-body  alert alert-primary m-1 p-1" data-bs-toggle="modal" data-bs-target="#modal-search" />
                <SuggestButton file={file} state={anonimizeState.state} setRequesting={setRequesting} requesting={requesting} />
                <HistoryCommands pool={file.pool} />
                <a className="red-link m-1 p-1 btn" href="https://docs.google.com/document/d/e/2PACX-1vTaR6kTasw0iGYSSMbJpq2wMgrBN5K37jg5ab_qMih_VpXRO5ZAAeeeDiRYzvyrD_VDxBM2ccW-VuBQ/pub" target="_blank" title="Abrir ajuda" rel="noreferrer"><Bicon n="question-circle" /></a>
            </header>
            <div className="d-flex" style={{ minHeight: 0 }}>
                <div className="overflow-y-auto" style={{ width: `${100 - tableWidthPercent}%`, minWidth: 0 }}>
                    {requesting && anonimizeState.state === AnonimizeStateState.TAGGED ?
                        <div className="alert alert-info">A processar o documento, esta operação poderá demorar.</div>
                        :
                        <AnonimizeContent paginated={paginated} showTypes={anonimizeState.showTypes} file={file} searchResults={searchResults} anonimizeState={anonimizeState.state} />
                    }
                </div>
                <div role="separator" className="resize-handle" onMouseDown={onMouseDown} />
                <div id="entityTable" style={{ width: `${tableWidthPercent}%`, minWidth: 0 }}>
                    <EntityTable file={file} globalFilter={searchText} setGlobalFilter={setSearchText} searchResults={searchResults} />
                </div>
            </div>
        </div>
        <ImageEditorModal file={file} />
        <BootstrapModal id="modal-info">
            <InfoModalContent file={file} />
        </BootstrapModal>
        <BootstrapModal id="modal-tools">
            <ToolsModalBody file={file} />
        </BootstrapModal>
    </>
}

function isWordChar(char: string | undefined): boolean {
    if (!char) return false;
    // Matches letters, numbers, and underscores across Unicode scripts
    return /[\p{L}\p{N}_]/u.test(char);
}

// Search for query in the given text.
function search(text: string, filter: string): SpecificOffsetRange[] {
    const needle = normalize(filter);
    if (needle.length < 2) return [];

    let normalizedText = "";
    const sourceStarts: number[] = [];
    const sourceEnds: number[] = [];
    for (let i = 0; i < text.length;) {
        const codePoint = text.codePointAt(i)!;
        const original = String.fromCodePoint(codePoint);
        const start = i;
        i += original.length;
        const normalized = normalize(original);
        for (let j = 0; j < normalized.length; j++) {
            normalizedText += normalized[j];
            sourceStarts.push(start);
            sourceEnds.push(i - 1);
        }
    }

    const results: SpecificOffsetRange[] = [];
    let from = 0;
    while (from <= normalizedText.length - needle.length) {
        const index = normalizedText.indexOf(needle, from);
        if (index < 0) break;

        // Reject matches that start in the middle of a word (e.g. "tc" in "etc")
        const isPrecededByWordChar = index > 0 && isWordChar(normalizedText[index - 1]);

        // (Optional) Uncomment to also reject matches with suffixes (e.g. "search" in "searching"):
        // const nextIndex = index + needle.length;
        // const isFollowedByWordChar = nextIndex < normalizedText.length && isWordChar(normalizedText[nextIndex]);

        if (!isPrecededByWordChar /* && !isFollowedByWordChar */) {
            const start = sourceStarts[index];
            const end = sourceEnds[index + needle.length - 1];
            const preview = text.slice(start, end + 1);

            const ent = new Entity("X-SEARCH");
            ent.addOffset([{ start, end, preview }]);

            results.push({ start, end, preview, ent });
        }

        from = index + 1; // Step by 1 to avoid skipping potential overlapping matches
    }

    return results;
}

function normalize(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}