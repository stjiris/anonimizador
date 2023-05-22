import { formatBytes } from "../components/SelectFile";
import { UserFile } from "../types/UserFile";
import { functionsWithDescriptionArray } from "./anonimizeFunctions";
import MaterialReactTable from "material-react-table";
import { MRT_Localization_PT } from "material-react-table/locales/pt";

const intl = new Intl.DateTimeFormat(["pt","en"], {dateStyle: "short", timeStyle: "medium"});

export function InfoModalContent({file}: {file:UserFile}){
    let saved = file.useSave()();
    let types = file.useTypes()();
    let images = file.useImages()();
    let entities = file.pool.useEntities()();

    let data: {key: string, value: string}[] = [
        {key: "Nome", value: file.name},
        {key: "Tamanho", value: formatBytes(new Blob([JSON.stringify(file.toSavedFile())]).size)},
        {key: "Importado", value: intl.format(file.imported)},
        {key: "Modificado", value: intl.format(file.modified)},
        {key: "Guardado no browser", value: saved ? "Sim" : "Não"},
        {key: "Tipos de Entidade", value: types.length.toString()},
        {key: "Entidades", value: entities.length.toString()},
        {key: "Imagens", value: Object.keys(images).length.toString()},
        {key: "Imagens Anonimizadas", value: Object.values(images).filter(i => i.anonimizedSrc).length.toString()},
    ];



    return <>
    <div className="modal-header">
            <div><h5 className="modal-title" id="modal-info-label">Informações do ficheiro</h5></div>
        </div>
        <div className="modal-body p-0">
        <MaterialReactTable
            columns={[{
                header: "Propriedade",
                accessorKey: "key",
            },{
                header: "Valor",
                accessorKey: "value"
            }]}
            data={data}
            localization={{...MRT_Localization_PT}}
            enablePagination={false}
            enableDensityToggle={false}
            enableHiding={false}
            enableColumnResizing={false}
            enableRowSelection={false}
            enableColumnOrdering={false}
            enableStickyHeader={false}
            enableEditing={false}
            enableRowActions={false}
            enableColumnFilters={false}
            enableSorting={false}
            enableGlobalFilter={false}
            enableFullScreenToggle={false}
            enableColumnActions={false}
            enableBottomToolbar={false}
            enableTopToolbar={false}/>
        </div>
        <div className="modal-footer">
            <div className="flex-grow-1"></div>
            <button className="btn btn-secondary" type="button" data-bs-dismiss="modal">Fechar</button>
        </div>
    </>
}