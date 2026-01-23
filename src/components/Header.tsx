import { ProfileSelector, useProfile } from "../types/Profile";
import { Bicon, Button } from "../util/BootstrapIcons";

export default function Header() {
    const [profile] = useProfile();
    return <header className="py-2 align-items-center d-flex flex-wrap">
        <a className="align-items-center d-flex flex-wrap text-decoration-none nav-link" href="./">
            <img src="./stj-logo.png" style={{ maxHeight: 70 }} alt="Logotipo Supremo Tribunal de Justiça" />
            <div className="ps-2 d-flex flex-column align-items-center">
                <h5 className="m-0 fancy-font">{process.env.REACT_APP_TITLE}</h5>
            </div>
        </a>
        <pre className="m-0">Versão: {process.env.REACT_APP_VERSION_COMMIT} ({process.env.REACT_APP_VERSION_DATE})</pre>
        <Button title="Perfil" i="palette2" text={`Perfil${profile?.name? `: ${profile.name}` : ''}`}   className="btn m-1" style={{
            backgroundColor: "#a58f3c",
            borderWidth: "3px",
            borderColor: "#55491fff",
            color: "#6d1b2a",
            fontWeight: 600,
            fontSize: "0.9rem",
            padding: "1px 4px"
        }} data-bs-toggle="modal" data-bs-target="#modal-profile" />
        <div className="flex-fill d-none d-lg-block"></div>
        <nav className="d-print-none">
            <ul className="container d-flex nav align-items-center justify-content-evenly flex-wrap">
                <a className="nav-link fs-6 bg-transparent red-link fw-bold" href="https://docs.google.com/document/d/e/2PACX-1vTaR6kTasw0iGYSSMbJpq2wMgrBN5K37jg5ab_qMih_VpXRO5ZAAeeeDiRYzvyrD_VDxBM2ccW-VuBQ/pub" rel="noreferrer" target="_blank"><Bicon n="question-circle" /> Ajuda</a>
            </ul>
        </nav>
    </header>
}