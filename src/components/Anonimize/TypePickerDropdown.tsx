import { forwardRef, useEffect, useRef, useState } from "react";
import { EntityTypeI } from "@/types/EntityType";
import { sortEntityTypesXLast } from "@/components/Anonimize/Tooltip";

export interface TypePickerProps {
    types: EntityTypeI[];
    anchorRef: React.RefObject<HTMLElement | HTMLSpanElement | null>;
    onSelect: (typeName: string) => void;
    onClose: () => void;
    onRemove?: () => void;
    noAutoPosition?: boolean;
}

export const TypePickerDropdown = forwardRef<HTMLDivElement, TypePickerProps>(
function TypePickerDropdown({ types, anchorRef, onSelect, onClose, onRemove, noAutoPosition }, forwardedRef) {
    const [showSubtypePicker, setShowSubtypePicker] = useState(false);
    const [selectedParentType, setSelectedParentType] = useState<EntityTypeI | null>(null);
    const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
    const [subtypePos, setSubtypePos] = useState({ top: 0, left: 0 });
    const pickerRef = useRef<HTMLDivElement>(null);

    const setRefs = (el: HTMLDivElement | null) => {
        (pickerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        if (typeof forwardedRef === "function") forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
    };

    useEffect(() => {
        if (!noAutoPosition && anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setPickerPos({ top: rect.bottom, left: rect.left });
        }
        const handler = (e: MouseEvent) => {
            if (
                anchorRef.current && !anchorRef.current.contains(e.target as Node) &&
                pickerRef.current && !pickerRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        window.addEventListener("mousedown", handler);
        return () => window.removeEventListener("mousedown", handler);
    }, [anchorRef, onClose, noAutoPosition]);

    const handleSelectType = (typeName: string) => {
        onSelect(typeName);
        onClose();
    };

    return (
        <div
            ref={setRefs}
            className="dropdown-menu show shadow overflow-y-auto"
            data-type-picker="true"
            style={noAutoPosition
                ? { zIndex: 99999, maxHeight: 300 }
                : { position: "fixed", top: pickerPos.top, left: pickerPos.left, zIndex: 99999, maxHeight: 300 }}
        >
            {onRemove && (
                <>
                    <button
                        className="dropdown-item text-danger d-flex align-items-center gap-2"
                        onMouseDown={(e) => { e.preventDefault(); onRemove(); onClose(); }}
                    >
                        <i className="bi bi-trash"></i> Remover
                    </button>
                    <div className="dropdown-divider"></div>
                </>
            )}
            {sortEntityTypesXLast(types).map((t, i) => (
                <button
                    key={i}
                    className="dropdown-item d-flex align-items-center gap-2"
                    onClick={() => {
                        if (!t.subtypes?.length) {
                            handleSelectType(t.name);
                        } else {
                            setSelectedParentType(t);
                            setShowSubtypePicker(true);
                            if (pickerRef.current) {
                                const rect = pickerRef.current.getBoundingClientRect();
                                setSubtypePos({ top: rect.top, left: rect.right });
                            }
                        }
                    }}
                >
                    <span className="badge" style={{ background: t.color, minWidth: 12, minHeight: 12 }}>&nbsp;</span>
                    {t.name}
                    {!!t.subtypes?.length && <i className="bi bi-chevron-right ms-auto" style={{ fontSize: "0.8rem" }} />}
                </button>
            ))}

            {showSubtypePicker && selectedParentType?.subtypes && (
                <div
                    className="dropdown-menu show shadow overflow-y-auto"
                    style={{ position: "fixed", top: subtypePos.top, left: subtypePos.left, zIndex: 99999, maxHeight: 300 }}
                >
                    {selectedParentType.subtypes.map((subtype, idx) => (
                        <button
                            key={idx}
                            className="dropdown-item d-flex align-items-center gap-2"
                            onClick={() => handleSelectType(subtype.name)}
                        >
                            <span className="badge" style={{ background: subtype.color, minWidth: 12, minHeight: 12 }}>&nbsp;</span>
                            {subtype.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});