import React from "react";
import { createRef } from "react";

type BootstrapModalProps = {
    id: string
    children: React.ReactNode
    onHide?: (elm: HTMLElement) => void
    onShow?: (elm: HTMLElement) => void
}

export default class BootstrapModal extends React.Component<BootstrapModalProps>{
    elmRef: React.RefObject<HTMLDivElement> = createRef()

    fireOnHide = () => {
        if( this.props.onHide ){
            this.props.onHide(this.elmRef.current!)
        }
    }

    fireOnShow = () => {
        if( this.props.onShow ){
            this.props.onShow(this.elmRef.current!)
        }
    }

    componentDidMount(): void {
        this.elmRef.current?.addEventListener("hide.bs.modal", this.fireOnHide)
        this.elmRef.current?.addEventListener("show.bs.modal", this.fireOnShow)
    }

    componentWillUnmount(): void {
        this.elmRef.current?.removeEventListener("hide.bs.modal", this.fireOnHide)
        this.elmRef.current?.removeEventListener("show.bs.modal", this.fireOnShow)
    }

    render(): React.ReactNode {
        return <div ref={this.elmRef} className="modal fade" id={this.props.id} tabIndex={-1} role="dialog" aria-labelledby={`${this.props.id}-label`} aria-hidden="true">
            <div className="modal-dialog modal-xl">
                <div className="modal-content">
                    {this.props.children}
                </div>
            </div>
        </div>
    }
}
