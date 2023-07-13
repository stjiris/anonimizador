import { AnonimizeStateState } from "../../types/AnonimizeState";
import { EntityTypeI } from "../../types/EntityTypes";
import { SpecificOffsetRange } from "../../util/uses";


export function Render(){

}

export function renderBlock(doc: ChildNode, entityTypes: Record<string, EntityTypeI>, offsets: SpecificOffsetRange[], anonimizeState: AnonimizeStateState, offset: number) {
    let elmt = doc;

    if( elmt.nodeType === Node.TEXT_NODE ){
        let elmtStr = elmt.nodeValue || ""; // should never be null tho...
        let tokenFragment = "";
        var reg = /([0-9]+)|([A-Za-zÀ-ÖØ-öø-ÿ]+)|([^A-Za-zÀ-ÖØ-öø-ÿ0-9])/g;
        var token: RegExpExecArray | null;
        let remaining = offsets;
        while((token = reg.exec(elmtStr)) !== null) {
            let current = remaining.at(0);
            if( !current ) {
                tokenFragment += renderToken(token[0],offset+token.index, anonimizeState);
                continue
            }
            if( current.end < offset+token.index+token[0].length ){
                remaining = remaining.slice(1); // current token ends after current
            }
            if( current.start > offset+token.index ){
                // we dont want to use it yet
                tokenFragment += renderToken( token[0],offset+token.index, anonimizeState);
            }
            else{
                tokenFragment += renderToken( token[0], offset+token.index, anonimizeState, entityTypes[current.ent.type], current);
            }
        }
        return tokenFragment
    }

    let Tag = elmt.nodeName.toLowerCase();
    let elmtElmt: HTMLElement = elmt as HTMLElement;

    let ht = "";
    let suboffset: number = 0;
    let remaining = offsets;
    for(let i = 0; i < elmt.childNodes.length; i++){
        let size = (elmt.childNodes[i].textContent || "").length;
        let lastIndex = remaining.findIndex( o => o.start > offset+suboffset+size );
        let cents = lastIndex === -1 ? remaining : remaining.slice(0, lastIndex)
        // If the last offset is also on the next block keep it
        if( remaining[cents.length-1] && remaining[cents.length-1].end > offset+suboffset+size ){
            remaining = remaining.slice(cents.length-1)
        }
        else{
            remaining = remaining.slice(cents.length)
        }
        ht += renderBlock(elmt.childNodes[i], entityTypes, cents, anonimizeState, offset + suboffset)
        suboffset += (elmt.childNodes[i].textContent || "").length
    }


    let attrs: string[]  = [];
    let localHref = elmtElmt.getAttribute("href")?.startsWith("#");
    for(let attr of elmtElmt.getAttributeNames()){
        attrs.push(`${attr}="${elmtElmt.getAttribute(attr)}"`)
    }

    if( Tag === 'a' && !localHref ){
        attrs.push('target="_blank"'); // prevent user to exit page
    }
    
    return `<${Tag} ${attrs.join(" ")}>${ht}</${Tag}>`;
}



export function renderToken(value: string, offset: number, anonimizeState: AnonimizeStateState, type?: EntityTypeI, specificOffset?: SpecificOffsetRange){
    let dataAttrs: {[_:string]: string} = {
        'data-offset': offset.toString()
    };
    
    if( specificOffset && type ){
        dataAttrs['data-anonimize-cod'] = specificOffset.ent.anonimizingFunction(type)(specificOffset.preview, specificOffset.ent.type, specificOffset.ent.index, specificOffset.ent.typeIndex, specificOffset.ent.funcIndex);
        dataAttrs['data-anonimize-type'] = type.name;
        dataAttrs['data-anonimize-color'] = type.color;
        dataAttrs['data-anonimize-offset-start'] = specificOffset.start.toString()
        dataAttrs['data-anonimize-offset-end'] = specificOffset.end.toString()
        if( specificOffset.start === offset ){
            dataAttrs['data-anonimize-first'] = "true";
        }
        if(  offset === specificOffset.end-value.length+1 ){
            dataAttrs['data-anonimize-last'] = "true";
        }
    }

    switch(anonimizeState){
        case AnonimizeStateState.ANONIMIZED:
            if( 'data-anonimize-first' in dataAttrs ){
                return dataAttrs['data-anonimize-cod']
            }
            else if( 'data-anonimize-cod' in dataAttrs ){
                return ""
            }
            else{
                return value
            }
        case AnonimizeStateState.ORIGINAL:
            return  value;
        case AnonimizeStateState.TAGGED:
            return `<span ${Object.entries(dataAttrs).map(([k,v]) => `${k}="${v}"`).join("")}>${value}</span>`
        default:
            return "";
    }   
}