import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
    MaterialReactTable,
    MRT_ColumnDef,
    MRT_ColumnFiltersState,
    MRT_TableInstance,
    useMaterialReactTable,
} from "material-react-table";
import { MRT_Localization_PT } from "material-react-table/locales/pt";

import {TextField, Badge, ToggleButton, ToggleButtonGroup, Portal} from "@mui/material";
import { UserFile } from "@/core/UserFile";
import { useTypes } from "@/hooks";
import { Entity, EntityTypeI, OffsetRange, SpecificOffsetRange, DUMMY_ENTITY_TYPE } from "@/types/EntityType";
import { EntityPool } from "@/types/EntityPool";
import { Button } from "@/core/BootstrapIcons";
import { sortEntityTypesXLast } from "@/components/Anonimize/Tooltip";
import { TypePickerDropdown } from "@/components/Anonimize/TypePickerDropdown";

const getType = (types: EntityTypeI[], typeName: string): EntityTypeI => {
    let found = types.find(t => t.name === typeName);
    if (found) return found;

    for (const type of types) {
        if (type.subtypes) {
            found = type.subtypes.find(s => s.name === typeName);
            if (found) return found;
        }
    }

    return DUMMY_ENTITY_TYPE;
};

const navigateToEntity = (start: number, end: number) => {
    const elm = document.querySelector<HTMLElement>(`[data-offset="${start}"]`);
    if (!elm) return;

    elm.scrollIntoView({ block: "center", behavior: "smooth" });

    let highlighted = false;
    const applyHighlight = () => {
        if (highlighted) return;
        highlighted = true;
        document.querySelectorAll<HTMLElement>(`[data-offset]`).forEach((span) => {
            const spanOffset = parseInt(span.getAttribute("data-offset") || "0");
            if (spanOffset >= start && spanOffset <= end) {
                span.classList.add("entity-highlight");
                setTimeout(() => span.classList.remove("entity-highlight"), 1500);
            }
        });
    };

    const observer = new IntersectionObserver(
        (entries, obs) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                obs.disconnect();
                applyHighlight();
            }
        },
        { threshold: 0.5 },
    );
    observer.observe(elm);

    setTimeout(() => {
        observer.disconnect();
        applyHighlight();
    }, 1000);
};

interface EntityTableMeta {
    totalOccurrences: number;
    totalEntities: number;
}

function getTableMeta(table: MRT_TableInstance<Entity>): EntityTableMeta {
    return table.options.meta as EntityTableMeta;
}

interface EntityTableProps {
    file: UserFile
    entities: Entity[]
    searchResults: SpecificOffsetRange[]
    applyGlobalFilter: (query: string) => void
}

