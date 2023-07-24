import { useEffect, useRef, useState } from "react";
import { UserFile } from "../../types/UserFile";
import BootstrapModal from "../../util/BootstrapModal";
import { Bicon, Button } from "../../util/BootstrapIcons";
import { AnonimizeImage } from "../../types/AnonimizeImage";
import { normalizeEntityString } from "../../types/Entity";


export function ImageEditorModal(props: {file: UserFile}){
    const preparingWorkerRef = useRef<boolean>(false);
    const workerRef = useRef<any>(null);
    if( !preparingWorkerRef.current ){
        preparingWorkerRef.current = true;

        const Tesseract = ((window as any).Tesseract! as any);
        Tesseract.createWorker().then( async (worker: any) => {
            if( !workerRef.current ){
                workerRef.current = worker;
                await worker.loadLanguage("por");
                await worker.initialize("por");
            }
        })
    }
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
            </div>
            <div className="modal-body">
                {imageElmt ? 
                <ImageEditor file={props.file} imageElmt={imageElmt} worker={workerRef.current} />
                :
                <>Selecione uma imagem para a editar</>
                }
            </div>
        </div>
    </BootstrapModal>
}

function ImageEditor(props: {file: UserFile, imageElmt: HTMLImageElement, worker: any}){
    let canvasBackgroundRef = useRef<HTMLCanvasElement>(null)
    let canvasForegroundRef = useRef<HTMLCanvasElement>(null)
    let ctxBackgroundRef = useRef<CanvasRenderingContext2D|null>(null)
    let ctxForegroundRef = useRef<CanvasRenderingContext2D|null>(null)
    let originalImage = useRef<HTMLImageElement|null>(null)
    let animFrameRequest = useRef<number>()
    let boxStart = useRef<number[]|null>(null)
    let mousePos = useRef<number[]|null>(null)
    let boxes = useRef<[number, number, number, number][]>([])
    let colorInputRef = useRef<HTMLInputElement>(null)
    let checkRemoveInput = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if( !canvasBackgroundRef.current ) return;
        if( !canvasForegroundRef.current ) return;
        if( !colorInputRef.current ) return;

        ctxBackgroundRef.current = canvasBackgroundRef.current.getContext("2d");
        ctxForegroundRef.current = canvasForegroundRef.current.getContext("2d");
        
        if( !ctxBackgroundRef.current ) return;
        if( !ctxForegroundRef.current ) return;

        originalImage.current = setup(ctxBackgroundRef.current, ctxForegroundRef.current, props.file.images[parseInt(props.imageElmt.dataset.imageId!)])
        boxes.current = props.file.images[parseInt(props.imageElmt.dataset.imageId!)].boxes
        colorInputRef.current.value = props.file.images[parseInt(props.imageElmt.dataset.imageId!)].boxColor || "#00000"


        const _draw = () => {
            let color = colorInputRef.current?.value || "#ffffff"
            draw(ctxBackgroundRef.current!, ctxForegroundRef.current!, originalImage.current!, boxStart.current, mousePos.current, boxes.current, color)
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

    const intersects: (r1: number[], r2: number[]) => boolean = (
        [r1TopLeftX, r1TopLeftY, r1BottomRightX, r1BottomRightY],
        [r2TopLeftX, r2TopLeftY, r2BottomRightX, r2BottomRightY],
    ) => (r1TopLeftX < r2BottomRightX) && (r1BottomRightX > r2TopLeftX) && (r1TopLeftY < r2BottomRightY) && (r1BottomRightY > r2TopLeftY)

    const onMouseUp = (evt: React.MouseEvent) => {
        if( !canvasForegroundRef.current ) return;
        let rect = canvasForegroundRef.current?.getBoundingClientRect();
        let [mouseX, mouseY] = [evt.clientX-rect?.left, evt.clientY-rect?.top]
        mousePos.current = [mouseX, mouseY]
        if( !boxStart.current ) return;
        let [initialX, initialY] = boxStart.current;
        if( checkRemoveInput.current?.checked ){
            boxes.current = boxes.current.filter(([x0,y0,x1,y1]) => !intersects([Math.min(mouseX, initialX),Math.min(mouseY, initialY),Math.max(mouseX,initialX),Math.max(mouseY, initialY)],[Math.min(x0, x1),Math.min(y0, y1),Math.max(x0,x1),Math.max(y0, y1)]));
        }
        else{
            boxes.current.push([initialX,initialY,mouseX,mouseY]);
        }
        boxStart.current = null;
    }

    const onClickSave = () => {
        if( boxes.current.length == 0){
            props.file.images[parseInt(props.imageElmt.dataset.imageId!)].anonimizedSrc = undefined
        }
        else{
            props.file.images[parseInt(props.imageElmt.dataset.imageId!)].anonimizedSrc = drawFinal(originalImage.current!, boxes.current, colorInputRef.current?.value || "#000000")
        }
        props.file.images[parseInt(props.imageElmt.dataset.imageId!)].boxes = boxes.current
        props.file.images[parseInt(props.imageElmt.dataset.imageId!)].boxColor = colorInputRef.current?.value || "#000000"
        props.file.notifyImages()
        props.file.save()
    }

    const onClickRestore = () => {
        boxes.current = []
        props.file.images[parseInt(props.imageElmt.dataset.imageId!)].anonimizedSrc = undefined
        props.file.images[parseInt(props.imageElmt.dataset.imageId!)].boxes = []
        props.file.images[parseInt(props.imageElmt.dataset.imageId!)].boxColor = colorInputRef.current?.value || "#000000"
        props.file.notifyImages()
        props.file.save()
    }

    const onClickRecognize = async () => {
        let {data: {words}} = await props.worker.recognize(canvasBackgroundRef.current!)
        boxes.current = (props.file.pool.entities.length > 0 ? words.filter(({text}:any) => props.file.pool.entities.some(e => e.offsets.some(o => normalizeEntityString(o.preview).includes(normalizeEntityString(text)) ))) : words).filter(({text}: any) => text.length > 3).map(({bbox}: any) => [bbox.x0, bbox.y0, bbox.x1, bbox.y1])
    }


    return <>
        <div className="d-flex align-items-center justify-content-center">
            <Button className="btn btn-primary" i="search" text="Encontrar texto" onClick={onClickRecognize}/>
            <span className="mx-1"><Bicon n="dot"/></span>
            <input type="radio" className="btn-check" name="image-mode" id="add-box-button" autoComplete="off" defaultChecked={true} />
            <label className="btn btn-outline-success" htmlFor="add-box-button"><Bicon n="plus-square-dotted"/> Adicionar</label>
            <input ref={checkRemoveInput} type="radio" className="btn-check" name="image-mode" id="remove-box-button" autoComplete="off" defaultChecked={false}/>
            <label className="btn btn-outline-danger" htmlFor="remove-box-button"><Bicon n="dash-square"/> Remover</label>
            <span className="mx-1"><Bicon n="dot"/></span>
            <input type="color" ref={colorInputRef} className="form-control form-control-color" title="Escolher cor"/>
        </div>
        <div style={{position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: "800px", margin: "10px"}}>
            <canvas ref={canvasBackgroundRef} style={{position: "absolute", border: "2px solid var(--secondary-gold)"}}/>
            <canvas ref={canvasForegroundRef} style={{position: "absolute", border: "2px solid var(--secondary-gold)"}} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}/>
        </div>
        <div className="d-flex">
            <div className="flex-grow-1"></div>
            <Button className="btn btn-danger mx-1" i="arrow-counterclockwise" text="Recomeçar" onClick={onClickRestore}/>
            <Button className="btn btn-success mx-1" i="save" text="Guardar e fechar" data-bs-dismiss="modal" onClick={onClickSave}/>
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
        if( originalImage.height > 800 ){
            c = 800 / originalImage.height
        }
        backCtx.canvas.width = originalImage.width*c
        backCtx.canvas.height = originalImage.height*c
        foreCtx.canvas.width = originalImage.width*c
        foreCtx.canvas.height = originalImage.height*c
    }
    return originalImage
}

