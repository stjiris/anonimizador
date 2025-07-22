import { EntityPool } from "../../types/EntityPool"
import { Button } from "../../util/BootstrapIcons"
import MaterialReactTable, { MRT_ColumnDef, MRT_Row, MRT_TableInstance } from "material-react-table";
import { Entity } from "../../types/Entity";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { UserFile } from "../../types/UserFile";
import { EntityTypeI } from "../../types/EntityTypes";
import { FULL_ANONIMIZE } from "../../util/anonimizeFunctions";
import { useEntities, useTypesDict } from "../../util/uses";
import { useMemo, useState } from "react";


export function EntityTable({ file }: { file: UserFile }) {
    const [showOnlyMarks, setShowOnlyMarks] = useState(false);

    const ents = useEntities(file.pool);
    const filteredEnts = showOnlyMarks
    ? ents.filter(e => e.type === "Marca")
    : ents;
    const types = useTypesDict(file);

    const typesList = useMemo(() => Object.values(types), [types]);
    const columns = useMemo(() => [
        TYPE(file.pool, typesList), 
        HEADER(file.pool), 
        ENTITY(file.pool), 
        ANONIMIZE(file.pool, types)
    ], [file.pool, types, typesList]);
    
    return <MaterialReactTable
        key="ent-table"
        enableRowSelection
        enableColumnOrdering
        enableEditing
        positionActionsColumn="last"
        editingMode="cell"
        enableDensityToggle={false}
        enableHiding
        enableStickyHeader
        enablePagination={false}
        enableFullScreenToggle={false}
        renderDetailPanel={entityDetails(file.pool)}
        renderTopToolbarCustomActions={toolbar(file.pool, file, showOnlyMarks, setShowOnlyMarks)}
        muiTableBodyCellProps={{
            sx: {
                whiteSpace: 'normal',
                wordWrap: 'break-word',
                lineHeight: '1.2',
                padding: '8px'
            }
        }}
        muiTableHeadCellProps={{
            sx: {
                borderBottom: '5px solid #161616',
                padding: '8px',
                fontSize: '0.875rem'
            }
        }}
        muiTablePaperProps={{
            sx: {
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column'
            }
        }}
        positionToolbarAlertBanner="bottom"
        initialState={{
            density: 'compact',
            columnPinning: { right: ['mrt-row-actions'] }
        }}
        columns={columns}
        data={filteredEnts}
        localization={{ 
            ...MRT_Localization_PT, 
            noRecordsToDisplay: "Sem entidades" 
        }} />;
}

const toolbar = ( pool: EntityPool, file: UserFile, showOnlyMarks: boolean, setShowOnlyMarks: (v: boolean) => void ) => ({ table }: { table: MRT_TableInstance<Entity> }) => {
    let selectedeKeys = selectedIndexes(table).length;

    const isJoinDisabled = showOnlyMarks || selectedeKeys <= 1;
    const isSplitDisabled = showOnlyMarks || selectedeKeys === 0;

    return <div className="d-flex w-100">
        <Button i="union" text="Juntar" className="btn btn-primary my-0 mx-1 p-1" disabled={isJoinDisabled} onClick={() => { if (!isJoinDisabled) joinSelectedEntities(table, pool, file); }} />
        <Button i="exclude" text="Separar" className="btn btn-warning my-0 mx-1 p-1" disabled={isSplitDisabled} onClick={() => { if (!isSplitDisabled) splitSelectedEntities(table, pool, file); }} />
        <Button i="trash" text="Remover" className="btn btn-danger my-0 mx-1 p-1" disabled={selectedeKeys === 0} onClick={() => removeSelectedEntities(table, pool, file)} />
        <Button i="tag" text={showOnlyMarks ? "Todas" : "Marcas"} className="btn btn-secondary my-0 mx-1 p-1" onClick={() => setShowOnlyMarks(!showOnlyMarks)} />
    </div>
}

const entityDetails = (pool: EntityPool) => ({ row }: { row: MRT_Row<Entity> }) => row.original.offsets.map((off, i) => <div key={i} className="d-flex align-items-center border-bottom">
    <span role="button" className="text-end flex-grow-1" onClick={() => document.querySelector(`[data-offset="${off.start}"]`)?.scrollIntoView({ block: "center" })}>{off.preview}</span>
    <span className="flex-grow-1"></span>
    <button className="btn btn-warning m-1 p-1" disabled={row.original.offsets.length <= 1} onClick={() => pool.splitOffset(off.start, off.end)}><i className="bi bi-exclude"></i> Separar</button>
    <button className="btn btn-danger m-1 p-1" onClick={() => pool.removeOffset(off.start, off.end)}><i className="bi bi-trash"></i> Remover</button>
</div>)

