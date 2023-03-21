import React from 'react';
import Anonimize from './components/Anonimize';
import Header from './components/Header';
import SelectFile from './components/SelectFile';
import { UserFile } from './types/UserFile';
import BootstrapModal from './util/BootstrapModal';
import MaterialReactTable, { MRT_ColumnDef } from 'material-react-table';
import { MRT_Localization_PT } from 'material-react-table/locales/pt';
import { addEntityType, deleteEntityType, EntityTypeI, EntityTypesDefaults, getEntityTypes, restoreEntityTypes, updateEntityType } from './types/EntityTypes';
import { functionsWithDescriptionArray } from './util/anonimizeFunctions';
import { Bicon, Button } from './util/BootstrapIcons';

interface AppState{
	userFile: UserFile | undefined
	entitieTypes: EntityTypeI[]
	error: Error | undefined
}

export default class App extends React.Component<{saveSateCallback: Function, undoRedoCallback: Function, stateIndex: any, maxStateIndex: any, listSize: number[], offsetIndex: {[key: number]: number}},AppState>{
	state: AppState = {
		userFile: undefined,
		entitieTypes: getEntityTypes(),
		error: undefined
	}
	setUserFile = (userFile: UserFile | undefined) => {
		this.setState({
			userFile
		})
	}

	typeColumn: MRT_ColumnDef<EntityTypeI> = {
		header: "Tipo",
		Header: <><Bicon n="pencil"/> Tipo</>,
		accessorKey: "color",
		enableEditing: true,
		muiTableBodyCellEditTextFieldProps: ({row, table}) => ({
			type: "color",
			name: "color",
			onBlur: (evt) => {
				this.setState({entitieTypes: updateEntityType(row.original.name, evt.target.value, row.original.functionIndex)});
				table.setEditingCell(null);
			}
		}),
		Cell: ({row}) => <span className='badge text-body' style={{background: row.original.color}}>{row.original.name}</span>
	}

	anonimizeColumn: MRT_ColumnDef<EntityTypeI> = {
		header: "Anonimização",
		Header: <><Bicon n="pencil"/> Anonimização</>,
		accessorFn: (ent) => {console.log(ent, functionsWithDescriptionArray, ent.functionIndex); return functionsWithDescriptionArray[ent.functionIndex].name},
		enableEditing: true,
		muiTableBodyCellEditTextFieldProps: ({row,table}) => ({
			select: true,
			children: functionsWithDescriptionArray.map( (desc,i) => <option key={i} label={desc.name} value={i} selected={row.original.functionIndex == i}>{desc.name}</option>),
			SelectProps: {
				native: true
			},
			onChange: (evt) => this.setState({entitieTypes: updateEntityType(row.original.name, row.original.color, parseInt(evt.target.value))})
		})
	}

	anonimizeExample: MRT_ColumnDef<EntityTypeI> = {
		header: "Descrição Anonimização",
		accessorFn: (row) => functionsWithDescriptionArray[row.functionIndex].description,
		enableEditing: false,
		muiTableBodyCellProps: {
			className: "text-nowrap"
		}
		
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
		this.setState({
			userFile: undefined,
			entitieTypes: getEntityTypes(),
			error: error
		})
	}

	render(): React.ReactNode {
		return <div className="App vh-100">
			<style>
				{/* Generate type colors */}
				{`[data-anonimize-type^="ERRO"]{
					background: red;
				}`}
				{this.state.entitieTypes.map( ({name, color}) => `[data-anonimize-type="${name}"]{background:${color}}`)}
			</style>
			{this.state.userFile == null ? 
				<>
					<Header />
					{this.state.error ? <div className="alert alert-danger alert-dismissible fade show m-4" role="alert">
						<h4><i className='bi bi-exclamation-triangle-fill'></i>Erro Inesperado!</h4>
						<button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
						<p>A aplicação voltou à página inicial após ter recebido um erro inesperado.</p>
						<details>
							<summary>Ver detalhes:</summary>
							<pre><code>{this.state.error.message}</code></pre>
						</details>
					</div> : <></>}
					<SelectFile key="select" setUserFile={this.setUserFile} />
				</> : 
				<Anonimize key="anonimize" setUserFile={this.setUserFile} file={this.state.userFile} saveSateCallback={this.props.saveSateCallback} undoRedoCallback={this.props.undoRedoCallback} stateIndex={this.props.stateIndex} maxStateIndex={this.props.maxStateIndex} listSize={this.props.listSize} offsetIndex={this.props.offsetIndex} />}
			<BootstrapModal key="modal-types" id="modal-types">
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
									columns={[this.typeColumn,this.anonimizeColumn,this.anonimizeExample]} 
									data={this.state.entitieTypes}
									localization={MRT_Localization_PT}
									renderTopToolbarCustomActions={() => [
										<button key="reset" className="btn btn-warning" onClick={() => this.setState({entitieTypes: restoreEntityTypes()})}><i className='bi bi-arrow-clockwise'></i> Repor</button>
									]}
									muiTableBodyCellProps={({table, cell}) => ({
										onClick: () => {table.setEditingCell(cell);}
									})}
									enableRowActions={true}
									renderRowActions={({row}) => EntityTypesDefaults[row.original.name] ? <></> : <Button className="btn text-danger" onClick={() => {deleteEntityType(row.original.name); this.setState({entitieTypes: getEntityTypes()})}} i='trash' title="Eliminar"/>}
								/>
					<form className="d-flex m-2" onSubmit={(evt) => {
						evt.preventDefault(); 
						let form = evt.target as HTMLFormElement;
						let tipoInput = form.elements.namedItem("tipo") as HTMLInputElement;
						let colorInput = form.elements.namedItem("color") as HTMLInputElement;
						let anonInput = form.elements.namedItem("anonimização") as HTMLSelectElement;
						addEntityType(tipoInput.value, colorInput.value, parseInt(anonInput.value));
						this.setState({entitieTypes: getEntityTypes()});
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
			</BootstrapModal>
		</div>
	}
}
