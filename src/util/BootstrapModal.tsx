import React from "react";

type BootstrapModalProps = {
    id: string
    children: React.ReactNode
}

export default class BootstrapModal extends React.Component<BootstrapModalProps>{
    render(): React.ReactNode {
        return <div className="modal fade" id={this.props.id} tabIndex={-1} role="dialog" aria-labelledby={`${this.props.id}-label`} aria-hidden="true">
            <div className="modal-dialog modal-xl">
                <div className="modal-content">
                    {this.props.children}
                </div>
            </div>
        </div>
    }
}
