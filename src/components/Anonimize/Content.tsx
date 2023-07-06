import { useEffect, useMemo, useRef } from 'react'
import { AnonimizeStateState } from '../../types/AnonimizeState'
import AnonimizeBlock from './Block';
import AnonimizeTooltip from './Tooltip';
import { UserFile } from '../../types/UserFile';
import { useEntities, useImages, useSpecificOffsets, useTypes, useTypesDict } from '../../util/uses';

interface AnonimizeContentProps {
    file: UserFile
    anonimizeState: AnonimizeStateState
    showTypes: boolean
    accessHtml: (html: string) => void
}

export default function AnonimizeContent(props: AnonimizeContentProps){
    const contentRef = useRef<HTMLDivElement>(null);
    const nodesRef = useRef<HTMLElement[]>([]);

    const offsets = useSpecificOffsets(props.file.pool)
    const entityTypes = useTypesDict(props.file);
    const images = useImages(props.file)

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
            <AnonimizeBlock element={props.file.doc} offset={0} types={entityTypes} specificOffsets={offsets} anonimizeState={props.anonimizeState}/>
        </div>
        <AnonimizeTooltip entityTypes={Object.values(entityTypes)} pool={props.file.pool} contentRef={contentRef} nodesRef={nodesRef} />
    </>
}
