import { ButtonHTMLAttributes } from "react"

export function Bicon(props: { n: string }) {
    return <i className={`bi bi-${props.n}`}></i>
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    i: string
    text?: string
}

export function Button({ i, text, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & ButtonProps) {
    return <button {...props}><Bicon n={i} />{text ? ` ${text}` : ""}</button>
}