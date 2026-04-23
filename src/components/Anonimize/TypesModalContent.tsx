import { AUTO_ANONIMIZE, functionsWithDescriptionArray } from "@/core/anonimizeFunctions";
import { Bicon, Button } from "@/core/BootstrapIcons";
import { useProfile } from "@/core/ProfileTypeLogic";
import { UserFile } from "@/core/UserFile";
import { useTypes } from "@/core/uses";
import { EntityTypeI, EntityTypeIDefaults } from "@/types/EntityType";
import { ProfileI } from "@/types/ProfileType";
import MaterialReactTable, { MRT_ColumnDef } from "material-react-table";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { useState } from "react";
import { sortEntityTypesXLast } from "./Tooltip";

export function TypesModalContent({ file }: { file: UserFile }) {
    let [profile, setProfile] = useProfile();
    let [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const types = sortEntityTypesXLast(useTypes(file));

    return <>
        <div className="modal-header">
            <div><h5 className="modal-title" id="modal-types-label">Gerir tipos de entidades</h5></div>
        </div>
        <div className="modal-body p-0">
            <MaterialReactTable<EntityTypeI>
                key="type-table"
                enableColumnResizing={false}
                enableRowSelection={false}
                enableColumnOrdering={false}
                enableDensityToggle={false}
                enableHiding={false}
                enableStickyHeader={false}
                enablePagination={false}
                enableEditing={true}
                enableColumnFilters={false}
                enableSorting={false}
                enableGlobalFilter={false}
                enableFullScreenToggle={false}
                enableColumnActions={false}
                editingMode="cell"
                enableExpanding={true}
                columns={[TYPE_COLUMN(file, profile, setProfile), ANON_COLUMN(file), EXAMPLE_COLUMN] as MRT_ColumnDef<EntityTypeI>[]}
                data={types}
                localization={MRT_Localization_PT}
                renderTopToolbarCustomActions={() => [
                    <Button key="reset" className="btn btn-warning" i="arrow-clockwise" text="Repor" onClick={() => file.resetTypes()} />
                ]}
                muiTableBodyCellProps={({ table, cell }) => ({
                    onClick: () => { table.setEditingCell(cell); }
                })}
                enableRowActions={true}
                renderRowActions={({ row }) => EntityTypeIDefaults[row.original.name] ? <></> : <Button className="btn text-danger" onClick={() => { file.deleteType(row.original.name) }} i='trash' title="Eliminar" />}
                state={{ expanded: expandedRows }}
                onExpandedChange={(updater) => {
                    const newState = typeof updater === 'function' ? updater(expandedRows) : updater;
                    setExpandedRows(newState as Record<string, boolean>);
                }}
                renderDetailPanel={({ row }) => row.original.subtypes && row.original.subtypes.length > 0 ? (
                    <div className="p-3 bg-light rounded">
                        <h6>Subtipos de {row.original.name}</h6>
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Cor</th>
                                    <th>Anonimização</th>
                                </tr>
                            </thead>
                            <tbody>
                                {row.original.subtypes.map((subtype, idx) => (
                                    <tr key={idx}>
                                        <td><span className="badge" style={{ background: subtype.color }}>{subtype.name}</span></td>
                                        <td><div style={{ width: "30px", height: "30px", background: subtype.color, borderRadius: "4px", border: "1px solid #ccc" }}></div></td>
                                        <td>{functionsWithDescriptionArray[subtype.functionIndex].name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            />
            <form className="d-flex m-2" onSubmit={(evt) => {
                evt.preventDefault();
                let form = evt.target as HTMLFormElement;
                let tipoInput = form.elements.namedItem("tipo") as HTMLInputElement;
                let colorInput = form.elements.namedItem("color") as HTMLInputElement;
                let anonInput = form.elements.namedItem("anonimização") as HTMLSelectElement;
                file.addType(tipoInput.value, colorInput.value, parseInt(anonInput.value));
                tipoInput.value = "";
                colorInput.value = "";
            }}>
                <input className="form-control" name="tipo" placeholder="Tipo..." required></input>
                <input className="form-control form-control-color" name="color" type="color"></input>
                <select className="form-select" name="anonimização" required>{functionsWithDescriptionArray.map((desc, i) => <option key={i} label={desc.name} value={i}>{desc.name}</option>)}</select>
                <button className="form-control btn btn-primary">Adicionar</button>
            </form>
        </div>
        <div className="modal-footer">
            <div className="flex-grow-1"></div>
            <button className="btn btn-secondary" type="button" data-bs-dismiss="modal">Fechar</button>
        </div>
    </>
}

const TYPE_COLUMN: (file: UserFile, profile: ProfileI | null, setProfile: (p: ProfileI) => void) => MRT_ColumnDef<EntityTypeI> = (file, profile, setProfile) => ({
    header: "Tipo",
    Header: <><Bicon n="pencil" /> Tipo</>,
    accessorKey: "color",
    enableEditing: true,
    muiTableBodyCellEditTextFieldProps: ({ row, table }) => ({
        type: "color",
        name: "color",
        onBlur: (evt) => {
            file.updateType(row.original.name, evt.target.value, row.original.functionIndex)
            if (profile) {
                setProfile({ ...profile, defaultEntityTypes: { ...profile.defaultEntityTypes, [row.original.name]: { color: evt.target.value, functionIndex: row.original.functionIndex, subtypes: row.original.subtypes } } });
            }
            table.setEditingCell(null);
        }
    }),
    Cell: ({ row }) => <span className='badge text-body' style={{ background: row.original.color }}>{row.original.name}</span>
})

const ANON_COLUMN: (file: UserFile) => MRT_ColumnDef<EntityTypeI> = (file) => ({
    header: "Anonimização",
    Header: <><Bicon n="pencil" /> Anonimização</>,
    accessorFn: (ent) => functionsWithDescriptionArray[ent.functionIndex]?.name ?? functionsWithDescriptionArray[AUTO_ANONIMIZE].name,
    enableEditing: true,
    muiTableBodyCellEditTextFieldProps: ({ row, table }) => ({
        select: true,
        children: functionsWithDescriptionArray.map((desc, i) => <option key={i} label={desc.name} value={i}>{desc.name}</option>),
        SelectProps: {
            native: true,
            value: row.original.functionIndex
        },
        onChange: (evt) => file.updateType(row.original.name, row.original.color, parseInt(evt.target.value))
    })
})

const EXAMPLE_COLUMN: MRT_ColumnDef<EntityTypeI> = {
    header: "Descrição Anonimização",
    accessorFn: (row) => functionsWithDescriptionArray[row.functionIndex]?.description ?? functionsWithDescriptionArray[AUTO_ANONIMIZE].description,
    enableEditing: false,
    muiTableBodyCellProps: {
        className: "text-nowrap"
    }
}