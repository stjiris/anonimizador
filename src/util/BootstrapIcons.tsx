import {ButtonHTMLAttributes } from "react"

export function Bicon(props: {n: string}) {
    return <i className={`bi bi-${props.n}`}></i>    
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    i: string
    text?: string
}

export function Button({i, text, ...props}: ButtonHTMLAttributes<HTMLButtonElement> & {i: string, text?: string}){
    return <button {...props}><Bicon n={i}/>{text ? ` ${text}` : ""}</button>
}