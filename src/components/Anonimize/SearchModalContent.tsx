import { useMemo, useState } from "react";
import { UserFile } from "../../types/UserFile";
import { useTypes } from "../../util/uses";

export function SearchModalContent({file}: {file:UserFile}){
    let text = useMemo(() => file.doc.textContent || "", [file])
    let types = useTypes(file);
    let [search, setSearch] = useState<string>("")
    let [type, setType] = useState<string>("");
    let results = useMemo(() => {
        if(!search || search.length < 3 ) return null;
        let regx = new RegExp(`${search}`, "ig");
        let rs: RegExpExecArray[] = [];
        let match: RegExpExecArray | null;
        while((match = regx.exec(text)) !== null){
            rs.push(match);
        }
        return rs
    }, [search, text]) || []

    const applySearch = () => {
        for( let r of results ){
            file.pool.removeOffset(r.index, r.index+r[0].length-1, false)
            file.pool.addEntity(r.index, r.index+r[0].length-1, r[0], type, false)
        }
        file.pool.updateOrder("Aplicar pesquisa")
    }

    
    return <>
        <div className="modal-header">
            <div><h5 className="modal-title" id="modal-types-label">Identificar entidade por pesquisa</h5></div>
        </div>
        <div className="modal-body">
            <label htmlFor="modal-search-input" className="form-label">Pesquisa <small>(mínimimo 3 caracteres)</small></label>
            <input id="modal-search-input" className="form-control" pattern="...+" placeholder="Texto a identificar..." name="search" type="text" defaultValue={search} onInput={(e)=>setSearch(e.currentTarget.value)}/>
            <label htmlFor="modal-search-select" className="form-label">Identificar como:</label>
            <select id="modal-search-select" className="form-select" defaultValue={type} onInput={(e) => setType(e.currentTarget.value)}>
                <option value="">Selecionar tipo...</option>
                {types.map( (t,i) => <option key={i} value={t.name}>{t.name}</option>)}
            </select>
            <label className="form-label">Pré-visualização dos primeiros <b>{Math.min(10, results.length)}</b> de <b>{results.length}</b> resultados:</label>
            <ul className="show-type">
                {results.slice(0, Math.min(10, results.length)).map( (r,i) => <li key={i}><Preview type={type} r={r} text={text}/></li>)}
            </ul>
        </div>
        <div className="modal-footer">
            <button className="btn btn-secondary" type="button" data-bs-dismiss="modal">Cancelar</button>
            <div className="flex-grow-1"></div>
            <button disabled={!type || !search || results.length <= 0} onClick={applySearch} className="btn btn-primary" type="button" data-bs-dismiss="modal">Aplicar tipo "{type}" a {results?.length} resultados</button>
        </div>
    </>
}

function Preview({text, r, type}: {text: string, r: RegExpExecArray, type: string}){
    let first = text.substring(0, r.index).match(/\b.*$/);
    let last  = text.substring(r.index+r[0].length).match(/^.*\b/);
    return <>{first}<span data-anonimize-type={type} data-anonimize-first="true" data-anonimize-last="true">{r[0]}</span>{last}</>
    
}