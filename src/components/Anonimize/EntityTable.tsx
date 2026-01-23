import { useMemo, useState } from "react";
import MaterialReactTable, {
  MRT_ColumnDef,
  MRT_Row,
  MRT_TableInstance,
} from "material-react-table";
import { MRT_Localization_PT } from "material-react-table/locales/pt";

import {
  IconButton,
  Tooltip,
  TextField,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import VisibilityIcon from "@mui/icons-material/Visibility";

import { Button } from "../../util/BootstrapIcons";
import { EntityPool } from "../../types/EntityPool";
import { Entity } from "../../types/Entity";
import { UserFile } from "../../types/UserFile";
import { EntityTypeI } from "../../types/EntityTypes";
import { FULL_ANONIMIZE } from "../../util/anonimizeFunctions";
import { useEntities, useTypesDict } from "../../util/uses";

export function EntityTable({ file }: { file: UserFile }) {
  const [showOnlyMarks, setShowOnlyMarks] = useState(false);

  const ents = useEntities(file.pool);
  const filteredEnts = showOnlyMarks ? ents.filter((e) => e.type === "Marca") : ents;

  const typesDict = useTypesDict(file);
  const typesList = useMemo(() => Object.values(typesDict), [typesDict]);

  const totalOcc = useMemo(
    () => filteredEnts.reduce((acc, e) => acc + (e.offsets?.length ?? 0), 0),
    [filteredEnts]
  );

  const columns = useMemo<MRT_ColumnDef<Entity>[]>(() => {
    return [
      TYPE_COL(typesList),
      COUNT_COL(totalOcc),
      ENTITY_COL(file.pool),
      ANONIMIZE_COL(file.pool, typesDict),
    ];
  }, [typesList, totalOcc, file.pool, typesDict]);

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
      enableGlobalFilter={false}

      enableRowVirtualization={false}
      enableColumnResizing
      columnResizeMode="onChange"
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
                const elm = document.querySelector<HTMLElement>(`[data-offset="${off.start}"]`);
                if (elm) {
                  elm.scrollIntoView({ block: "center" });
                  elm.classList.add("selected");
                  setTimeout(() => elm.classList.remove("selected"), 2000);
                }
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

      renderTopToolbarCustomActions={toolbar(file.pool, file, showOnlyMarks, setShowOnlyMarks)}

      enableStickyHeader
      enableHiding
      enablePagination
      enableDensityToggle={false}
      enableFullScreenToggle={false}
      muiTableBodyRowProps={() => ({
        sx: { "&:hover": { backgroundColor: "rgba(244,236,206,.35)" } },
      })}
      muiTablePaginationProps={{
        rowsPerPageOptions: [10, 25, 50, 100],
      }}
      muiTablePaperProps={{
        sx: { display: "flex", flexDirection: "column" },
      }}
      positionToolbarAlertBanner="bottom"
      initialState={{
        density: "compact",
        sorting: [{ id: "count", desc: true }],
        columnPinning: { right: ["mrt-row-actions"] },
        pagination: { pageIndex: 0, pageSize: 25 }
      }}
    />
  );
}

