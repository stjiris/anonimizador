import MaterialReactTable, { MRT_ColumnDef } from "material-react-table";
import { functionsWithDescriptionArray } from "../util/anonimizeFunctions";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { EntityTypeIDefaults, EntityTypeI } from "../types/EntityTypes";
import { Bicon, Button } from "../util/BootstrapIcons";
import { ProfileI, useAvaiableProfiles, useProfile } from "./Profile";
import { useMemo } from "react";

export function ProfileTypesTable(){
    let [profile, setProfile] = useProfile();
    let availableProfiles = useAvaiableProfiles();
    let knownProfile = availableProfiles.find( p => p.name === profile?.name);
    const data = useMemo(() => profile ? Object.entries(profile.defaultEntityTypes).map( ([name, {color, functionIndex}]) => ({name, color, functionIndex})) : [], [profile]);
    if( !profile ) return null;
    return <>
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
                columns={[TYPE_COLUMN(profile, setProfile),ANON_COLUMN(profile, setProfile),EXAMPLE_COLUMN]} 
                data={data}
                localization={MRT_Localization_PT}
                renderTopToolbarCustomActions={() => knownProfile ? [
                    <Button key="reset" className="btn btn-warning" i="arrow-clockwise" text="Repor" onClick={() => setProfile({...profile!, defaultEntityTypes: knownProfile!.defaultEntityTypes})}/>
                ] : []}
                renderBottomToolbarCustomActions={() =>
                    <form className="d-flex m-2 w-100" onSubmit={(evt) => {
                        evt.preventDefault(); 
                        let form = evt.target as HTMLFormElement;
                        let tipoInput = form.elements.namedItem("tipo") as HTMLInputElement;
                        let colorInput = form.elements.namedItem("color") as HTMLInputElement;
                        let anonInput = form.elements.namedItem("anonimização") as HTMLSelectElement;
                        setProfile({...profile!, defaultEntityTypes: {...profile!.defaultEntityTypes, [tipoInput.value]: {color: colorInput.value, functionIndex: parseInt(anonInput.value)}}});
                        tipoInput.value = "";
                        colorInput.value = "";
                        }}>
                        <input className="form-control" name="tipo" placeholder="Tipo..." required></input>
                        <input  className="form-control form-control-color" name="color" type="color"></input>
                        <select  className="form-select" name="anonimização" required>{functionsWithDescriptionArray.map( (desc,i ) => <option key={i} label={desc.name} value={i}>{desc.name}</option>)}</select>
                        <Button className="form-control btn btn-primary" i="plus" text="Adicionar" type="submit"/>
                    </form>
                }
                muiTableBodyCellProps={({table, cell}) => ({
                    onClick: () => {table.setEditingCell(cell);}
                })}
                enableRowActions={true}
                renderRowActions={({row}) => EntityTypeIDefaults[row.original.name] ? <></> : <Button className="btn text-danger" i='trash' title="Eliminar" onClick={() => setProfile({...profile!, defaultEntityTypes: Object.fromEntries(Object.entries(profile!.defaultEntityTypes).filter(([key]) => key !== row.original.name))})}/>}
            />
    </>
}

const TYPE_COLUMN: (profile: ProfileI, setProfile: (p: ProfileI) => void) => MRT_ColumnDef<EntityTypeI> = (profile, setProfile) => ({
    header: "Tipo",
    Header: <><Bicon n="pencil"/> Tipo</>,
    accessorKey: "color",
    enableEditing: true,
    muiTableBodyCellEditTextFieldProps: ({row, table}) => ({
        type: "color",
        name: "color",
        onBlur: (evt) => {
            setProfile({...profile, defaultEntityTypes: {...profile.defaultEntityTypes, [row.original.name]: {functionIndex: row.original.functionIndex, color: evt.target.value}}});
            table.setEditingCell(null);
        }
    }),
    Cell: ({row}) => <span className='badge text-body' style={{background: row.original.color}}>{row.original.name}</span>    
})

const ANON_COLUMN: (profile: ProfileI, setProfile: (p: ProfileI) => void) => MRT_ColumnDef<EntityTypeI> = (profile, setProfile) => ({
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
        onChange: (evt) => setProfile({...profile, defaultEntityTypes: {...profile.defaultEntityTypes, [row.original.name]: {color: row.original.color, functionIndex: parseInt(evt.target.value)}}})
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
