import { useMemo, useRef, useState } from "react";
import { UserFile } from "@/core/UserFile";
import { useTypes } from "@/core/uses";
import { AddEntityDryRun } from "@/types/EntityPool";
import { UserFileInterface } from "@/types/UserFile";

// We want exact matches
// https://stackoverflow.com/a/3561711/2573422
function escapeRegex(string: string) {
    return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function SearchModalContent({file}: {file:UserFileInterface}){
    let text = useMemo(() => file.doc.textContent || "", [file])
    let types = useTypes(file);
    let [search, setSearch] = useState<string>("")
    let [type, setType] = useState<string>("");
    let [ignore, setIgnore] = useState<boolean>(true);
    let inputRef = useRef<HTMLInputElement>(null);
    let selectRef = useRef<HTMLSelectElement>(null);
    let results = useMemo(() => {
        if(!search || search.length < 3 ) return null;
        let regx = new RegExp(escapeRegex(search), "ig");
        let rs: RegExpExecArray[] = [];
        let match: RegExpExecArray | null;
        while((match = regx.exec(text)) !== null){
            if( ignore || file.pool.addEntityDryRun(match.index, match.index+match[0].length-1, match[0])[0] !== AddEntityDryRun.CHANGE_TYPE ){
                rs.push(match);
            }
        }
        return rs
    }, [file, search, text, ignore]) || []

    const applySearch = () => {
        for( let r of results ){
            file.pool.removeOffset(r.index, r.index+r[0].length-1, false)
            file.pool.addEntity(r.index, r.index+r[0].length-1, r[0], type, false)
        }
        file.pool.updateOrder("Aplicar pesquisa")
        setSearch("");
        if(inputRef.current){
            inputRef.current.value = "";
        }
        setType("");
        if(selectRef.current){
            selectRef.current.value = "";
        }
    }

    
    return <>
        <div className="modal-header">
            <div><h5 className="modal-title" id="modal-types-label">Identificar entidade por pesquisa</h5></div>
        </div>
        <div className="modal-body">
            <label htmlFor="modal-search-input" className="form-label">Pesquisa <small>(mínimimo 3 caracteres)</small></label>
            <input ref={inputRef} id="modal-search-input" className="form-control" pattern="...+" placeholder="Texto a identificar..." name="search" type="text" defaultValue={search} onInput={(e)=>setSearch(e.currentTarget.value)}/>
            <div className="row">
                <div className="col-6">
                    <label htmlFor="modal-search-select" className="form-label">Identificar como:</label>
                </div>
                <div className="col-6">
                    <div className="form-check">
                        <input className="form-check-input" type="checkbox" value="" id="modal-search-check" defaultChecked={ignore} onInput={(e) => setIgnore(e.currentTarget.checked)}/>
                        <label className="form-check-label" htmlFor="modal-search-check">
                            Ignorar entidades já identificadas
                        </label>
                    </div>
                </div>
                <select ref={selectRef} id="modal-search-select" className="form-select" defaultValue={type} onInput={(e) => setType(e.currentTarget.value)}>
                    <option value="">Selecionar tipo...</option>
                    {types.map( (t,i) => <option key={i} value={t.name}>{t.name}</option>)}
                </select>
            </div>
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

    return <>{first}<span data-anonimize-type={type || "SEL*"} data-anonimize-first="true" data-anonimize-last="true">{r[0]}</span>{last}</>
    
}