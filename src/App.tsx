import React from 'react';
import Anonimize from './components/Anonimize';
import Header from './components/Header';
import SelectFile from './components/SelectFile';
import { UserFile } from './types/UserFile';
import BootstrapModal from './util/BootstrapModal';
import MaterialReactTable, { MRT_ColumnDef } from 'material-react-table';
import { MRT_Localization_PT } from 'material-react-table/locales/pt';
import { addEntityType, EntityTypeI, getEntityTypes, restoreEntityTypes, TypeNames, updateEntityType } from './types/EntityTypes';
import { AnonimizeFunctionName, functions } from './util/anonimizeFunctions';
import { createFilter, deleteFilter, FiltersI, getFilters, restoreFilters, updateFilter } from './types/EntityFilters';
import { updateSavedUserFiles } from './util/UserFileCRUDL';

interface AppState{
	userFile: UserFile | undefined
	entitieTypes: EntityTypeI[]
	filters: FiltersI[]
	error: Error | undefined
}

export default class App extends React.Component<{},AppState>{
	state: AppState = {
		userFile: undefined,
		entitieTypes: getEntityTypes(),
		filters: getFilters(),
		error: undefined
	}
	setUserFile = (userFile: UserFile | undefined) => {
		this.setState({
			userFile
		})
	}

	typeColumn: MRT_ColumnDef<EntityTypeI> = {
		header: "Tipo",
		accessorKey: "color",
		enableEditing: true,
		muiTableBodyCellEditTextFieldProps: ({row, table}) => ({
			type: "color",
			name: "color",
			onBlur: (evt) => {
				this.setState({entitieTypes: updateEntityType(row.original.name as TypeNames, evt.target.value, row.original.functionName)});
				table.setEditingCell(null);
			}
		}),
		Cell: ({row}) => <span className='badge text-body' style={{background: row.original.color}}>{row.original.name}</span>
	}

	anonimizeColumn: MRT_ColumnDef<EntityTypeI> = {
		header: "Anonimização",
		accessorKey: "functionName",
		enableEditing: true,
		muiTableBodyCellEditTextFieldProps: ({row,table}) => ({
			select: true,
			children: Object.keys(functions).map( name => <option label={name} value={name}>{name}</option>),
			SelectProps: {
				native: true
			},
			onChange: (evt) => this.setState({entitieTypes: updateEntityType(row.original.name as TypeNames, row.original.color, evt.target.value as AnonimizeFunctionName)})
		})
	}

	textColumn: MRT_ColumnDef<FiltersI> = {
		header: "Texto",
		accessorKey: "text",
		enableEditing: true,
		muiTableBodyCellEditTextFieldProps: ({row}) => ({
			onChange: (evt) => this.setState({filters: updateFilter(row.original.text, evt.target.value, row.original.types)})
		})		
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
		this.setState({
			userFile: undefined,
			filters: getFilters(),
			entitieTypes: getEntityTypes(),
			error: error
		})
	}