function drawFinal(image: HTMLImageElement, boxes: [number,number,number,number][], color: string){
    let {width, height} = image;
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    let c = 1;
    if( height > 800 ){
        c = 800 / height
    }
    let ctx = canvas.getContext("2d");
    if( !ctx ) return undefined;
    ctx.drawImage(image, 0, 0, width*c, height*c);
    ctx.fillStyle = color;
    for( let box of boxes){
        ctx.beginPath();
        ctx.moveTo(box[0], box[1])
        ctx.lineTo(box[0], box[3])
        ctx.lineTo(box[2], box[3])
        ctx.lineTo(box[2], box[1])
        ctx.fill();
    }

    return canvas.toDataURL();

}

function draw(backCtx: CanvasRenderingContext2D, foreCtx: CanvasRenderingContext2D, originalImage: HTMLImageElement, boxStart: number[]|null, mousePos: number[]|null, boxes: [number,number,number,number][], color: string){
    backCtx.clearRect(0,0,backCtx.canvas.width,backCtx.canvas.height)
    backCtx.fillStyle = `${color}aa`
    foreCtx.clearRect(0,0,foreCtx.canvas.width,foreCtx.canvas.height)
    foreCtx.strokeStyle = `#000000aa`
    foreCtx.lineWidth = 1
    foreCtx.fillStyle = `${color}aa`
    let c = 1;
    if( originalImage.height > 800 ){
        c = 800 / originalImage.height
    }
    backCtx.drawImage(originalImage, 0, 0, originalImage.width*c, originalImage.height*c)
    
    for( let box of boxes){
        backCtx.beginPath();
        foreCtx.beginPath();
        backCtx.moveTo(box[0], box[1])
        foreCtx.moveTo(box[0], box[1])
        backCtx.lineTo(box[0], box[3])
        foreCtx.lineTo(box[0], box[3])
        backCtx.lineTo(box[2], box[3])
        foreCtx.lineTo(box[2], box[3])
        backCtx.lineTo(box[2], box[1])
        foreCtx.lineTo(box[2], box[1])
        backCtx.fill();
        foreCtx.lineTo(box[0], box[1])
        foreCtx.stroke();
    }

    if( boxStart && mousePos ){
        foreCtx.beginPath();
        foreCtx.moveTo(boxStart[0], boxStart[1])
        foreCtx.lineTo(mousePos[0], boxStart[1])
        foreCtx.lineTo(mousePos[0], mousePos[1])
        foreCtx.lineTo(boxStart[0], mousePos[1])
        foreCtx.lineTo(boxStart[0], boxStart[1])
        foreCtx.stroke()
        foreCtx.fill()
    }
}
