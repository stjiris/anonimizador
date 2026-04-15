import { MRT_ColumnDef, MaterialReactTable } from "material-react-table";
import { functionsWithDescriptionArray } from "@/core/anonimizeFunctions";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { EntityTypeIDefaults, EntityTypeI } from "@/types/EntityType";
import { Bicon, Button } from "@/core/BootstrapIcons";
import { ChangeEventHandler, useCallback, useMemo, useRef, useState } from "react";
import { isProfileI, useAvaiableProfiles, useProfile } from "@/core/ProfileTypeLogic";
import { ProfileI } from "@/types/ProfileType";
import { sortEntityTypesXLast } from "./Tooltip";

export function ProfileTypesTable() {
    let [profile, setProfile] = useProfile();
    let [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    let availableProfiles = useAvaiableProfiles();
    let knownProfile = availableProfiles.find(p => p.name === profile?.name);
    const data = useMemo(() =>
        profile
            ? sortEntityTypesXLast(
                Object.entries(profile.defaultEntityTypes).map(([name, { color, functionIndex, subtypes }]) => ({
                    id: name,
                    name, color, functionIndex, subtypes
                }))
            )
            : [],
        [profile]
    );

    const addSubtype = (parentName: string, subtypeName: string, color: string, functionIndex: number) => {
        const subtypes = profile!.defaultEntityTypes[parentName].subtypes || [];
        setProfile({
            ...profile!,
            defaultEntityTypes: {
                ...profile!.defaultEntityTypes,
                [parentName]: {
                    ...profile!.defaultEntityTypes[parentName],
                    subtypes: [...subtypes, { name: subtypeName, color, functionIndex }]
                }
            }
        });
    };

    const updateSubtype = (parentName: string, subtypeIndex: number, color: string, functionIndex: number) => {
        const subtypes = profile!.defaultEntityTypes[parentName].subtypes || [];
        const updated = [...subtypes];
        updated[subtypeIndex] = { ...updated[subtypeIndex], color, functionIndex };
        setProfile({
            ...profile!,
            defaultEntityTypes: {
                ...profile!.defaultEntityTypes,
                [parentName]: {
                    ...profile!.defaultEntityTypes[parentName],
                    subtypes: updated
                }
            }
        });
    };

    const deleteSubtype = (parentName: string, subtypeIndex: number) => {
        const subtypes = profile!.defaultEntityTypes[parentName].subtypes || [];
        const updated = subtypes.filter((_, i) => i !== subtypeIndex);
        setProfile({
            ...profile!,
            defaultEntityTypes: {
                ...profile!.defaultEntityTypes,
                [parentName]: {
                    ...profile!.defaultEntityTypes[parentName],
                    subtypes: updated.length > 0 ? updated : undefined
                }
            }
        });
    };

    if (!profile) return null;
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
            enableExpanding={true}
            columns={[TYPE_COLUMN(profile, setProfile), ANON_COLUMN(profile, setProfile), EXAMPLE_COLUMN]}
            data={data}
            localization={MRT_Localization_PT}
            renderTopToolbarCustomActions={() => knownProfile ? [
                <Button key="reset" className="btn btn-warning" i="arrow-clockwise" text="Repor" onClick={() => setProfile({ ...profile!, defaultEntityTypes: knownProfile!.defaultEntityTypes })} />
            ] : []}
            renderBottomToolbarCustomActions={() =>
                <form className="d-flex m-2 w-100" onSubmit={(evt) => {
                    evt.preventDefault();
                    let form = evt.target as HTMLFormElement;
                    let tipoInput = form.elements.namedItem("tipo") as HTMLInputElement;
                    let colorInput = form.elements.namedItem("color") as HTMLInputElement;
                    let anonInput = form.elements.namedItem("anonimização") as HTMLSelectElement;
                    setProfile({ ...profile!, defaultEntityTypes: { ...profile!.defaultEntityTypes, [tipoInput.value]: { color: colorInput.value, functionIndex: parseInt(anonInput.value) } } });
                    tipoInput.value = "";
                    colorInput.value = "";
                }}>
                    <input className="form-control" name="tipo" placeholder="Tipo..." required></input>
                    <input className="form-control form-control-color" name="color" type="color"></input>
                    <select className="form-select" name="anonimização" required>{functionsWithDescriptionArray.map((desc, i) => <option key={i} label={desc.name} value={i}>{desc.name}</option>)}</select>
                    <Button className="form-control btn btn-primary" i="plus" text="Adicionar" type="submit" />
                </form>
            }
            muiTableBodyCellProps={({ table, cell }) => ({
                onClick: () => { table.setEditingCell(cell); }
            })}
            enableRowActions={true}
            renderRowActions={({ row }) => EntityTypeIDefaults[row.original.name] ? <></> : <Button className="btn text-danger" i='trash' title="Eliminar" onClick={() => setProfile({ ...profile!, defaultEntityTypes: Object.fromEntries(Object.entries(profile!.defaultEntityTypes).filter(([key]) => key !== row.original.name)) })} />}
            state={{ expanded: expandedRows }}
            onExpandedChange={(updater) => {
                const newState = typeof updater === 'function' ? updater(expandedRows) : updater;
                setExpandedRows(newState as Record<string, boolean>);
            }}
            renderDetailPanel={({ row }) => row.original.subtypes && row.original.subtypes.length > 0 ? (
                <SubtypesManager 
                    parentName={row.original.name}
                    subtypes={row.original.subtypes}
                    onAddSubtype={addSubtype}
                    onUpdateSubtype={updateSubtype}
                    onDeleteSubtype={deleteSubtype}
                />
            ) : null}
        />
    </>
}

const TYPE_COLUMN: (profile: ProfileI, setProfile: (p: ProfileI) => void) => MRT_ColumnDef<EntityTypeI> = (profile, setProfile) => ({
    header: "Tipo",
    Header: <><Bicon n="pencil" /> Tipo</>,
    accessorKey: "color",
    enableEditing: true,
    muiTableBodyCellEditTextFieldProps: ({ row, table }) => ({
        type: "color",
        name: "color",
        onBlur: (evt) => {
            setProfile({ ...profile, defaultEntityTypes: { ...profile.defaultEntityTypes, [row.original.name]: { functionIndex: row.original.functionIndex, color: evt.target.value, subtypes: row.original.subtypes } } });
            table.setEditingCell(null);
        }
    }),
    Cell: ({ row }) => <span className='badge text-body' style={{ background: row.original.color }}>{row.original.name}</span>
})

const ANON_COLUMN: (profile: ProfileI, setProfile: (p: ProfileI) => void) => MRT_ColumnDef<EntityTypeI> = (profile, setProfile) => ({
    header: "Anonimização",
    Header: <><Bicon n="pencil" /> Anonimização</>,
    accessorFn: (ent) => functionsWithDescriptionArray[ent.functionIndex].name,
    enableEditing: true,
    muiTableBodyCellEditTextFieldProps: ({ row, table }) => ({
        select: true,
        children: functionsWithDescriptionArray.map((desc, i) => <option key={i} label={desc.name} value={i}>{desc.name}</option>),
        SelectProps: {
            native: true,
            defaultValue: row.original.functionIndex
        },
        onChange: (evt) => setProfile({ ...profile, defaultEntityTypes: { ...profile.defaultEntityTypes, [row.original.name]: { color: row.original.color, functionIndex: parseInt(evt.target.value), subtypes: row.original.subtypes } } })
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

interface SubtypesManagerProps {
    parentName: string;
    subtypes?: EntityTypeI[];
    onAddSubtype: (parentName: string, name: string, color: string, functionIndex: number) => void;
    onUpdateSubtype: (parentName: string, index: number, color: string, functionIndex: number) => void;
    onDeleteSubtype: (parentName: string, index: number) => void;
}

function SubtypesManager({ parentName, subtypes = [], onAddSubtype, onUpdateSubtype, onDeleteSubtype }: SubtypesManagerProps) {
    const [subtypeForm, setSubtypeForm] = useState<{ name: string; color: string; funcIndex: number }>({ name: "", color: "#000000", funcIndex: 1 });

    const handleAddSubtype = (e: React.FormEvent) => {
        e.preventDefault();
        if (subtypeForm.name.trim()) {
            onAddSubtype(parentName, subtypeForm.name, subtypeForm.color, subtypeForm.funcIndex);
            setSubtypeForm({ name: "", color: "#000000", funcIndex: 1 });
        }
    };

    return (
        <div className="p-3 bg-light rounded">
            <h6>Subtipos de {parentName}</h6>
            {subtypes && subtypes.length > 0 && (
                <div className="mb-3">
                    <table className="table table-sm">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Cor</th>
                                <th>Anonimização</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subtypes.map((subtype, idx) => (
                                <tr key={idx}>
                                    <td><span className="badge" style={{ background: subtype.color }}>{subtype.name}</span></td>
                                    <td>
                                        <input 
                                            type="color" 
                                            defaultValue={subtype.color}
                                            onChange={(e) => onUpdateSubtype(parentName, idx, e.target.value, subtype.functionIndex)}
                                            className="form-control form-control-sm"
                                            style={{ maxWidth: "50px" }}
                                        />
                                    </td>
                                    <td>{functionsWithDescriptionArray[subtype.functionIndex].name}</td>
                                    <td>
                                        <button 
                                            className="btn btn-sm btn-danger"
                                            onClick={() => onDeleteSubtype(parentName, idx)}
                                        >
                                            <Bicon n="trash" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <form onSubmit={handleAddSubtype} className="d-flex gap-2">
                <input 
                    type="text" 
                    className="form-control form-control-sm"
                    placeholder="Nome do subtipo..."
                    value={subtypeForm.name}
                    onChange={(e) => setSubtypeForm({ ...subtypeForm, name: e.target.value })}
                    required
                />
                <input 
                    type="color"
                    className="form-control form-control-color form-control-sm"
                    value={subtypeForm.color}
                    onChange={(e) => setSubtypeForm({ ...subtypeForm, color: e.target.value })}
                />
                <select 
                    className="form-select form-select-sm"
                    value={subtypeForm.funcIndex}
                    onChange={(e) => setSubtypeForm({ ...subtypeForm, funcIndex: parseInt(e.target.value) })}
                >
                    {functionsWithDescriptionArray.map((desc, i) => (
                        <option key={i} value={i}>{desc.name}</option>
                    ))}
                </select>
                <button type="submit" className="btn btn-sm btn-success">
                    <Bicon n="plus" />
                </button>
            </form>
        </div>
    );
}

export function ProfileSelector() {
    const [profile, setProfile] = useProfile();
    const availableProfiles = useAvaiableProfiles();
    const inputFileRef = useRef<HTMLInputElement>(null);

    const onFileChangeCallback = useCallback<ChangeEventHandler<HTMLInputElement>>((e) => {
        let file = e.target.files?.item(0);
        if (!file) {
            return;
        }
        let reader = new FileReader();
        reader.onload = (e) => {
            let profile = JSON.parse(reader.result as string);
            if (!isProfileI(profile)) {
                alert("Arquivo inválido");
                return;
            }

            setProfile(profile);
        }
        reader.readAsText(file);
        e.target.value = "";
    }, [setProfile]);
    const onDownloadProfile = useCallback(() => {
        let newName = prompt("Nome do perfil", profile?.name || "")
        if (!newName || availableProfiles.find(p => p.name === newName)) {
            alert("Nome inválido");
            return;
        }
        setProfile({ ...profile!, name: newName });
        let blob = new Blob([JSON.stringify(profile)], { type: "application/json" });
        let url = URL.createObjectURL(blob);
        let a = document.createElement("a");
        a.href = url;
        a.download = newName || "perfil.json";
        a.click();
        URL.revokeObjectURL(url);
    }, [profile]);

    const isInAvailable = availableProfiles.find(p => p.name === profile?.name);
    const profiles = isInAvailable || !profile ? availableProfiles : availableProfiles.concat(profile);


    return <>
        <div className="modal-header">
            <div><h4 className="modal-title" id="modal-info-label">Perfil</h4></div>
        </div>
        <div className="modal-body">
            <input ref={inputFileRef} type="file" hidden id="profileFile" onChange={onFileChangeCallback} />
            <div>
                <Button onClick={() => inputFileRef.current?.click()} i="upload" text="Carregar Perfil" className="btn btn-primary" />
                <Button onClick={onDownloadProfile} disabled={profile === null} i="floppy" text="Salvar Perfil" className="btn btn-primary mx-1" />
                <i className="bi bi-dot mx-1"></i>
                {profiles && profiles.map(p => <button key={p.name} className="col btn btn-primary mx-1" disabled={p.name === profile?.name} onClick={() => setProfile(p)}>{p.name}</button>)}
                <i className="bi bi-dot mx-1"></i>
                <button className="col btn btn-primary mx-1" disabled={profile === null} onClick={() => setProfile(null)}>Sem perfil</button>
            </div>
            {profile &&
                <>
                    <div>
                        <p className="m-0">Ferramentas ativas:</p>
                        <input type="checkbox" className="form-check-input" id="perfilSumarizador" checked={profile.tools.sumarizador} onChange={e => setProfile({ ...profile, tools: { ...profile.tools, sumarizador: e.target.checked } })} />
                        <label className="form-check-label" htmlFor="perfilSumarizador" title="Ferramenta de sumarização treinada sobre acórdãos do Supremo Tribunal de Justiça">Sumarizador</label>
                        <br />
                        <input type="checkbox" className="form-check-input" id="perfilDescritores" checked={profile.tools.descritores} onChange={e => setProfile({ ...profile, tools: { ...profile.tools, descritores: e.target.checked } })} />
                        <label className="form-check-label" htmlFor="perfilDescritores" title="Ferramenta de extração de descritores treinada sobre acórdãos do Supremo Tribunal de Justiça">Descritores</label>
                    </div>
                    <div>
                        <p className="m-0">Versão Pro:</p>
                        <input type="checkbox" className="form-check-input" id="nerOn" checked={profile.nerRgx?.nerOn ?? true} onChange={e => setProfile({ ...profile, nerRgx: { ...(profile.nerRgx || {}), nerOn: e.target.checked } })} />
                        <br />
                        <input type="checkbox" className="form-check-input" id="rgxOn" checked={profile.nerRgx?.rgxOn ?? true} onChange={e => setProfile({ ...profile, nerRgx: { ...(profile.nerRgx || {}), rgxOn: e.target.checked } })} />
                        <label className="form-check-label" htmlFor="rgxOn" title="Utilização das regras REGEX na identificação de entidades">Regras REGEX</label>
                    </div>
                    <div>
                        <p className="m-0">Tipos padrão:</p>
                        <ProfileTypesTable />
                    </div>
                </>
            }
        </div>
    </>

}