const toolbar =
  (pool: EntityPool, file: UserFile, showOnlyMarks: boolean, setShowOnlyMarks: (v: boolean) => void) =>
  ({ table }: { table: MRT_TableInstance<Entity> }) => {
    const selectedCount = Object.keys(table.getState().rowSelection).length;
    const isJoinDisabled = showOnlyMarks || selectedCount <= 1;
    const isSplitDisabled = showOnlyMarks || selectedCount === 0;

    return (
      <div className="d-flex w-100 align-items-center gap-2">
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

        <Button
          i="exclude"
          text="Separar"
          className="btn btn-warning my-0 mx-1 p-1"
          disabled={isSplitDisabled}
          onClick={() => {
            if (!isSplitDisabled) splitSelectedEntities(table, pool, file);
          }}
        />

        <Button
          i="trash"
          text="Remover"
          className="btn btn-danger my-0 mx-1 p-1"
          disabled={selectedCount === 0}
          onClick={() => removeSelectedEntities(table, pool, file)}
        />

        <div className="flex-grow-1" />

        <TextField
          size="small"
          placeholder="Pesquisar…"
          value={table.getState().globalFilter ?? ""}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
          sx={{ minWidth: 220 }}
        />

        <ToggleButtonGroup
          size="small"
          value={showOnlyMarks ? "marcas" : "todas"}
          exclusive
          onChange={(_, v) => setShowOnlyMarks(v === "marcas")}
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

//const selectedIndexes = (table: MRT_TableInstance<Entity>) =>
//  table.getSelectedRowModel().rows.map((row) => row.original.index);

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

const removeSelectedEntities = (table: MRT_TableInstance<Entity>, pool: EntityPool, file: UserFile) => {
  pool.removeEntities(selectedIndexes(table));
  removeTableSelection(table);
  console.log("Selected indexes LENGTH:", selectedIndexes(table).length);
  console.log("Selected indexes FULL:", selectedIndexes(table));
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
          onClick={() =>
            document.querySelector(`[data-offset="${off.start}"]`)?.scrollIntoView({ block: "center" })
          }
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
  size: 100,
  minSize: 100,
  maxSize: 132,
  sortDescFirst: true,
  enableColumnActions: false,
  muiTableHeadCellProps: { align: "right" },
  muiTableBodyCellProps: { align: "right" },
  Cell: ({ cell }) => <strong>{cell.getValue<number>() ?? 0}</strong>,
});

const ENTITY_COL: (pool: EntityPool) => MRT_ColumnDef<Entity> = (pool) => ({
  id: "entity",
  header: `Entidade (${pool.entities.length})`,
  accessorFn: (ent) => ent.offsets[0]?.preview ?? "",
  size: 360,
  minSize: 260,
  maxSize: 280,
  enableEditing: false,
  enableColumnFilter: true,
  enableColumnDragging: false,
  enableColumnActions: false,
  muiTableHeadCellProps: { align: "left" },
  muiTableBodyCellProps: ({ row }) => ({
    onClick: () => {
      if (!row.original.offsets.length) return;
      const off = row.original.offsets[0];
      const elm = document.querySelector<HTMLElement>(`[data-offset="${off.start}"]`);
      if (elm) {
        elm.scrollIntoView({ block: "center" });
        elm.classList.add("selected");
        setTimeout(() => elm.classList.remove("selected"), 2000);
      }
    },
    sx: { cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  }),
});

const TYPE_COL: (types: EntityTypeI[]) => MRT_ColumnDef<Entity> = (types) => ({
  id: "type",
  header: "Tipo",
  accessorKey: "type",
  size: 112,
  minSize: 112,
  maxSize: 128,
  enableEditing: false,
  enableColumnActions: false,
  filterVariant: "select",
  filterSelectOptions: types.map((t) => t.name),
  muiTableHeadCellProps: { align: "center" },
  muiTableBodyCellProps: { align: "center", sx: { px: 1 } },
  Cell: ({ row, table }) => {
    const t =
      types.find((x) => x.name === row.original.type) ||
      ({ name: `${row.original.type}*`, color: "red", functionIndex: FULL_ANONIMIZE } as EntityTypeI);
    return (
      <span
        className="badge text-body"
        title="Filtrar por este tipo"
        style={{ background: t.color, cursor: "pointer" }}
        onClick={() => table.getColumn("type")?.setFilterValue(t.name)}
      >
        {t.name}
      </span>
    );
  },
});

const ANONIMIZE_COL: (pool: EntityPool, types: Record<string, EntityTypeI>) => MRT_ColumnDef<Entity> = (
  pool,
  types,
) => ({
  id: "anon",
  header: "Anonimização",
  accessorKey: "overwriteAnonimization",
  size: 196,
  minSize: 180,
  maxSize: 280,
  enableColumnActions: false,
  muiTableHeadCellProps: { align: "left" },
  muiTableBodyCellProps: {
    align: "left",
    sx: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  },
  Cell: ({ row }) => {
    const generated = row.original.anonimizingFunction(types[row.original.type])(
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
    placeholder: row.original.anonimizingFunction(types[row.original.type])(
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
