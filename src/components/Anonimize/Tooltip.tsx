import { UserFile } from "@/core/UserFile"
import { AddEntityDryRun, EntityPool } from "@/types/EntityPool"
import { EntityTypeI } from "@/types/EntityType"
import { TokenSelection } from "@/types/SelectionType"
import { useEffect, useRef, useState, useCallback } from "react"
import { createPopper, Instance } from "@popperjs/core"

interface AnonimizeTooltipProps {
    entityTypes: EntityTypeI[]
    pool: EntityPool
    contentRef: React.RefObject<HTMLDivElement>
    nodesRef: React.MutableRefObject<HTMLElement[]>
    file: UserFile
}

interface SelectionState {
    selection: TokenSelection | undefined,
    would: AddEntityDryRun | undefined
    affects: number | undefined
}

export default function AnonimizeTooltip(props: AnonimizeTooltipProps) {
    const [selection, setSelection] = useState<SelectionState>({ selection: undefined, would: undefined, affects: undefined });
    const [subtypeParent, setSubtypeParent] = useState<EntityTypeI | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const subtypeRef = useRef<HTMLDivElement>(null);
    const popperRef = useRef<Instance | null>(null);
    const subtypePopperRef = useRef<Instance | null>(null);

    const onMouseup = useCallback((ev: MouseEvent) => {
        if ((ev.target as HTMLElement).closest('[data-type-picker]')) return;
        if (props.contentRef.current) {
            updateSelection(ev as any, props.contentRef.current, props.nodesRef.current, props.pool, selection, setSelection)
        }
    }, [props.contentRef, props.nodesRef, props.pool, selection]);

    useEffect(() => {
        window.addEventListener("mouseup", onMouseup)
        return () => window.removeEventListener("mouseup", onMouseup)
    }, [onMouseup])

    // reset subtype panel whenever the selection changes
    useEffect(() => {
        setSubtypeParent(null);
    }, [selection.selection]);

    // popper for the subtype panel, anchored to the main dropdown
    useEffect(() => {
        subtypePopperRef.current?.destroy();
        subtypePopperRef.current = null;

        if (!subtypeParent || !menuRef.current || !subtypeRef.current) return;

        subtypePopperRef.current = createPopper(menuRef.current, subtypeRef.current, {
            placement: "right-start",
            modifiers: [
                { name: "flip", enabled: true },
                { name: "preventOverflow", options: { boundary: "viewport" } },
            ],
        });

        return () => {
            subtypePopperRef.current?.destroy();
            subtypePopperRef.current = null;
        };
    }, [subtypeParent]);

    // hook para o dropdown seguir o texto selecionado
    useEffect(() => {
        if (!selection.selection || !menuRef.current) {
            popperRef.current?.destroy();
            popperRef.current = null;
            return;
        }

        const anchor = document.querySelector(`[data-offset="${selection.selection.start}"]`);
        if (!anchor) return;

        popperRef.current = createPopper(anchor as HTMLElement, menuRef.current, {
            placement: "bottom-start",
            modifiers: [
                { name: "flip", enabled: true },
                {
                    name: "preventOverflow",
                    options: { boundary: props.contentRef.current || "viewport" }
                },
                { name: "hide", enabled: true },
                {
                    name: "detectHidden",
                    enabled: true,
                    phase: "main",
                    fn({ state }) {
                        // se sair do ecrã, esconder o menu e limpar a seleção
                        if (state.modifiersData.hide?.isReferenceHidden) {
                            window.getSelection()?.removeAllRanges();
                            setSelection({ selection: undefined, would: undefined, affects: undefined });
                        }
                    },
                },
            ],
        });

        return () => {
            popperRef.current?.destroy();
            popperRef.current = null;
        };
    }, [selection.selection, props.contentRef]);

    if (!selection.selection || selection.would === undefined) return <></>;

    const handleSelectType = (typeName: string) => {
        setType(props.pool, selection.selection!, typeName, props.file);
        setSelection({ selection: undefined, would: undefined, affects: undefined });
        setSubtypeParent(null);
    };

    const handleRemove = () => {
        removeType(props.pool, selection.selection!, props.file);
        setSelection({ selection: undefined, would: undefined, affects: undefined });
        setSubtypeParent(null);
    };

    const handleOpenSubtype = (type: EntityTypeI) => {
        setSubtypeParent(type);
    };

    return (
        <>
            <div
                ref={menuRef}
                className="dropdown-menu show shadow"
                data-type-picker="true"
                style={{ maxHeight: 400, overflowY: "auto", minWidth: 160, zIndex: 9999 }}
            >
                {selection.would === AddEntityDryRun.CHANGE_TYPE && (
                    <>
                        <button
                            className="dropdown-item text-danger"
                            onMouseDown={(e) => { e.preventDefault(); handleRemove(); }}
                        >
                            <i className="bi bi-trash me-1"></i> Remover
                        </button>
                        <div className="dropdown-divider"></div>
                    </>
                )}
                {sortEntityTypesXLast(props.entityTypes).map((t, i) => (
                    <button
                        key={i}
                        className="dropdown-item d-flex align-items-center gap-2"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            if (!t.subtypes?.length) {
                                handleSelectType(t.name);
                            } else {
                                handleOpenSubtype(t);
                            }
                        }}
                    >
                        <span className="badge" style={{ background: t.color, minWidth: 12, minHeight: 12 }}>&nbsp;</span>
                        {t.name}
                        {!!t.subtypes?.length && <i className="bi bi-chevron-right ms-auto" style={{ fontSize: "0.8rem" }} />}
                    </button>
                ))}
            </div>

            {subtypeParent?.subtypes && (
                <div
                    ref={subtypeRef}
                    className="dropdown-menu show shadow overflow-y-auto"
                    data-type-picker="true"
                    style={{ zIndex: 10000, maxHeight: 300 }}
                >
                    <button
                        className="dropdown-item d-flex align-items-center gap-2"
                        onMouseDown={(e) => { e.preventDefault(); handleSelectType(subtypeParent.name); }}
                    >
                        <span className="badge" style={{ background: subtypeParent.color, minWidth: 12, minHeight: 12 }}>&nbsp;</span>
                        {subtypeParent.name}
                    </button>
                    <div className="dropdown-divider"></div>
                    {subtypeParent.subtypes.map((subtype, idx) => (
                        <button
                            key={idx}
                            className="dropdown-item d-flex align-items-center gap-2"
                            onMouseDown={(e) => { e.preventDefault(); handleSelectType(subtype.name); }}
                        >
                            <span className="badge" style={{ background: subtype.color, minWidth: 12, minHeight: 12 }}>&nbsp;</span>
                            {subtype.name}
                        </button>
                    ))}
                </div>
            )}
        </>
    );
}

