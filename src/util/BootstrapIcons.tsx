import {MouseEventHandler, PureComponent, ReactNode } from "react"

interface BiconProps{
    n: string
    children?: ReactNode
}

export class Bicon extends PureComponent<BiconProps> {
    render(): ReactNode {
        return <i className={`bi bi-${this.props.n}`}></i>
    }
}

interface ButtonProps {
    i: string,
    title: string,
    className: string,
    onClick: MouseEventHandler
}

export class Button extends PureComponent<ButtonProps>{
    render(): ReactNode {
        return <span role="button" title={this.props.title} className={this.props.className} onClick={this.props.onClick} ><Bicon n={this.props.i}/></span>
    }
}