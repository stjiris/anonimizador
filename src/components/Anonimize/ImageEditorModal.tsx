import { useCallback, useEffect, useRef, useState } from "react";
import { UserFile } from "../../types/UserFile";
import BootstrapModal from "../../util/BootstrapModal";
import {ReactSketchCanvas} from "react-sketch-canvas"
import { Button } from "../../util/BootstrapIcons";
import { AnonimizeImage } from "../../types/AnonimizeImage";


export function ImageEditorModal(props: {file: UserFile}){
    const [imageElmt, setImageElmt] = useState<HTMLImageElement>()

    const onShow = (elmt: HTMLElement | null) => {
        if( elmt?.tagName === "IMG" ){
            setImageElmt(elmt as HTMLImageElement)
        }
        else{
            setImageElmt(undefined)
        }
    }

    return <BootstrapModal id="modal-image-editor" onShow={onShow}>
        <div className="modal-body">
            <div className="modal-header">
                <div><h5 className="modal-title" id="modal-types-label">Anonimizar Imagem</h5></div>
            </div>
            <div className="modal-body">
                {imageElmt ? 
                <ImageEditor file={props.file} imageElmt={imageElmt} />
                :
                <>Selecione uma imagem para a editar</>
                }
            </div>
            <div className="modal-footer">
                <div className="flex-grow-1"></div>
                <button className="btn btn-secondary" type="button" data-bs-dismiss="modal">Fechar</button>
            </div>
        </div>
    </BootstrapModal>
}

function ImageEditor(props: {file: UserFile, imageElmt: HTMLImageElement}){
    let canvasRef = useRef<HTMLCanvasElement>(null)
    let ctxRef = useRef<CanvasRenderingContext2D>()

    let anonImage = props.file.images[parseInt(props.imageElmt.dataset.imageId!)]

    let drawBase = () => {
        if( !ctxRef.current ) return;
        let ctx = ctxRef.current;
        let img = new Image();
        img.src = anonImage.anonimizedSrc || anonImage.originalSrc
        img.onload = () => {
            ctx.canvas.width = img.width
            ctx.canvas.height = img.height
            ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height)
            ctx.drawImage(img, 0, 0)
        }
    } 

    useEffect(() => {
        if( !canvasRef.current ) return;
        let canvas = canvasRef.current
        let ctx = canvas.getContext("2d");
        if( !ctx ) return;
        ctxRef.current = ctx;
        
        drawBase();

        let firstClick: number[] | null = null;

        let mouseupEvent = (evt: MouseEvent) => {
            let rect = canvas.getBoundingClientRect();
            let [mouseX,mouseY] = [evt.clientX - rect.left, evt.clientY - rect.top]
            if( !firstClick ){
                firstClick = [mouseX, mouseY]
            }
            else{
                ctx?.beginPath()
                ctx?.moveTo(firstClick[0], firstClick[1]);
                ctx?.lineTo(firstClick[0], mouseY);
                ctx?.lineTo(mouseX, mouseY);
                ctx?.lineTo(mouseX, firstClick[1])
                ctx?.fill()
                firstClick = null
            }
        }

        canvas.addEventListener("mouseup", mouseupEvent)

        return () => {
            canvas.removeEventListener("mouseup", mouseupEvent)
        }

    }, [anonImage])

    const onClickSave = () => {        
        anonImage.anonimizedSrc = canvasRef.current?.toDataURL()
        drawBase()
        props.file.notifyImages()
    }

    const onClickReset = () => {
        anonImage.anonimizedSrc = undefined
        drawBase()
        props.file.notifyImages()
    }
    
    return <>
        <div className="w-100">
            <canvas id="image-editor" ref={canvasRef}/>
        </div>
        <div className="w-100">
            <Button className="btn btn-primary" i="save" text="Guardar" onClick={onClickSave}/>
            <Button className="btn btn-danger" i="arrow-counterclockwise" text="Recomeçar" onClick={onClickReset}/>
        </div>

    </>
}