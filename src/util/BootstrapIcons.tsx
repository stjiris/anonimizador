import {ButtonHTMLAttributes, HTMLAttributes, MouseEventHandler, PureComponent, ReactNode } from "react"

interface BiconProps{
    n: string
    children?: ReactNode
}

export class Bicon extends PureComponent<BiconProps> {
    render(): ReactNode {
        return <i className={`bi bi-${this.props.n}`}></i>
    }
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    i: string
}

export class Button extends PureComponent<ButtonProps>{
    render(): ReactNode {
        return <button {...this.props}><Bicon n={this.props.i}/></button>
    }
}