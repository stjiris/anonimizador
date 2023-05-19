import { useCallback, useEffect, useRef, useState } from "react";
import { UserFile } from "../../types/UserFile";
import BootstrapModal from "../../util/BootstrapModal";
import {ReactSketchCanvas} from "react-sketch-canvas"
import { Button } from "../../util/BootstrapIcons";
import { AnonimizeImage } from "../../types/AnonimizeImage";
import { normalizeEntityString } from "../../types/Entity";


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

    const onHide = () => setImageElmt(undefined)

    return <BootstrapModal id="modal-image-editor" onShow={onShow} onHide={onHide}>
        <div className="modal-body">
            <div className="modal-header">
                <div><h5 className="modal-title" id="modal-types-label">Anonimizar Imagem</h5></div>
                <small>Estamos a trabalhar nesta funcionalidade. Poderão ocurrer erros.</small>
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
    let canvasBackgroundRef = useRef<HTMLCanvasElement>(null)
    let canvasForegroundRef = useRef<HTMLCanvasElement>(null)
    let ctxBackgroundRef = useRef<CanvasRenderingContext2D|null>(null)
    let ctxForegroundRef = useRef<CanvasRenderingContext2D|null>(null)
    let animFrameRequest = useRef<number>()
    let boxStart = useRef<number[]|null>(null)
    let mousePos = useRef<number[]|null>(null)
    let boxes = useRef<number[][]>([])

    useEffect(() => {
        if( !canvasBackgroundRef.current ) return;
        if( !canvasForegroundRef.current ) return;

        ctxBackgroundRef.current = canvasBackgroundRef.current.getContext("2d");
        ctxForegroundRef.current = canvasForegroundRef.current.getContext("2d");
        
        if( !ctxBackgroundRef.current ) return;
        if( !ctxForegroundRef.current ) return;

        const ctx = setup(ctxBackgroundRef.current, ctxForegroundRef.current, props.file.images[parseInt(props.imageElmt.dataset.imageId!)])
        
        const _draw = () => {
            draw(ctxBackgroundRef.current!, ctxForegroundRef.current!, ctx, boxStart.current, mousePos.current, boxes.current)
            animFrameRequest.current = requestAnimationFrame(_draw)
        }
        animFrameRequest.current = requestAnimationFrame(_draw)

        return () => {
            cancelAnimationFrame(animFrameRequest.current!)
        }
    }, [props.imageElmt])

    const onMouseDown = (evt: React.MouseEvent) => {
        if( !canvasForegroundRef.current ) return;
        let rect = canvasForegroundRef.current?.getBoundingClientRect();
        let [mouseX, mouseY] = [evt.clientX-rect?.left, evt.clientY-rect?.top]
        boxStart.current = [mouseX, mouseY]
        mousePos.current = [mouseX, mouseY]
    }

    const onMouseMove = (evt: React.MouseEvent) => {
        if( !canvasForegroundRef.current ) return;
        let rect = canvasForegroundRef.current?.getBoundingClientRect();
        let [mouseX, mouseY] = [evt.clientX-rect?.left, evt.clientY-rect?.top]
        mousePos.current = [mouseX, mouseY]
    }
    const onMouseUp = (evt: React.MouseEvent) => {
        if( !canvasForegroundRef.current ) return;
        let rect = canvasForegroundRef.current?.getBoundingClientRect();
        let [mouseX, mouseY] = [evt.clientX-rect?.left, evt.clientY-rect?.top]
        mousePos.current = [mouseX, mouseY]
        if( !boxStart.current ) return;
        let [initialX, initialY] = boxStart.current;
        boxStart.current = null;
        boxes.current.push([initialX,initialY,mouseX,mouseY]);
    }

    const onClickSave = () => {
        props.file.images[parseInt(props.imageElmt.dataset.imageId!)].anonimizedSrc = canvasBackgroundRef.current?.toDataURL()
        props.file.notifyImages()
    }

    const onClickRestore = () => {
        props.file.images[parseInt(props.imageElmt.dataset.imageId!)].anonimizedSrc = undefined
        boxes.current = []
        props.file.notifyImages()
    }

    const onClickRecognize = async () => {
        const Tesseract = ((window as any).Tesseract! as any);
        const worker = await Tesseract.createWorker();
        await worker.loadLanguage("por");
        await worker.initialize("por");
        let {data: {words}} = await worker.recognize(canvasBackgroundRef.current!)
        boxes.current = (props.file.pool.entities.length > 0 ? words.filter(({text}:any) => props.file.pool.entities.some(e => e.offsets.some(o => normalizeEntityString(o.preview).includes(normalizeEntityString(text)) ))) : words).filter(({text}: any) => text.length > 3).map(({bbox}: any) => [bbox.x0, bbox.y0, bbox.x1, bbox.y1])
        console.log(words) // arry use bbox
    }

    const onMouseClick = (evt: React.MouseEvent) => {
        if( !canvasForegroundRef.current ) return;
        let rect = canvasForegroundRef.current?.getBoundingClientRect();
        let [mouseX, mouseY] = [evt.clientX-rect?.left, evt.clientY-rect?.top]
        mousePos.current = [mouseX, mouseY]
        boxes.current = boxes.current.filter(([x0,y0,x1,y1]) => mouseX < Math.min(x0, x1) || mouseX > Math.max(x0,x1) || mouseY < Math.min(y0, y1) || mouseY > Math.max(y0,y1));
    }


    return <>
        <div style={{position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: "500px", margin: "10px"}}>
            <canvas ref={canvasBackgroundRef} style={{position: "absolute", border: "2px solid var(--secondary-gold)"}}/>
            <canvas ref={canvasForegroundRef} style={{position: "absolute", border: "2px solid var(--secondary-gold)"}} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onClick={onMouseClick}/>
        </div>
        <div className="w-100">
            <Button className="btn btn-primary" i="search" text="Encontrar texto" onClick={onClickRecognize}/>
            <Button className="btn btn-success" i="save" text="Guardar" onClick={onClickSave}/>
            <Button className="btn btn-danger" i="arrow-counterclockwise" text="Recomeçar" onClick={onClickRestore}/>
        </div>

    </>
}

