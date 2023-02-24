import {PureComponent, ReactNode } from "react"

interface BiconProps{
    n: string
    children?: ReactNode
}

export class Bicon extends PureComponent<BiconProps> {
    render(): ReactNode {
        return <i className={`bi bi-${this.props.n}`}></i>
    }
}