export function sortEntityTypesXLast(types: EntityTypeI[]): EntityTypeI[] {
    return [...types].sort((a, b) => {
        const aIsX = a.name.startsWith("X");
        const bIsX = b.name.startsWith("X");
        if (aIsX && !bIsX) return 1;
        if (!aIsX && bIsX) return -1;
        return 0;
    });
}

function setType(pool: EntityPool, selection: TokenSelection, typeName: string, file: UserFile) {
    pool.removeOffset(selection.start, selection.end, false);
    pool.addEntity(selection.start, selection.end, selection.text, typeName);
    file.checkCountPES();
}

function removeType(pool: EntityPool, selection: TokenSelection, file: UserFile) {
    pool.removeOffset(selection.start, selection.end)
    file.checkCountPES();
}

function updateSelection(ev: React.MouseEvent<HTMLDivElement>, contentDiv: HTMLDivElement, nodes: HTMLElement[], pool: EntityPool, selection: SelectionState, setSelection: (s: SelectionState) => void) {
    let sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
        sel = null
    }
    else {
        let commonAncestorContainer = sel.getRangeAt(0).commonAncestorContainer;
        if (!commonAncestorContainer.contains(contentDiv) && !contentDiv.contains(commonAncestorContainer)) {
            sel = null
        }
    }
    if (sel !== null) {
        let range = sel.getRangeAt(0);
        let startOffset = parseInt(range.startContainer.parentElement?.dataset.offset || "-1");
        let endOffset = parseInt(range.endContainer.parentElement?.dataset.offset || "-1") + (range.endContainer.parentElement?.textContent?.length || 0);
        if (range.startContainer.textContent?.length === range.startOffset) {
            startOffset += range.startOffset;
            console.log("FIXING OFF BY ONE ERROR (start)");
        }
        if (range.endOffset === 0) {
            console.log("FIXING OFF BY ONE ERROR (end)");
            endOffset -= 1;
        }
        if (startOffset >= 0 && endOffset >= 0) {
            let cnodes = nodes.filter((e: HTMLElement) => parseInt(e.dataset.offset || "-1") >= startOffset && parseInt(e.dataset.offset || "-1") < endOffset)
            let sNode = cnodes[0]?.firstChild;
            let eNode = cnodes[cnodes.length - 1]?.lastChild;
            if (sNode && eNode) {
                range.setStart(sNode, 0);
                range.setEnd(eNode, eNode.textContent?.length || 0);
            }
            let text = cnodes.map(e => e.textContent).join("")
            let r = pool.addEntityDryRun(startOffset, endOffset - 1, text)
            setSelection({
                selection: {
                    text: text,
                    start: startOffset,
                    end: endOffset - 1
                },
                would: r[0],
                affects: r[1]
            })
            return;
        }
        else {
            sel = null;
        }
    }
    if (selection.selection !== undefined) {
        setSelection({ selection: undefined, affects: undefined, would: undefined })
    }
    else {
        let target = ev.target;
        if (target instanceof HTMLElement) {
            let startOffset = parseInt(target.dataset.offset || "-1");
            let iresult = pool.entitiesAt(startOffset, startOffset + 1);
            let ent = iresult[0];
            if (ent) {
                let off = ent.offsets.find(off => startOffset >= off.start && startOffset < off.end);
                if (off) {
                    setSelection({
                        selection: {
                            text: pool.originalText.substring(off.start, off.end + 1),
                            start: off.start,
                            end: off.end
                        },
                        would: AddEntityDryRun.CHANGE_TYPE,
                        affects: 1
                    })
                }
            }
        }
    }
}
