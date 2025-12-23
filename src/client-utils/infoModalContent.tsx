"use client";
import { formatBytes } from "@/components/SelectFile";
import { UserFile } from "@/client-utils/UserFile";
import { MaterialReactTable } from "material-react-table";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { useArea, useDescriptors, useEntities, useImages, useSave, useSummary, useTypes } from "./uses";
import { UserFileInterface } from "@/types/UserFile";

const intl = new Intl.DateTimeFormat(["pt", "en"], { dateStyle: "short", timeStyle: "medium" });

export function InfoModalContent({ file }: { file: UserFileInterface }) {
    let saved = useSave(file);
    let types = useTypes(file);
    let images = useImages(file);
    let entities = useEntities(file.pool);
    let descriptors = useDescriptors(file);
    let area = useArea(file);
    let summary = useSummary(file);

    let data: { key: string, value: string }[] = [
        { key: "Nome", value: file.name },
        { key: "Tamanho", value: formatBytes(new Blob([JSON.stringify(file.toSavedFile())]).size) },
        { key: "Importado", value: intl.format(file.imported) },
        { key: "Modificado", value: intl.format(file.modified) },
        { key: "Guardado no browser", value: saved ? "Sim" : "Não" },
        { key: "Tipos de Entidade", value: types.length.toString() },
        { key: "Entidades", value: entities.length.toString() },
        { key: "Imagens", value: Object.keys(images).length.toString() },
        { key: "Imagens Anonimizadas", value: Object.values(images).filter(i => i.anonimizedSrc).length.toString() },
        { key: "Área", value: area || "" },
        { key: "Descritores Sugeridos", value: descriptors?.length.toString() || "" },
        { key: "Sumarização Sugerida", value: summary?.length.toString() || "" },
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
                }, {
                    header: "Valor",
                    accessorKey: "value"
                }]}
                data={data}
                localization={{ ...MRT_Localization_PT }}
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
                enableTopToolbar={false} />
        </div>
        <div className="modal-footer">
            <div className="flex-grow-1"></div>
            <button className="btn btn-secondary" type="button" data-bs-dismiss="modal">Fechar</button>
        </div>
    </>
}