export function EntityTable({
    file,
    entities,
    searchResults,
    applyGlobalFilter
}: EntityTableProps) {
    const [showOnlyMarks, setShowOnlyMarks] = useState(false);
    const [globalFilter,  setGlobalFilter]  = useState<string | undefined>(undefined);
    const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);

    useEffect(() => {
        // Debounce search queries by 350ms.
        const timer = setTimeout(() => applyGlobalFilter(globalFilter ?? ""), 350);
        return () => clearTimeout(timer);
    }, [applyGlobalFilter, globalFilter]);

    const xEntities = useMemo(() => {
        return showOnlyMarks ? entities.filter((e) => e.type === "Marca") : entities;
    }, [entities, showOnlyMarks]);

    const data = useMemo(() => {
        // Make sure each entity has a different row id.
        const nextIndex = file.pool.entities.length + 1;
        const searchEntities = searchResults.map(result => result.ent);
        searchEntities.forEach((ent, idx) => ent.index = nextIndex + idx);
        return [...xEntities, ...searchEntities];
    }, [file.pool.entities.length, xEntities, searchResults]);

    const typesList = useTypes(file);

    const totalOccurrences = useMemo(() => data.reduce((acc, e) => acc + (e.offsets?.length ?? 0), 0), [data]);

    const columns = useMemo<MRT_ColumnDef<Entity>[]>(() => {
        return [
            TYPE_COL(typesList, file.pool, file),
            COUNT_COL(),
            ENTITY_COL(),
            ANONIMIZE_COL(file.pool, typesList),
        ];
    }, [typesList, file.pool]);

    const handleToggle = useCallback((_: React.MouseEvent<HTMLElement>, v: string | null) => {
        setShowOnlyMarks(v === "marcas");
        setColumnFilters([]);
    }, []);

    const table = useMaterialReactTable({
        columns,
        data,
        localization: { ...MRT_Localization_PT, noRecordsToDisplay: "Sem entidades" },

        // Row selection and column options.
        enableRowSelection: true,
        enableColumnOrdering: false,
        enableColumnDragging: false,
        enableColumnActions: false,

        // Other options.
        enableStickyHeader: true,
        enableHiding: true,
        enableDensityToggle: false,
        enableFullScreenToggle: false,

        // -- Enable column resizing.
        enableColumnResizing: true,
        columnResizeMode: "onChange",

        // -- Enable row virtualization (load rows dynamically).
        enableRowVirtualization: true,
        enablePagination: false,
        rowVirtualizerOptions: { overscan: 25 },

        // -- Allow to overwrite the anonymization value.
        editDisplayMode: "cell",
        enableEditing: true,

        // -- Customization options.
        muiTopToolbarProps: {
            sx: {
                display: "flex",
                minHeight: "unset",
                height: "auto",
                overflow: "visible",
                "& > div": {
                    flexWrap: "wrap",
                }
            }
        },
        muiTableProps: { sx: { tableLayout: "fixed", width: "100%" } },
        muiTablePaperProps: {
            sx: {
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }
        },
        muiTableBodyRowProps: () => ({
            sx: { "&:hover": { backgroundColor: "rgba(244,236,206,.35)" } },
        }),

        displayColumnDefOptions: {
            "mrt-row-select": { size: 42, minSize: 42, maxSize: 42 },
            "mrt-row-expand": { size: 42, minSize: 42, maxSize: 42 },
        },

        renderDetailPanel: ({ row }) => !row.original.type ? null : (
            <div className="d-flex flex-column vw-100">
                {row.original.offsets.map((off, i) => (
                    <div key={i} className="d-flex align-items-center border-bottom">
                <span
                    role="button"
                    className="text-center flex-grow-1"
                    onClick={() => navigateToEntity(off.start, off.end)}
                >
                    {off.preview}
                </span>
                        <button
                            className="btn btn-warning m-1 p-1"
                            disabled={row.original.offsets.length <= 1}
                            onClick={() => file.pool.splitOffset(off.start, off.end)}
                        >
                            <i className="bi bi-exclude"/> Separar
                        </button>
                        <button className="btn btn-danger m-1 p-1"
                                onClick={() => file.pool.removeOffset(off.start, off.end)}>
                            <i className="bi bi-trash"/> Remover
                        </button>
                    </div>
                ))}
            </div>
        ),
        renderTopToolbarCustomActions: toolbar(file.pool, file, showOnlyMarks, handleToggle, typesList),
        positionToolbarAlertBanner: "bottom",

        // -- Disable client-side global filtering.
        filterFns: { "noOp": () => true },
        globalFilterFn: "noOp",
        enableGlobalFilterRankedResults: false,
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,

        state: { columnFilters, globalFilter },
        initialState: { density: "compact", sorting: [{ id: "count", desc: true }] },

        // -- Metadata can be accessed by columns without recreating them.
        meta: { totalOccurrences, totalEntities: data.length } as EntityTableMeta,

        getRowId: (r) => r.index.toString(),
    });

    useEffect(() => {
        table.resetRowSelection()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    return <MaterialReactTable key="ent-table" table={table} />;
}

const toolbar =
    (pool: EntityPool, file: UserFile, showOnlyMarks: boolean, onToggle: (e: React.MouseEvent<HTMLElement>, v: string | null) => void, typesList: EntityTypeI[]) =>
        ({ table }: { table: MRT_TableInstance<Entity> }) => {
            const selectedCount = Object.keys(table.getState().rowSelection).length;
            const hasDummyEntities = Boolean(Object.keys(table.getState().rowSelection).find(value => !table.getRow(value).original.type));
            const isJoinDisabled = showOnlyMarks || (selectedCount <= 1 && !hasDummyEntities);
            const isSplitDisabled = showOnlyMarks || selectedCount === 0 || hasDummyEntities;
            const isRemoveDisabled = selectedCount === 0 || hasDummyEntities;
            const isChangeTypeDisabled = showOnlyMarks || selectedCount === 0 || hasDummyEntities;
            const [showTypePicker, setShowTypePicker] = useState(false);
            const btnRef = useRef<HTMLSpanElement>(null);

            return (
                <div className="d-flex w-100 align-items-center gap-2 order-1">
                    <span title="Juntar" className="d-inline-flex flex-shrink-0 align-middle">
                        <Badge badgeContent={selectedCount} color={selectedCount ? "primary" : "default"}>
                            <Button
                                i="union"
                                text="Juntar"
                                className="btn btn-primary my-0 mx-1 p-1"
                                disabled={isJoinDisabled}
                                onClick={() => {
                                    if (!isJoinDisabled) joinSelectedEntities(table, pool, file);
                                }}
                            />
                        </Badge>
                    </span>

                    <span title="Separar" className="d-inline-flex flex-shrink-0 align-middle">
                        <Button
                            i="exclude"
                            text="Separar"
                            className="btn btn-warning my-0 mx-1 p-1"
                            disabled={isSplitDisabled}
                            onClick={() => {
                                if (!isSplitDisabled) splitSelectedEntities(table, pool, file);
                            }}
                        />
                    </span>

                    <span title="Remover" className="d-inline-flex flex-shrink-0 align-middle">
                        <Button
                            i="trash"
                            text="Remover"
                            className="btn btn-danger my-0 mx-1 p-1"
                            disabled={isRemoveDisabled}
                            onClick={() => removeSelectedEntities(table, pool, file)}

                        />
                    </span>

                    <span ref={btnRef} title="Mudar Tipo" className="d-inline-flex flex-shrink-0 align-middle">
                        <Button
                            i="pencil"
                            text="Mudar Tipo"
                            className="btn btn-secondary my-0 mx-1 p-1"
                            disabled={isChangeTypeDisabled}
                            onClick={() => {
                                setShowTypePicker(v => !v);
                            }}
                        />
                        {showTypePicker && (
                            <Portal>
                                <TypePickerDropdown
                                    types={typesList}
                                    anchorRef={btnRef}
                                    onSelect={(newType) => {
                                        changeSelectedEntitiesType(table, pool, file, newType);
                                    }}
                                    onClose={() => setShowTypePicker(false)}
                                />
                            </Portal>
                        )}
                    </span>

                    <div className="flex-grow-1" />

                    <ToggleButtonGroup
                        size="small"
                        value={showOnlyMarks ? "marcas" : "todas"}
                        exclusive
                        onChange={onToggle}
                    >
                        <ToggleButton value="todas">Todas</ToggleButton>
                        <ToggleButton value="marcas">Marcas</ToggleButton>
                    </ToggleButtonGroup>
                </div>
            );
        };

const selectedIndexes = (table: MRT_TableInstance<Entity>) =>
    Object.keys(table.getState().rowSelection)
        .map((k) => parseInt(k, 10) - 1)
        .filter((k) => !isNaN(k));

const removeTableSelection = (table: MRT_TableInstance<Entity>) => table.setRowSelection({});

const joinSelectedEntities = (table: MRT_TableInstance<Entity>, pool: EntityPool, file: UserFile) => {
    const indexes: number[] = [];
    const extraOffsets: OffsetRange[] = [];

    for (const rowId of Object.keys(table.getState().rowSelection)) {
        const entity = table.getRow(rowId).original;

        if (!entity.type) {
            extraOffsets.push(...entity.offsets);
            continue;
        }

        const index = parseInt(rowId, 10) - 1;

        if (!isNaN(index)) {
            indexes.push(index);
        }
    }

    pool.joinEntities(indexes, extraOffsets);
    removeTableSelection(table);
    file.checkCountPES();
};

const splitSelectedEntities = (table: MRT_TableInstance<Entity>, pool: EntityPool, file: UserFile) => {
    pool.splitEntities(selectedIndexes(table));
    removeTableSelection(table);
    file.checkCountPES();
};

const changeSelectedEntitiesType = (table: MRT_TableInstance<Entity>, pool: EntityPool, file: UserFile, newType: string) => {
    pool.changeEntitiesType(selectedIndexes(table), newType);
    removeTableSelection(table);
    file.checkCountPES();
}


const removeSelectedEntities = (table: MRT_TableInstance<Entity>, pool: EntityPool, file: UserFile) => {
    pool.removeEntities(selectedIndexes(table));
    removeTableSelection(table);
    file.checkCountPES();
};

const TYPE_COL = (types: EntityTypeI[], pool: EntityPool, file: UserFile): MRT_ColumnDef<Entity> => {
    const sortedTypes = sortEntityTypesXLast(types);
    return ({
        id: "type",
        header: "Tipo",
        accessorKey: "type",
        size: 60, minSize: 40, maxSize: 100,
        enableEditing: false,
        filterFn: (row, _columnId, filterValue) => {
            if (filterValue === "__ONLY_X__") return row.original.type.startsWith("X-");
            if (filterValue === "__NO_X__") return !row.original.type.startsWith("X-");
            const parentType = sortedTypes.find(t => t.name === filterValue);
            if (parentType?.subtypes?.length) {
                return row.original.type === filterValue ||
                    parentType.subtypes.some(s => s.name === row.original.type);
            }
            return row.original.type === filterValue;
        },
        Filter: ({ column }) => {
            const [open, setOpen] = useState(false);
            const btnRef = useRef<HTMLDivElement>(null);
            const filterValue = column.getFilterValue() as string ?? "";

            const displayLabel = filterValue === "__NO_X__" ? "Entidades Normais"
                : filterValue === "__ONLY_X__" ? "Entidades X"
                    : filterValue || "";

            const handleFilterSelect = (value: string) => {
                column.setFilterValue(value || undefined);
                setOpen(false);
            };

            return (
                <>
                    <div ref={btnRef} onClick={() => setOpen(v => !v)}>
                        <TextField
                            size="small"
                            variant="standard"
                            value={displayLabel}
                            placeholder="Filtrar"
                            InputProps={{ readOnly: true, style: { cursor: "pointer", fontSize: "0.85rem" } }}
                            fullWidth
                        />
                    </div>
                    {open && (
                        <Portal>
                            <TypePickerDropdown
                                types={sortedTypes}
                                anchorRef={btnRef}
                                onSelect={handleFilterSelect}
                                onClose={() => setOpen(false)}
                                extraItems={
                                    <>
                                        <button className="dropdown-item" onClick={() => handleFilterSelect("")}>
                                            <em>Todos</em>
                                        </button>
                                        <button className="dropdown-item" onClick={() => handleFilterSelect("__NO_X__")}>
                                            Entidades Normais
                                        </button>
                                        <button className="dropdown-item" onClick={() => handleFilterSelect("__ONLY_X__")}>
                                            Entidades X
                                        </button>
                                        <div className="dropdown-divider" />
                                    </>
                                }
                            />
                        </Portal>
                    )}
                </>
            );
        },
        Cell: ({ row }) => {
            const [showTypePicker, setShowTypePicker] = useState(false);
            const badgeRef = useRef<HTMLSpanElement>(null);

            const t = getType(types, row.original.type);

            if (t === DUMMY_ENTITY_TYPE) {
                return <span>{t.name}</span>;
            }

            const handleClick = (evt: React.MouseEvent<HTMLSpanElement>) => {
                evt.stopPropagation();
                setShowTypePicker(v => !v);
            };

            const handleSelectType = (newType: string) => {
                pool.changeEntitiesType([row.original.index - 1], newType);
                file.checkCountPES();
            };

            return (
                <>
                    <span
                        ref={badgeRef}
                        className="badge text-body"
                        title="Alterar tipo de todas as ocorrências"
                        style={{ background: t.color, cursor: "pointer" }}
                        onClick={handleClick}
                    >
                        {t.name}
                    </span>
                    {showTypePicker && (
                        <Portal>
                            <TypePickerDropdown
                                types={types}
                                anchorRef={badgeRef}
                                onSelect={handleSelectType}
                                onClose={() => setShowTypePicker(false)}
                            />
                        </Portal>
                    )}
                </>
            );
        },
    });
};

const COUNT_COL = (): MRT_ColumnDef<Entity> => ({
    id: "count",
    header: "Ocorrências",
    size: 100, minSize: 40, maxSize: 120,
    sortDescFirst: true,
    enableEditing: false,
    muiTableHeadCellProps: { align: "right" },
    muiTableBodyCellProps: { align: "right" },
    accessorFn: (e) => e.offsets.length,
    Header: ({ table }) => `# (${getTableMeta(table).totalOccurrences})`,
    Cell: ({ cell }) => <strong>{cell.getValue<number>() ?? 0}</strong>,
});

const ENTITY_COL = (): MRT_ColumnDef<Entity> => ({
    id: "entity",
    header: `Entidades`,
    grow: true,
    enableEditing: false,
    accessorFn: (ent) => ent.offsets[0]?.preview,
    Header: ({ table }) => `Entidade (${getTableMeta(table).totalEntities})`,
    muiTableBodyCellProps: ({ row }) => ({
        onClick: () => {
            if (!row.original.offsets.length) return;
            const off = row.original.offsets[0];
            navigateToEntity(off.start, off.end);
        },
        sx: { cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    }),
});

const ANONIMIZE_COL = (pool: EntityPool, types: EntityTypeI[]): MRT_ColumnDef<Entity> => ({
    id: "anon",
    header: "Anonimização",
    grow: true,
    muiTableBodyCellProps: { sx: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
    enableEditing: (row) => !!row.original.type,
    accessorFn: (entity) => {
        if (entity.type) {
            return entity.overwriteAnonimization || entity.anonimizingFunction(getType(types, entity.type))(
                entity.offsets[0]?.preview,
                entity.type,
                entity.index,
                entity.typeIndex,
            );
        }
    },
    Cell: ({ cell, row }) => {
        const isCustom = row.original.overwriteAnonimization;

        return <code style={{ color: isCustom ? "inherit" : "#6c757d" }}>{cell.getValue<string>()}</code>;
    },
    muiEditTextFieldProps: ({ row }) => ({
        onBlur: (event) => {
            const value = event.target.value;
            if (row.original.overwriteAnonimization !== value) {
                row.original.overwriteAnonimization = value;
                pool.updateOrder("Modificar anonimização de entidade");
            }
        }
    }),
});