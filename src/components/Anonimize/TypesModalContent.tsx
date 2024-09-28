import { UserFile } from "../../types/UserFile";
import MaterialReactTable, { MRT_ColumnDef } from "material-react-table";
import { functionsWithDescriptionArray } from "../../util/anonimizeFunctions";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { EntityTypeIDefaults, EntityTypeI } from "../../types/EntityTypes";
import { Bicon, Button } from "../../util/BootstrapIcons";
import { useTypes } from "../../util/uses";
import { ProfileI, useProfile } from "../../types/Profile";

export function TypesModalContent({file}:{file: UserFile}){
    let types = useTypes(file);
    let [profile, setProfile] = useProfile();
    return <>
        <div className="modal-header">
            <div><h5 className="modal-title" id="modal-types-label">Gerir tipos de entidades</h5></div>
        </div>
        <div className="modal-body p-0">
            <MaterialReactTable
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
                    columns={[TYPE_COLUMN(file, profile, setProfile),ANON_COLUMN(file),EXAMPLE_COLUMN]} 
                    data={types}
                    localization={MRT_Localization_PT}
                    renderTopToolbarCustomActions={() => [
                        <Button key="reset" className="btn btn-warning" i="arrow-clockwise" text="Repor" onClick={() => file.resetTypes()}/>
                    ]}
                    muiTableBodyCellProps={({table, cell}) => ({
                        onClick: () => {table.setEditingCell(cell);}
                    })}
                    enableRowActions={true}
                    renderRowActions={({row}) => EntityTypeIDefaults[row.original.name] ? <></> : <Button className="btn text-danger" onClick={() => {file.deleteType(row.original.name)}} i='trash' title="Eliminar"/>}
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
                <input  className="form-control form-control-color" name="color" type="color"></input>
                <select  className="form-select" name="anonimização" required>{functionsWithDescriptionArray.map( (desc,i ) => <option key={i} label={desc.name} value={i}>{desc.name}</option>)}</select>
                <button className="form-control btn btn-primary">Adicionar</button>
            </form>
        </div>
        <div className="modal-footer">
            <div className="flex-grow-1"></div>
            <button className="btn btn-secondary" type="button" data-bs-dismiss="modal">Fechar</button>
        </div>
    </>
}

const TYPE_COLUMN: (file: UserFile, profile: ProfileI | null, setProfile: (p:ProfileI) => void) => MRT_ColumnDef<EntityTypeI> = (file, profile, setProfile) => ({
    header: "Tipo",
    Header: <><Bicon n="pencil"/> Tipo</>,
    accessorKey: "color",
    enableEditing: true,
    muiTableBodyCellEditTextFieldProps: ({row, table}) => ({
        type: "color",
        name: "color",
        onBlur: (evt) => {
            file.updateType(row.original.name, evt.target.value, row.original.functionIndex)
            if(profile){
                setProfile({...profile, defaultEntityTypes: {...profile.defaultEntityTypes, [row.original.name]: {color: evt.target.value, functionIndex: row.original.functionIndex}}});
            }
            table.setEditingCell(null);
        }
    }),
    Cell: ({row}) => <span className='badge text-body' style={{background: row.original.color}}>{row.original.name}</span>    
})

const ANON_COLUMN: (file: UserFile) => MRT_ColumnDef<EntityTypeI> = (file) => ({
    header: "Anonimização",
    Header: <><Bicon n="pencil"/> Anonimização</>,
    accessorFn: (ent) => functionsWithDescriptionArray[ent.functionIndex].name,
    enableEditing: true,
    muiTableBodyCellEditTextFieldProps: ({row,table}) => ({
        select: true,
        children: functionsWithDescriptionArray.map( (desc,i) => <option key={i} label={desc.name} value={i}>{desc.name}</option>),
        SelectProps: {
            native: true,
            defaultValue: row.original.functionIndex
        },
        onChange: (evt) => file.updateType(row.original.name, row.original.color, parseInt(evt.target.value))
    })
})

const EXAMPLE_COLUMN: MRT_ColumnDef<EntityTypeI> = {
    header: "Descrição Anonimização",
    accessorFn: (row) => functionsWithDescriptionArray[row.functionIndex].description,
    enableEditing: false,
    muiTableBodyCellProps: {
        className: "text-nowrap"
    }
}
