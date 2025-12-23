export VERSION_COMMIT=$(git rev-parse --short HEAD)
export VERSION_DATE=$(date +%d/%m/%Y)
docker compose build --build-arg VERSION_COMMIT=$VERSION_COMMIT --build-arg VERSION_DATE=$VERSION_DATE anonimizador
docker compose up -d --force-recreate anonimizador