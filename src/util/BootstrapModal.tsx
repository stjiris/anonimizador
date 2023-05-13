import { createRef, useEffect, useRef } from "react";

type BootstrapModalProps = {
    id: string
    children: React.ReactNode
    onHide?: (elm: HTMLElement) => void
    onShow?: (elm: HTMLElement) => void
}

export default function BootstrapModal(props: BootstrapModalProps){
    const elmRef = useRef<HTMLDivElement>(null);

    const fireHide = () => props.onHide ? props.onHide(elmRef.current!) : null;
    const fireShow = () => props.onShow ? props.onShow(elmRef.current!) : null;

    useEffect(() => {
        elmRef.current?.addEventListener("hide.bs.modal", fireHide);
        elmRef.current?.addEventListener("show.bs.modal", fireShow);
        return () => {
            elmRef.current?.removeEventListener("hide.bs.modal", fireHide)
            elmRef.current?.removeEventListener("show.bs.modal", fireShow)
        }
    }, [])

    return <div ref={elmRef} className="modal fade" id={props.id} tabIndex={-1} role="dialog" aria-labelledby={`${props.id}-label`} aria-hidden="true">
        <div className="modal-dialog modal-xl">
            <div className="modal-content">
                {props.children}
            </div>
        </div>
    </div>
}
