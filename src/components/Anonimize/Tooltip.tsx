import { useEffect, useState } from "react"
import { AddEntityDryRun, EntityPool } from "@/types/EntityPool"
import { EntityTypeColor } from "@/types/EntityType"
import { TokenSelection } from "@/types/Selection"
import { UserFile } from "@/client-utils/UserFile"

interface AnonimizeTooltipProps {
    entityTypes: EntityTypeColor[]
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

    let fileA = props.file;

    const onMouseup = (ev: React.MouseEvent<HTMLDivElement>) => {
        if (props.contentRef.current) {
            updateSelection(ev, props.contentRef.current, props.nodesRef.current, props.pool, selection, setSelection)
        }
    }
    useEffect(() => {
        window.addEventListener("mouseup", onMouseup as any)
        return () => {
            window.removeEventListener("mouseup", onMouseup as any)
        }
    })

    if (!selection.selection) return <></>

    let sel = selection.selection;
    let start = document.querySelector(`[data-offset="${sel.start}"]`);
    if (!start) return <></>;
    let rects = start.getClientRects();

    let style: React.CSSProperties = {
        position: "fixed",
        display: "block",
        bottom: window.innerHeight - rects[0].top,
        top: rects[0].top + rects[0].height,
        left: rects[0].left,
        width: "fit-content"
    };

    if (rects[0].top > window.innerHeight / 2) {
        delete style.top;
    }
    else {
        delete style.bottom;
    }

    switch (selection.would) {
        case AddEntityDryRun.CHANGE_ARRAY:
            return (
                <div style={style}>
                    <div className="d-flex flex-column gap-1 bg-white p-1 border"
                     style={{ maxHeight: 400, overflowY: "auto" }}>
                        {sortEntityTypesXLast(props.entityTypes).map((t, i) => (
                            <span
                                key={i}
                                role="button"
                                className="badge text-body"
                                style={{ background: t.color }}
                                onMouseDown={() => setType(props.pool!, sel, t, fileA)}
                            >
                                {t.name}
                            </span>
                        ))}
                    </div>
                </div>
            );
        case AddEntityDryRun.CHANGE_OFFSET:     
            return (
                <div style={style}>
                    <div className="d-flex flex-column gap-1 bg-white p-1 border"
                     style={{ maxHeight: 400, overflowY: "auto" }}>
                        {sortEntityTypesXLast(props.entityTypes).map((t, i) => (
                            <span
                                key={i}
                                role="button"
                                className="badge text-body"
                                style={{ background: t.color }}
                                onMouseDown={() => setType(props.pool!, sel, t, fileA)}
                            >
                                {t.name}
                            </span>
                        ))}
                    </div>
                </div>
            );
        case AddEntityDryRun.CHANGE_TYPE:
            return (
                <div style={style}>
                    <div className="d-flex flex-column gap-1 bg-white p-1 border"
                     style={{ maxHeight: 400, overflowY: "auto" }}>
                        <span
                            role="button"
                            onMouseDown={() => removeType(props.pool!, sel, fileA)}
                        >
                            <i className="bi bi-trash"></i> Remover
                        </span>
                        {sortEntityTypesXLast(props.entityTypes).map((t, i) => (
                            <span
                                key={i}
                                role="button"
                                className="badge text-body"
                                style={{ background: t.color }}
                                onMouseDown={() => setType(props.pool!, sel, t, fileA)}
                            >
                                {t.name}
                            </span>
                        ))}
                    </div>
                </div>
            );
        default:
            return <></>
    }
}


export function sortEntityTypesXLast(types: EntityTypeColor[]): EntityTypeColor[] {
    return [...types].sort((a, b) => {
        const aIsX = a.name.startsWith("X");
        const bIsX = b.name.startsWith("X");
        if (aIsX && !bIsX) return 1;
        if (!aIsX && bIsX) return -1;
        return 0;
    });
}

function setType(pool: EntityPool, selection: TokenSelection, type: EntityTypeColor, file: UserFile) {
    pool.removeOffset(selection.start, selection.end, false);
    pool.addEntity(selection.start, selection.end, selection.text, type.name);
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

