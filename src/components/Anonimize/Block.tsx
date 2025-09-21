import React, { useId, useMemo } from "react"
import { AnonimizeStateState } from "../../types/AnonimizeState"
import { EntityTypeI } from "../../types/EntityTypes"
import { SpecificOffsetRange } from "../../util/uses"
import AnonimizeToken from "./Token"


interface AnonimizeBlockProps{
    element: ChildNode
    offset: number
    specificOffsets: SpecificOffsetRange[]
    types: Record<string,EntityTypeI>
    anonimizeState: AnonimizeStateState
}


export default function AnonimizeBlock(props: AnonimizeBlockProps){
    let elmt = props.element;

    if( elmt.nodeType === Node.TEXT_NODE ){
        let elmtStr = elmt.nodeValue || ""; // should never be null tho...
        let tokensElems = [];
        var reg = /([0-9]+)|([A-Za-zÀ-ÖØ-öø-ÿ]+)|([^A-Za-zÀ-ÖØ-öø-ÿ0-9])/g;
        var token: RegExpExecArray | null;
        let remaining = props.specificOffsets;
        while((token = reg.exec(elmtStr)) !== null) {
            let current = remaining[0];
            if( !current ) {
                tokensElems.push(<AnonimizeToken key={token.index} string={token[0]} offset={props.offset+token.index} anonimizeState={props.anonimizeState} />);
                continue
            }
            if( current.end < props.offset+token.index+token[0].length ){
                remaining = remaining.slice(1); // current token ends after current
            }
            if( current.start > props.offset+token.index ){
                // we dont want to use it yet
                tokensElems.push(<AnonimizeToken  key={token.index} string={token[0]} offset={props.offset+token.index} anonimizeState={props.anonimizeState} />);
            }
            else{
                tokensElems.push(<AnonimizeToken  type={props.types[current.ent.type]} key={token.index} string={token[0]} offset={props.offset+token.index} specificOffset={current} anonimizeState={props.anonimizeState} />);
            }
        }
        return <>{tokensElems}</>
    }

    let Tag = elmt.nodeName.toLowerCase();
    let elmtElmt: HTMLElement = elmt as HTMLElement;

    let r = [];
    let suboffset = 0;
    let remaining = props.specificOffsets;
    for(let i = 0; i < elmt.childNodes.length; i++){
        let size = (elmt.childNodes[i].textContent || "").length;
        let lastIndex = remaining.findIndex( o => o.start > props.offset+suboffset+size );
        let cents = lastIndex === -1 ? remaining : remaining.slice(0, lastIndex)
        // If the last offset is also on the next block keep it
        if( remaining[cents.length-1] && remaining[cents.length-1].end > props.offset+suboffset+size ){
            remaining = remaining.slice(cents.length-1)
        }
        else{
            remaining = remaining.slice(cents.length)
        }
        r.push(<AnonimizeBlock key={i} element={elmt.childNodes[i]} offset={props.offset + suboffset} specificOffsets={cents} types={props.types} anonimizeState={props.anonimizeState}/>)
        suboffset += (elmt.childNodes[i].textContent || "").length
    }
    
    let attrs: any  = {};
    for(let attr of elmtElmt.getAttributeNames()){
        attrs[attr] = elmtElmt.getAttribute(attr);
    }
    if( 'style' in attrs ){
        let s = attrs['style'];
        delete attrs['style'];
        attrs['STYLE'] = s; // style should be a JS objecy, STYLE gives warning but its not intercepted
    }
    
    if( 'class' in attrs ){
        let c = attrs['class'];
        delete attrs['class'];
        attrs['className'] = c;
    }

    if( Tag === 'a' && attrs['href'] && !attrs['href'].startsWith('#')){
        attrs['target'] = '_blank'; // prevent user to exit page
    }

    if( r.length === 0 ){
        return React.createElement(Tag, attrs);
    }
    else{
        return React.createElement(Tag, attrs, r);
    }
}