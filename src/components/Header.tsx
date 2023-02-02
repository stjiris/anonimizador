import React from "react";

interface HeaderProps {
    actions: React.ReactNode[]
}

export default class Header extends React.Component<HeaderProps>{
    render(): React.ReactNode {
        return  <header className="py-2 align-items-center d-flex flex-wrap">
          <a className="align-items-center d-flex flex-wrap text-decoration-none nav-link" href="./">
              <img src="./stj-logo.png" style={{maxHeight: 70}} alt="Logotipo Supremo Tribunal de Justiça"/>
              <div className="ps-2 d-flex flex-column align-items-center">
                  <h5 className="m-0 fancy-font">Anonimizador</h5>
              </div>
          </a>
          <div className="flex-fill d-none d-lg-block"></div>
          <nav className="d-print-none">
              <ul className="container d-flex nav align-items-center justify-content-evenly flex-wrap">
                {this.props.actions.map( (a, i) => <li key={i.toString()} className="nav-link py-1 px-2 mx-1">{a}</li>)}
              </ul>
          </nav>
      </header>
    }
}