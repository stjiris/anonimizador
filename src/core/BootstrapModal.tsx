"use client";
import { useEffect, useRef } from "react";

type BootstrapModalProps = {
    id: string
    children: React.ReactNode
    onHide?: () => void
    onShow?: (elm: HTMLElement | null) => void
}

export default function BootstrapModal(props: BootstrapModalProps) {
    const elmRef = useRef<HTMLDivElement>(null);

    const fireHide = () => props.onHide ? props.onHide() : null;
    const fireShow = (e: any) => props.onShow ? props.onShow(e.relatedTarget || null) : null;

    useEffect(() => {
        let elm = elmRef.current;
        elm?.addEventListener("hide.bs.modal", fireHide);
        elm?.addEventListener("show.bs.modal", fireShow);
        return () => {
            elm?.removeEventListener("hide.bs.modal", fireHide)
            elm?.removeEventListener("show.bs.modal", fireShow)
        }
    })

    return <div ref={elmRef} className="modal fade" id={props.id} tabIndex={-1} role="dialog" aria-labelledby={`${props.id}-label`} aria-hidden="true">
        <div className="modal-dialog modal-xl">
            <div className="modal-content">
                {props.children}
            </div>
        </div>
    </div>
}
