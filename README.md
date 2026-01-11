# Anonimizador

## Sobre

Repositório da ferramenta de anonimização do projeto IRIS, em parceria do INESC-ID e o Supremo Tribunal de Justiça.

Mais informações sobre o projeto IRIS: [stjiris.github.io](https://stjiris.github.io/)

## Inicializar

A ferramenta foi pensada com a utilização de `docker`. Para fazer um deploy com docker da ferramenta ver o [deploy.sh](./deploy.sh).

Para correr a versão dev e ter alterações imediatas refletidas no browser correr o serviço anonimizador_dev atravez do docker compose:
- (docker compose up -d --build anonimizador_dev).


O `Dockerfile` permite analisar que softwares um sistema deverá ter para funcionar corretamente. Nomeadamente `python 3.8.18`, `node 18`, `pandoc` e `libreoffice`.

Para inicializar o projeto fora de docker e assumindo os requesitos de software deve-se correr `npm run build` para criar os componentes de interface seguido de `npm run proxy` para correr o servidor.

![Banner cofinanciamento, STJ e INESC-ID](public/stjiris-banner.png)

