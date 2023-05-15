import { EntityPool } from "../../types/EntityPool"
import { Button } from "../../util/BootstrapIcons"
import MaterialReactTable, { MRT_ColumnDef, MRT_Row, MRT_TableInstance } from "material-react-table";
import { Entity } from "../../types/Entity";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { getEntityType, getEntityTypes } from "../../types/EntityTypes";
import { useEffect, useState } from "react";


export function EntityTable({pool}: {pool: EntityPool}){
    const ents = pool.useEntities()();
    
    return <MaterialReactTable
            key="ent-table"
            enableRowSelection
            enableColumnOrdering
                enableEditing
                positionActionsColumn="last"
                editingMode="cell"
                enableDensityToggle={false}
                enableHiding={true}
                enableStickyHeader
                enablePagination={false}
                enableFullScreenToggle={false}
                renderDetailPanel={entityDetails(pool)}
                renderTopToolbarCustomActions={({table}) => {
                    let selectedeKeys = selectedIndexes(table).length
                    return <div className="d-flex w-100"> 
                        <Button i="union" text="Juntar" className="btn btn-primary" disabled={selectedeKeys <= 1} onClick={() => joinSelectedEntities(table, pool)} />
                        <Button i="exclude" text="Separar" className="btn btn-warning mx-2" disabled={selectedeKeys === 0} onClick={() => splitSelectedEntities(table, pool)} />
                        <Button i="trash" text="Remover" className="btn btn-danger" disabled={selectedeKeys === 0} onClick={() => removeSelectedEntities(table, pool)} />
                    </div>
                }}
                muiTableBodyCellProps={{style: {
                    whiteSpace: "normal",
                    wordWrap:"break-word" 
                }}}
                muiTableHeadCellProps={{
                    style: {
                        borderBottom: "5px solid #161616"
                    }
                }}
                positionToolbarAlertBanner="bottom"
                initialState={{
                    density: 'compact'
                }}
                columns={[HEADER,ENTITY,TYPE(pool),ANONIMIZE(pool)]} 
                data={ents}
                localization={{...MRT_Localization_PT, noRecordsToDisplay: "Sem ocurrências de entidades"}}/>
}

const entityDetails = (pool: EntityPool) => ({row}:{row: MRT_Row<Entity>}) => row.original.offsets.map((off,i) => <div key={i} className="d-flex align-items-center border-bottom">
    <span role="button" className="text-end flex-grow-1" onClick={() => document.querySelector(`[data-offset="${off.start}"]`)?.scrollIntoView({block: "center"})}>{off.preview}</span>
    <span className="flex-grow-1"></span>
    <button className="btn btn-warning m-1 p-1" disabled={row.original.offsets.length <= 1} onClick={() => pool.splitOffset(off.start, off.end)}><i className="bi bi-exclude"></i> Separar</button>
    <button role="button" className="btn btn-danger m-1 p-1" onClick={() => pool.removeOffset(off.start, off.end)}><i className="bi bi-trash"></i> Remover</button>
</div>)

const selectedIndexes = (table: MRT_TableInstance<Entity>) => Object.keys(table.getState().rowSelection).map(k => parseInt(k)).filter(k => !isNaN(k));

const removeTableSelection = (table: MRT_TableInstance<Entity>) => table.setRowSelection({})

const joinSelectedEntities = (table: MRT_TableInstance<Entity>, pool: EntityPool) => {
    pool.joinEntities(selectedIndexes(table))
    removeTableSelection(table);
}
const splitSelectedEntities = (table: MRT_TableInstance<Entity>, pool: EntityPool) => {
    pool.splitEntities(selectedIndexes(table))
    removeTableSelection(table)
}

const removeSelectedEntities = (table: MRT_TableInstance<Entity>, pool: EntityPool) => {
    pool.removeEntities(selectedIndexes(table));
    removeTableSelection(table)
}


const HEADER: MRT_ColumnDef<Entity> = {
    header: "#",
    accessorKey: "offsetsLength",
    enableColumnFilter: false,
    enableColumnDragging: false,
    enableColumnActions: false,
    enableEditing: false,
    size: 40
}

const ENTITY: MRT_ColumnDef<Entity> = {
    header: "Entidade", 
    accessorFn: (ent) => ent.offsets[0].preview,
    enableEditing: false,
    size: 60,
    muiTableBodyCellProps: ({row}) => ({
        onClick: async () => {
            if( row.original.offsets.length === 0 ) return;
            let off = row.original.offsets[0];

            let elm = document.querySelector(`[data-offset="${off.start}"]`);
            if( elm ){
                elm.scrollIntoView({ block: "center" });
            }
        }
    })
}

const TYPE: (pool: EntityPool) => MRT_ColumnDef<Entity> = (pool) => ({
    header: "Tipo",
    accessorKey: "type",
    size: 40,
    Cell: ({row, cell, table}) => {
        let color = getEntityType(row.original.type);
        return <span className='badge text-body' onClick={() => table.setEditingCell(cell)} style={{background: color.color}}>{color.name}</span>
    },
    muiTableBodyCellEditTextFieldProps: ({row}) => ({
        select: true,
        children: getEntityTypes().map( t => <option key={t.name} label={t.name} value={t.name}>{t.name}</option>),
        SelectProps: {
            native: true
        },
        onChange: (event) => {
            let o = row.original.type;
            row.original.type = event.target.value;
            if( o !== row.original.type ) pool.notify("Modificar tipo");
        }
    })
})


const ANONIMIZE: (pool: EntityPool) => MRT_ColumnDef<Entity> = (pool) => ({
    header: "Anonimização",
    accessorKey: "overwriteAnonimization",
    enableColumnFilter: false,
    enableColumnDragging: false,
    enableColumnActions: false,
    size: 40,
    Cell: ({row}) => row.original.overwriteAnonimization ? row.original.overwriteAnonimization : <span className="text-muted">{row.original.anonimizingFunction()(row.original.offsets[0].preview, row.original.type, row.original.index, row.original.typeIndex, row.original.funcIndex)}</span>,
    muiTableBodyCellProps: ({cell, table}) => ({
        onClick: () => table.setEditingCell(cell)
    }),
    muiTableBodyCellEditTextFieldProps: ({row}) => ({
        placeholder: row.original.anonimizingFunction()(row.original.offsets[0].preview, row.original.type, row.original.index, row.original.typeIndex, row.original.funcIndex),
        onBlur: (event) => {
            let o = row.original.overwriteAnonimization;
            row.original.overwriteAnonimization = event.target.value;
            if( o !== row.original.overwriteAnonimization ) pool.updateOrder("Modificar anonimização de entidade");
        }
    })
})
