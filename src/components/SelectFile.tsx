'use client'

import { useEffect, useState } from "react";
import { listUserFile } from "@/core/UserFileCRUDL";
import { SavedUserFile, UserFile } from "@/core/UserFile";
import { MRT_ColumnDef, MaterialReactTable } from "material-react-table";
import { MRT_Localization_PT } from "material-react-table/locales/pt";
import { Button } from "@/core/BootstrapIcons";
import { ImportFilesAction } from "./SelectFile/ImportFilesAction";
import { DeleteSelectedUserFilesAction } from "./SelectFile/DeleteFilesAction";
import { ExportAllUserFilesAction, ExportAllUserFilesZipAction } from "./SelectFile/ExportFilesAction";

// https://stackoverflow.com/a/18650828/2573422
export function formatBytes(a: number, b = 2) { if (!+a) return "0 Bytes"; const c = 0 > b ? 0 : b, d = Math.floor(Math.log(a) / Math.log(1024)); return `${parseFloat((a / Math.pow(1024, d)).toFixed(c))} ${["Bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"][d]}` }

const intl = new Intl.DateTimeFormat(["pt", "en"], { dateStyle: "short", timeStyle: "medium" });

const cols: MRT_ColumnDef<SavedUserFile>[] = [
    {
        id: "name",
        header: "Ficheiros Locais",
        Header: <><i className="bi bi-file-earmark-fill"></i> Ficheiros Locais</>,
        accessorKey: "name",
        size: 80,
        Cell: ({ row }) => <Button i="file-earmark" className="text-nowrap text-primary btn m-0 p-0" title={`Abrir ${row.original.name}`} text={row.original.name} />
    },
    {
        id: "size",
        header: "Tamanho",
        accessorFn: file => new Blob([JSON.stringify(file)]).size,
        Cell: ({ cell }) => formatBytes(cell.getValue<number>())
    },
    {
        id: "occurrences",
        header: "N.º de Entidades / Ocorrências",
        accessorFn: file => file.ents.reduce((acc, c) => acc + c.offsets.length, 0),
        Cell: ({ row }) => `${row.original.ents.reduce((acc, c) => acc + 1, 0)} / ${row.original.ents.reduce((acc, c) => acc + c.offsets.length, 0)}`
    },
    {
        id: "imported",
        header: "Importado",
        accessorFn: (file) => new Date(file.imported).getTime(),
        Cell: ({ row }) => <span style={{ color: row.original.importedFromJson ? 'darkgoldenrod' : 'black' }}>{intl.format(new Date(row.original.imported))}</span>
    },
    {
        id: "modified",
        header: "Modificado",
        accessorFn: (file) => new Date(file.modified).getTime(),
        Cell: ({ row }) => intl.format(new Date(row.original.modified))
    }
]

const columnOrder = ["name", "size", "occurrences", "imported", "modified", "mrt-row-select"];

export default function SelectFile({ setUserFile }: { setUserFile: (file: UserFile) => void }) {
    const [list, setList] = useState<SavedUserFile[]>([]);
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

    useEffect(() => {
        (async () => {
            const files = await listUserFile();
            setList(files);
        })();
    }, []);

    useEffect(() => {
        const update = () => {
            (async () => {
                const files = await listUserFile();
                setList(files);
            })();
        };
        window.addEventListener("AlertUpdateListUserFile", update);
        return () => window.removeEventListener("AlertUpdateListUserFile", update);
    }, []);

    useEffect(() => {
        setRowSelection((currentSelection) => {
            const validNames = new Set(list.map((file) => file.name));
            const nextSelection = Object.fromEntries(
                Object.entries(currentSelection).filter(([name, selected]) => selected && validNames.has(name))
            );

            if (Object.keys(nextSelection).length === Object.keys(currentSelection).length) {
                return currentSelection;
            }

            return nextSelection;
        });
    }, [list]);

    return (
        <MaterialReactTable
            muiTablePaperProps={{ className: "container" }}
            columns={cols}
            data={list}
            getRowId={(row) => row.name}
            onRowSelectionChange={setRowSelection}
            state={{ rowSelection, columnOrder }}
            localization={{ ...MRT_Localization_PT, noRecordsToDisplay: "Sem ficheiros" }}
            positionToolbarAlertBanner="none"
            displayColumnDefOptions={{
                "mrt-row-select": {
                    size: 44,
                    minSize: 44,
                    maxSize: 44,
                    enableResizing: false,
                    muiTableHeadCellProps: { align: "center" },
                    muiTableBodyCellProps: { align: "center" },
                },
            }}
            muiTableBodyRowProps={({ row }) => ({
                onClick: () => setUserFile(new UserFile(row.original))
            })}
            renderTopToolbarCustomActions={({ table }) => {
                const selectedFiles = table.getSelectedRowModel().rows.map(row => row.original);

                return (
                    <div className="d-flex align-items-center justify-content-between gap-2 w-100">
                        <ImportFilesAction clearSelection={() => setRowSelection({})} />
                        <div className="d-flex align-items-center gap-2">
                            <ExportAllUserFilesZipAction selectedFiles={selectedFiles} />
                            <ExportAllUserFilesAction selectedFiles={selectedFiles} />
                            <DeleteSelectedUserFilesAction selectedFiles={selectedFiles} clearSelection={() => setRowSelection({})} />
                        </div>
                    </div>
                );
            }}
            enablePagination={false}
            enableDensityToggle={false}
            enableHiding={false}
            enableColumnResizing={false}
            enableRowSelection={true}
            enableRowActions={false}
            enableColumnOrdering={false}
            enableStickyHeader={false}
            enableEditing={false}
            enableColumnFilters={false}
            enableSorting={true}
            enableGlobalFilter={false}
            enableFullScreenToggle={false}
            enableColumnActions={false}
        />
    );
}