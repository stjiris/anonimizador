import { useEffect, useRef } from 'react'
import { AnonimizeStateState } from '../../types/AnonimizeState'
import AnonimizeBlock from './Block';
import AnonimizeTooltip from './Tooltip';
import { UserFile } from '../../types/UserFile';
import { useEntities, useImages, useTypes } from '../../util/uses';

interface AnonimizeContentProps {
    file: UserFile
    anonimizeState: AnonimizeStateState
    showTypes: boolean
    accessHtml: (html: string) => void
}

export default function AnonimizeContent(props: AnonimizeContentProps){
    const contentRef = useRef<HTMLDivElement>(null);
    const nodesRef = useRef<HTMLElement[]>([]);

    let listItems: JSX.Element[] = [];
    let offset = 0;

    const ents = useEntities(props.file.pool)
    const entityTypes = useTypes(props.file);
    const images = useImages(props.file)
    
    for(let i=0; i < props.file.doc.childNodes.length; i++){
        let size = (props.file.doc.childNodes[i].textContent || "").length;
        let cents = ents.filter( e => e.offsets.some( o => o.start >= offset && o.end <= offset+size))
        listItems.push(<AnonimizeBlock key={i} element={props.file.doc.childNodes[i]} offset={offset} types={entityTypes} ents={cents} anonimizeState={props.anonimizeState}/>)
        offset += size;
    }

    useEffect(() => {
        nodesRef.current = Array.from(contentRef.current?.querySelectorAll(`[data-offset]`) as NodeListOf<HTMLElement>)
        props.accessHtml(contentRef.current?.innerHTML || "");

        let imagesElm = Array.from(contentRef.current?.getElementsByTagName("img") as HTMLCollectionOf<HTMLImageElement>)

        imagesElm.forEach((img,i) =>{
            img.dataset.imageId = i.toString()
            img.dataset.bsToggle = "modal"
            img.dataset.bsTarget = "#modal-image-editor"
            if( props.anonimizeState !== AnonimizeStateState.ORIGINAL){
                if( images[i] && images[i].anonimizedSrc ){
                    img.src = images[i].anonimizedSrc!
                }
                else{
                    img.src = images[i].originalSrc
                }
            }
            else{
                img.src = images[i].originalSrc
            }
        })
    }, [props.anonimizeState, images])


    
    return <>
        <div id="content" className={props.showTypes ? 'show-type' : 'show-cod'} ref={contentRef}>
            {listItems}
        </div>
        <AnonimizeTooltip entityTypes={entityTypes} pool={props.file.pool} contentRef={contentRef} nodesRef={nodesRef} />
    </>
}
