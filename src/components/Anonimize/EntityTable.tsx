import { useEffect, useMemo, useRef, useState } from "react";
import { MaterialReactTable, MRT_ColumnDef, MRT_ColumnFiltersState, MRT_Row, MRT_TableInstance, } from "material-react-table";
import { MRT_Localization_PT } from "material-react-table/locales/pt";

import { IconButton, Tooltip, TextField, Badge, ToggleButton, ToggleButtonGroup, Menu, MenuItem, Portal } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { UserFile } from "@/core/UserFile";
import { useEntities, useTypes, useTypesDict } from "@/core/uses";
import { Entity, EntityTypeI } from "@/types/EntityType";
import { EntityPool } from "@/types/EntityPool";
import { Button } from "@/core/BootstrapIcons";
import { FULL_ANONIMIZE } from "@/core/anonimizeFunctions";
import { EntitiesStyle } from "@/core/entitiesStyle";
import { sortEntityTypesXLast } from "@/components/Anonimize/Tooltip";
import { TypePickerDropdown } from "@/components/Anonimize/TypePickerDropdown";

const TODAS = Number.MAX_SAFE_INTEGER;

const getType = (types: EntityTypeI[], typeName: string): EntityTypeI => {
    
    let found = types.find(t => t.name === typeName);
    if (found) return found;
    
    for (const type of types) {
        if (type.subtypes) {
            found = type.subtypes.find(s => s.name === typeName);
            if (found) return found;
        }
    }

    return { name: `${typeName}*`, color: "red", functionIndex: FULL_ANONIMIZE } as EntityTypeI;
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
            if (spanOffset >= start && spanOffset <= end && span.hasAttribute("data-anonimize-type")) {
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

export function EntityTable({ file }: { file: UserFile }) {
    const [showOnlyMarks, setShowOnlyMarks] = useState(false);
    const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);

    const ents = useEntities(file.pool);
    const filteredEnts = useMemo(
        () => showOnlyMarks ? ents.filter((e) => e.type === "Marca") : ents,
        [ents, showOnlyMarks]
    );
    const entityCount = filteredEnts.length;
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

    const typesList = useTypes(file);

    const wasEmpty = useRef(true);

    useEffect(() => {
        if (entityCount === 0) {
            wasEmpty.current = true;
        }
        if (wasEmpty.current && entityCount > 0) {
            setPagination(prev => ({ ...prev, pageSize: TODAS }));
            wasEmpty.current = false;
        }
    }, [entityCount]);

    const totalOcc = useMemo(
        () => filteredEnts.reduce((acc, e) => acc + (e.offsets?.length ?? 0), 0),
        [filteredEnts]
    );

    const columns = useMemo<MRT_ColumnDef<Entity>[]>(() => {
        return [
            TYPE_COL(typesList, file.pool, file),
            COUNT_COL(totalOcc),
            ENTITY_COL(file.pool, ents.length),
            ANONIMIZE_COL(file.pool, typesList),
        ];
    }, [typesList, totalOcc, file.pool, ents.length]);

    const handleToggle = (_: React.MouseEvent<HTMLElement>, v: string | null) => {
        setShowOnlyMarks(v === "marcas");
        setColumnFilters([]);
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    };

    return (
        <MaterialReactTable
            key="ent-table"
            columns={columns}
            data={filteredEnts}
            localization={{ ...MRT_Localization_PT, noRecordsToDisplay: "Sem entidades" }}

            enableRowSelection
            enableEditing
            editingMode="cell"
            positionActionsColumn="last"

            enableColumnOrdering={false}
            enableColumnDragging={false}
            enableColumnActions={false}
            enableGlobalFilter

            enableRowVirtualization={false}
            enableColumnResizing
            columnResizeMode="onChange"
            muiTableContainerProps={{
                sx: { maxWidth: "100%", overflowX: "hidden" }
            }}
            muiTableProps={{ sx: { tableLayout: "fixed", width: "100%" } }}
            displayColumnDefOptions={{
                "mrt-row-select": { size: 44, minSize: 44, maxSize: 44, enableResizing: false },
                "mrt-row-expand": { size: 44, minSize: 44, maxSize: 44, enableResizing: false },
                "mrt-row-actions": {
                    size: 96,
                    minSize: 96,
                    maxSize: 120,
                    enableResizing: false,
                    muiTableHeadCellProps: { align: "center" },
                    muiTableBodyCellProps: { align: "center" },
                },
            }}

            muiTableHeadCellProps={{
                sx: {
                    py: 1,
                    px: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                },
            }}
            muiTableBodyCellProps={{ sx: { py: 0.75, px: 1, lineHeight: 1.25 } }}

            getRowId={(r) => r.index.toString()}

            renderDetailPanel={entityDetails(file.pool)}

            renderRowActions={({ row, table }) => (
                <div style={{ display: "flex", gap: 6 }}>
                    <Tooltip title="Ver no documento">
                        <IconButton
                            size="small"
                            onClick={() => {
                                const off = row.original.offsets[0];
                                navigateToEntity(off.start, off.end);
                            }}
                        >
                            <VisibilityIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Separar offset(s)">
                        <span>
                            <IconButton
                                size="small"
                                disabled={row.original.offsets.length <= 1}
                                onClick={() => {
                                    row.original.offsets.forEach((off) => file.pool.splitOffset(off.start, off.end));
                                    file.checkCountPES();
                                }}
                            >
                                <CallSplitIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Tooltip title="Remover entidade">
                        <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                                file.pool.removeEntities([row.index]);
                                table.setRowSelection({});
                                file.checkCountPES();
                            }}
                        >
                            <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </div>
            )}

            renderTopToolbarCustomActions={toolbar(file.pool, file, showOnlyMarks, handleToggle, typesList)}

            enableStickyHeader
            enableHiding
            enablePagination
            enableDensityToggle={false}
            enableFullScreenToggle={false}
            muiTableBodyRowProps={() => ({
                sx: { "&:hover": { backgroundColor: "rgba(244,236,206,.35)" } },
            })}
            muiTablePaginationProps={{
                rowsPerPageOptions: [
                    { label: "25", value: 25 },
                    { label: "50", value: 50 },
                    { label: "100", value: 100 },
                    { label: "Todas", value: TODAS },
                ]
            }}
            initialState={{
                density: "compact",
                sorting: [{ id: "count", desc: true }],
            }}
            state={{
                columnFilters,
                pagination,
            }}
            onColumnFiltersChange={setColumnFilters}
            onPaginationChange={setPagination}
        />
    );
}