const selectedIndexes = (table: MRT_TableInstance<Entity>) => Object.keys(table.getState().rowSelection).map(k => parseInt(k)).filter(k => !isNaN(k));

const removeTableSelection = (table: MRT_TableInstance<Entity>) => table.setRowSelection({})

const joinSelectedEntities = (table: MRT_TableInstance<Entity>, pool: EntityPool, file: UserFile) => {
    pool.joinEntities(selectedIndexes(table));
    removeTableSelection(table);
    file.checkCountPES();
}
const splitSelectedEntities = (table: MRT_TableInstance<Entity>, pool: EntityPool, file: UserFile) => {
    pool.splitEntities(selectedIndexes(table));
    removeTableSelection(table);
    file.checkCountPES();
}

const removeSelectedEntities = (table: MRT_TableInstance<Entity>, pool: EntityPool, file: UserFile) => {
    pool.removeEntities(selectedIndexes(table));
    removeTableSelection(table);
    file.checkCountPES();
}


const HEADER: (pool: EntityPool) => MRT_ColumnDef<Entity> = pool => ({
    header: `# (${pool.entities.reduce((acc, c) => acc + c.offsets.length, 0)})`,
    accessorKey: "offsetsLength",
    enableColumnFilter: false,
    enableColumnDragging: false,
    enableColumnActions: false,
    enableEditing: false,
    size: 40
})

const ENTITY: (pool: EntityPool) => MRT_ColumnDef<Entity> = (pool) => ({
    header: `Entidade (${pool.entities.length})`,
    accessorFn: (ent) => ent.offsets[0].preview,
    enableEditing: false,
    size: 60,
    muiTableBodyCellProps: ({ row }) => ({
        onClick: async () => {
            if (row.original.offsets.length === 0) return;
            let off = row.original.offsets[0];
            let elm = document.querySelector(`[data-offset="${off.start}"]`);
            if (elm) {
                elm.scrollIntoView({ block: "center" });
            }
        }
    }),
    enableColumnFilter: true,
    enableColumnDragging: false,
    enableColumnActions: false,
})

const TYPE: (pool: EntityPool, types: EntityTypeI[]) => MRT_ColumnDef<Entity> = (pool, types) => ({
    header: "Tipo",
    accessorKey: "type",
    size: 40,
    Cell: ({ row, cell, table }) => {
        let color = types.find(t => t.name === row.original.type) || { name: `${row.original.type}*`, color: "red", functionIndex: FULL_ANONIMIZE };
        return <span className='badge text-body' onClick={() => table.setEditingCell(cell)} style={{ background: color.color }}>{color.name}</span>
    },
    muiTableBodyCellEditTextFieldProps: ({ row }) => ({
        select: true,
        children: types.map(t => <option key={t.name} label={t.name} value={t.name}>{t.name}</option>),
        SelectProps: {
            native: true
        },
        onChange: (event) => {
            let o = row.original.type;
            row.original.type = event.target.value;
            if (o !== row.original.type) pool.notify("Modificar tipo");
        }
    }),
    enableColumnFilter: true,
    enableColumnDragging: false,
    enableColumnActions: false,
    enableEditing: false
})


const ANONIMIZE: (pool: EntityPool, types: Record<string, EntityTypeI>) => MRT_ColumnDef<Entity> = (pool, types) => ({
    header: "Anonimização",
    accessorKey: "overwriteAnonimization",
    enableColumnFilter: false,
    enableColumnDragging: false,
    enableColumnActions: false,
    size: 40,
    Cell: ({ row }) => row.original.overwriteAnonimization ? row.original.overwriteAnonimization : <span className="text-muted">{row.original.anonimizingFunction(types[row.original.type])(row.original.offsets[0].preview, row.original.type, row.original.index, row.original.typeIndex, row.original.funcIndex)}</span>,
    muiTableBodyCellProps: ({ cell, table }) => ({
        onClick: () => table.setEditingCell(cell)
    }),
    muiTableBodyCellEditTextFieldProps: ({ row }) => ({
        placeholder: row.original.anonimizingFunction(types[row.original.type])(row.original.offsets[0].preview, row.original.type, row.original.index, row.original.typeIndex, row.original.funcIndex),
        onBlur: (event) => {
            let o = row.original.overwriteAnonimization;
            row.original.overwriteAnonimization = event.target.value;
            if (o !== row.original.overwriteAnonimization) pool.updateOrder("Modificar anonimização de entidade");
        }
    })
})
