import React from 'react';
import Anonimize from './components/Anonimize';
import Header from './components/Header';
import SelectFile from './components/SelectFile';
import { UserFile } from './types/UserFile';
import BootstrapModal from './util/BootstrapModal';
import { _EntityType, EntityTypeI, EntityTypes } from './types/EntityType';
import MaterialReactTable, { MRT_ColumnDef } from 'material-react-table';
import { typeColors, updateColor } from './util/typeColors';
import { MRT_Localization_PT } from 'material-react-table/locales/pt';

interface AppState{
	userFile: UserFile | undefined
	typeColorsMap: [string, string][]
}

export default class App extends React.Component<{},AppState>{
	state: AppState = {
		userFile: undefined,
		typeColorsMap: Object.entries(typeColors)
	}
	setUserFile = (userFile: UserFile | undefined) => {
		this.setState({
			userFile
		})
	}

	render(): React.ReactNode {
		return <div className="App">
			<style>
				{/* Generate type colors */}
				{this.state.typeColorsMap.map( ([name, color]) => `[data-anonimize-type="${name}"]{background:${color}}`)}
			</style>
			<Header actions={[
				<span className="nav-link red-link fw-bold" role="button" data-bs-toggle="modal" data-bs-target="#modal-types">Tipos de Entidades</span>,
				<i className='bi bi-dot red-link fw-bold'></i>,
				<span className="nav-link fs-6 bg-transparent red-link fw-bold" role="button" data-bs-toggle="modal" data-bs-target="#modal-about">Sobre</span>
			]}/>
			{this.state.userFile == null ? <SelectFile key="select" setUserFile={this.setUserFile} /> : <Anonimize key="anonimize" setUserFile={this.setUserFile} file={this.state.userFile} />}
			<BootstrapModal id="modal-about">
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
			<BootstrapModal id="modal-types">
				<div className="modal-header">
					<div><h5 className="modal-title" id="modal-types-label">Tipos de entidades</h5></div>
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
									editingMode="row"
									onEditingRowSave={({exitEditingMode, values, row})=>{
										updateColor(values["Tipo"], values["Cor"])
										this.setState({typeColorsMap: Object.entries(typeColors)})
										exitEditingMode();
									}}
									columns={typeTableColumns} 
									data={this.state.typeColorsMap}
									localization={MRT_Localization_PT}/>
				</div>
				<div className="modal-footer">
					<div className="flex-grow-1"></div>
					<button className="btn btn-secondary" type="button" data-bs-dismiss="modal">Fechar</button>
				</div>
			</BootstrapModal>
		</div>
	}
}


const typeTableColumns: MRT_ColumnDef<[string,string]>[] = [
	{
			header: "Tipo",
			accessorFn: ([k,_v]) => k,
			enableEditing: false,
			Cell: ({row}) => <span className='badge text-body' style={{background: row.original[1]}}>{row.original[0]}</span>
	},
	{
			header: "Cor",
			accessorFn: ([_k,v]) => v,
			enableEditing: true,
			muiTableBodyCellEditTextFieldProps: {
				type: "color"
			}
	}
]