function setup(backCtx: CanvasRenderingContext2D, foreCtx: CanvasRenderingContext2D, image: AnonimizeImage){
    let originalImage = new Image();
    originalImage.src = image.originalSrc;
    let anonimizedImage = null;
    if( image.anonimizedSrc ){
        anonimizedImage = new Image();
        anonimizedImage.src = image.anonimizedSrc;
    }
    originalImage.onload = () => {
        let c = 1;
        if( originalImage.height > 500 ){
            c = 500 / originalImage.height
        }
        backCtx.canvas.width = originalImage.width*c
        backCtx.canvas.height = originalImage.height*c
        foreCtx.canvas.width = originalImage.width*c
        foreCtx.canvas.height = originalImage.height*c
    }
    return {originalImage, anonimizedImage}
}

function draw(backCtx: CanvasRenderingContext2D, foreCtx: CanvasRenderingContext2D, {originalImage, anonimizedImage}:{originalImage: HTMLImageElement, anonimizedImage: HTMLImageElement | null}, boxStart: number[]|null, mousePos: number[]|null, boxes: number[][]){
    backCtx.clearRect(0,0,backCtx.canvas.width,backCtx.canvas.height)
    let c = 1;
    if( originalImage.height > 500 ){
        c = 500 / originalImage.height
    }
    backCtx.drawImage(anonimizedImage || originalImage, 0, 0, originalImage.width*c, originalImage.height*c)

    for( let box of boxes){
        backCtx.beginPath();
        backCtx.moveTo(box[0], box[1])
        backCtx.lineTo(box[0], box[3])
        backCtx.lineTo(box[2], box[3])
        backCtx.lineTo(box[2], box[1])
        backCtx.fill();
    }

    if( boxStart && mousePos ){
        foreCtx.clearRect(0,0,foreCtx.canvas.width,foreCtx.canvas.height)
        foreCtx.beginPath();
        foreCtx.moveTo(boxStart[0], boxStart[1])
        foreCtx.lineTo(mousePos[0], boxStart[1])
        foreCtx.lineTo(mousePos[0], mousePos[1])
        foreCtx.lineTo(boxStart[0], mousePos[1])
        foreCtx.fill()
    }
}
/*


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

    const onClickRecognize = async () => {
        const Tesseract = ((window as any).Tesseract! as any);
        const worker = await Tesseract.createWorker();
        await worker.loadLanguage("por");
        await worker.initialize("por");
        let {data: {words}} = await worker.recognize(canvasRef.current!)
        console.log(words) // arry use bbox

    }

    */

/*
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
*/
/*

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

    */