const toolbar =
    (pool: EntityPool, file: UserFile, showOnlyMarks: boolean, onToggle: (e: React.MouseEvent<HTMLElement>, v: string | null) => void, typesList: EntityTypeI[]) =>
        ({ table }: { table: MRT_TableInstance<Entity> }) => {
            const selectedCount = Object.keys(table.getState().rowSelection).length;
            const isJoinDisabled = showOnlyMarks || selectedCount <= 1;
            const isSplitDisabled = showOnlyMarks || selectedCount === 0;
            const [showTypePicker, setShowTypePicker] = useState(false);
            const btnRef = useRef<HTMLSpanElement>(null);

            return (
                <div className="d-flex w-100 align-items-center gap-2">
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
                            disabled={selectedCount === 0}
                            onClick={() => removeSelectedEntities(table, pool, file)}

                        />
                    </span>

                    <span ref={btnRef} title="Mudar Tipo" className="d-inline-flex flex-shrink-0 align-middle">
                        <Button
                            i="pencil"
                            text="Mudar Tipo"
                            className="btn btn-secondary my-0 mx-1 p-1"
                            disabled={selectedCount === 0 || showOnlyMarks}
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
    pool.joinEntities(selectedIndexes(table));
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

const entityDetails =
    (pool: EntityPool) =>
        ({ row }: { row: MRT_Row<Entity> }) =>
            row.original.offsets.map((off, i) => (
                <div key={i} className="d-flex align-items-center border-bottom">
                    <span
                        role="button"
                        className="text-end flex-grow-1"
                        onClick={() => navigateToEntity(off.start, off.end)}
                    >
                        {off.preview}
                    </span>
                    <span className="flex-grow-1" />
                    <button
                        className="btn btn-warning m-1 p-1"
                        disabled={row.original.offsets.length <= 1}
                        onClick={() => pool.splitOffset(off.start, off.end)}
                    >
                        <i className="bi bi-exclude"></i> Separar
                    </button>
                    <button className="btn btn-danger m-1 p-1" onClick={() => pool.removeOffset(off.start, off.end)}>
                        <i className="bi bi-trash"></i> Remover
                    </button>
                </div>
            ));

const COUNT_COL = (totalOcc: number): MRT_ColumnDef<Entity> => ({
    id: "count",
    header: `# (${totalOcc})`,
    accessorFn: (e) => e.offsets.length,
    size: 50, minSize: 40, maxSize: 100,
    sortDescFirst: true,
    enableColumnActions: false,
    muiTableHeadCellProps: { align: "right" },
    muiTableBodyCellProps: { align: "right" },
    Cell: ({ cell }) => <strong>{cell.getValue<number>() ?? 0}</strong>,
});

const ENTITY_COL: (pool: EntityPool, count: number) => MRT_ColumnDef<Entity> = (pool, count) => ({
    id: "entity",
    header: `Entidade (${count})`,
    accessorFn: (ent) => ent.offsets[0]?.preview ?? "",
    size: 160, minSize: 100, maxSize: 280,
    enableEditing: false,
    enableColumnFilter: true,
    enableColumnDragging: false,
    enableColumnActions: false,
    muiTableHeadCellProps: { align: "left" },
    muiTableBodyCellProps: ({ row }) => ({
        onClick: () => {
            if (!row.original.offsets.length) return;
            const off = row.original.offsets[0];
            navigateToEntity(off.start, off.end);
        },
        sx: { cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    }),
});

const TYPE_COL: (types: EntityTypeI[], pool: EntityPool, file: UserFile) => MRT_ColumnDef<Entity> = (types, pool, file) => {
    const sortedTypes = sortEntityTypesXLast(types);
    return ({
    id: "type",

    header: "Tipo",
    accessorKey: "type",
    size: 60, minSize: 40, maxSize: 100,
    enableEditing: false,
    enableColumnActions: false,
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
    muiTableHeadCellProps: { align: "left" },
    muiTableBodyCellProps: { align: "left", sx: { px: 1 } },
    Cell: ({ row}) => {
        const [showTypePicker, setShowTypePicker] = useState(false);
        const badgeRef = useRef<HTMLSpanElement>(null);

        const t = getType(types, row.original.type);

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
const ANONIMIZE_COL: (pool: EntityPool, types: EntityTypeI[]) => MRT_ColumnDef<Entity> = (
    pool,
    types,
) => ({
    id: "anon",
    header: "Anonimização",
    accessorFn: (row) => row.overwriteAnonimization || row.anonimizingFunction(getType(types, row.type))(
        row.offsets[0]?.preview,
        row.type,
        row.index,
        row.typeIndex,
        row.funcIndex,
    ),
    size: 160, minSize: 100, maxSize: 280,
    enableColumnActions: false,
    muiTableHeadCellProps: { align: "left" },
    muiTableBodyCellProps: {
        align: "left",
        sx: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    },
    Cell: ({ row }) => {
        const generated = row.original.anonimizingFunction(getType(types, row.original.type))(
            row.original.offsets[0].preview,
            row.original.type,
            row.original.index,
            row.original.typeIndex,
            row.original.funcIndex,
        );
        const value = row.original.overwriteAnonimization || generated;
        const isDefault = !row.original.overwriteAnonimization;

        return (
            <code
                style={{ color: isDefault ? "#6c757d" : "inherit", cursor: "copy" }}
                title="Copiar"
                onClick={() => navigator.clipboard.writeText(value)}
            >
                {value}
            </code>
        );
    },
    muiTableBodyCellEditTextFieldProps: ({ row }) => ({
        placeholder: row.original.anonimizingFunction(getType(types, row.original.type))(
            row.original.offsets[0].preview,
            row.original.type,
            row.original.index,
            row.original.typeIndex,
            row.original.funcIndex,
        ),
        onBlur: (event) => {
            const old = row.original.overwriteAnonimization;
            row.original.overwriteAnonimization = event.target.value;
            if (old !== row.original.overwriteAnonimization) pool.updateOrder("Modificar anonimização de entidade");
        },
    }),
});