	render(): React.ReactNode {
		return <div className="App">
			<style>
				{/* Generate type colors */}
				{`[data-anonimize-type^="ERRO"]{
					background: red;
				}`}
				{this.state.entitieTypes.map( ({name, color}) => `[data-anonimize-type="${name}"]{background:${color}}`)}
			</style>
			<Header actions={[
				<span key="types" className="nav-link red-link fw-bold" role="button" data-bs-toggle="modal" data-bs-target="#modal-types">Tipos de Entidades</span>,
				<i key="space-1" className='bi bi-dot red-link fw-bold'></i>,
				<span key="filters" className="nav-link red-link fw-bold" role="button" data-bs-toggle="modal" data-bs-target="#modal-filters">Filtragem</span>,
				<i key="space-2" className='bi bi-dot red-link fw-bold'></i>,
				<span key="about" className="nav-link fs-6 bg-transparent red-link fw-bold" role="button" data-bs-toggle="modal" data-bs-target="#modal-about">Sobre</span>
			]}/>
			{this.state.userFile == null ? 
				<>
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
				<Anonimize key="anonimize" setUserFile={this.setUserFile} file={this.state.userFile} filters={this.state.filters} />}
			<BootstrapModal key="modal-about" id="modal-about">
				<div className="modal-header">
					<div>
						<h5 className="modal-title" id="modal-about-label">Sobre o Anonimizador</h5>
						<p className="m-0">Ferramenta para apoio à anonimização de acórdãos desenvolvida para utilização da biblioteca do STJ.</p>
					</div>
				</div>
          		<div className="modal-body">
              		<h6>Prespectiva geral</h6>
          		</div>
          		<div className="modal-footer">
              		<div className="flex-grow-1">
						<div>
							<small>Documentos Google Drive:&nbsp;<a href="https://docs.google.com/document/d/1yfMYeehjUpf7xJiSYZAVUpdCd5UlQDswt7bOUONwi3E/edit?usp=sharing" className="red-link text-decoration-none" target="_blank" rel="noreferrer">Anonimização - Ajuda</a></small>
						</div>
						<div><small>Código disponível em: <a href="https://github.com/stjiris/anonimizador" target="_blank" className="red-link text-decoration-none" rel="noreferrer"><i className="bi bi-github"></i>stjiris/sumarizador</a></small></div>
              		</div>
            	  	<button className="btn btn-secondary" type="button" data-bs-dismiss="modal">Fechar</button>
          		</div>
			</BootstrapModal>
			<BootstrapModal key="modal-types" id="modal-types">
				<div className="modal-header">
					<div><h5 className="modal-title" id="modal-types-label">Tipos de entidades</h5></div>
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
									enableRowActions={false}
									enableColumnFilters={false}
									enableSorting={false}
									enableGlobalFilter={false}
									enableFullScreenToggle={false}
									enableColumnActions={false}
									editingMode="cell"
									columns={[this.typeColumn,this.anonimizeColumn]} 
									data={this.state.entitieTypes}
									localization={MRT_Localization_PT}
									renderTopToolbarCustomActions={() => [
										<button key="reset" className="btn btn-warning" onClick={() => this.setState({entitieTypes: restoreEntityTypes()})}><i className='bi bi-arrow-clockwise'></i> Repor</button>
									]}
									muiTableBodyCellProps={({table, cell}) => ({
										onClick: () => {table.setEditingCell(cell);}
									})}
								/>
					<form className="d-flex m-2" onSubmit={(evt) => {
						evt.preventDefault(); 
						let form = evt.target as HTMLFormElement;
						let tipoInput = form.elements.namedItem("tipo") as HTMLInputElement;
						let colorInput = form.elements.namedItem("color") as HTMLInputElement;
						let anonInput = form.elements.namedItem("anonimização") as HTMLSelectElement;
						this.setState({entitieTypes: addEntityType(tipoInput.value, colorInput.value, anonInput.value as AnonimizeFunctionName)});}}>
						<input className="form-control" name="tipo" placeholder="Tipo..." required></input>
						<input  className="form-control form-control-color" name="color" type="color"></input>
						<select  className="form-select" name="anonimização">{Object.keys(functions).map( name => <option label={name} value={name}>{name}</option>)}</select>
						<button className="form-control btn btn-primary">Adicionar</button>
					</form>
				</div>
				<div className="modal-footer">
					<div className="flex-grow-1"></div>
					<button className="btn btn-secondary" type="button" data-bs-dismiss="modal">Fechar</button>
				</div>
			</BootstrapModal>
			<BootstrapModal key="modal-filters" id="modal-filters">
				<div className="modal-header">
					<div>
						<h5 className="modal-title" id="modal-filters-label">Filtragem</h5>
						<p>Filtros automáticamente aplicados após receber as sugestões do NER.</p>
					</div>
				</div>
				<div className="modal-body p-0">
					<MaterialReactTable
									key="type-table"
									enableColumnResizing={true}
									enableRowSelection={false}
									enableColumnOrdering
									enableDensityToggle={false}
									enableHiding={false}
									enableStickyHeader
									enablePagination={false}
									enableEditing={true}
									positionActionsColumn="last"
									editingMode="cell"
									columns={[this.textColumn]} 
									data={this.state.filters}
									localization={MRT_Localization_PT}
									enableRowActions={true}
									renderRowActions={({row}) => <button className='btn btn-danger' onClick={() => this.setState({filters: deleteFilter(row.original.text)})}><i className='bi bi-trash'></i> Eliminar</button>}
									renderTopToolbarCustomActions={() => [
										<button key="reset" className="btn btn-warning" onClick={() => this.setState({filters: restoreFilters()})}><i className='bi bi-arrow-clockwise'></i> Repor</button>
									]}
								/>
					<form className="d-flex m-2" onSubmit={(evt) => {
						evt.preventDefault(); 
						let form = evt.target as HTMLFormElement;
						let filtroInput = form.elements.namedItem("filtro") as HTMLInputElement;
						this.setState({filters: createFilter(filtroInput.value, [])});}}>
						<input className="form-control" name="filtro" placeholder="Filtro..." required></input>
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
