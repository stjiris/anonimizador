export VERSION_COMMIT=$(git rev-parse --short HEAD)
export VERSION_DATE=$(date +%d/%m/%Y)

if [ ! -d "iris-lfs-storage" ]; then
    git clone https://gitlab.com/diogoalmiro/iris-lfs-storage.git
    cd iris-lfs-storage && git lfs pull && cd ..
fi

docker compose build --build-arg VERSION_COMMIT=$VERSION_COMMIT --build-arg VERSION_DATE=$VERSION_DATE anonimizador nlp_server
docker compose up -d --force-recreate anonimizador nlp_server