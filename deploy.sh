docker build --build-arg VERSION_COMMIT=$(git rev-parse --short HEAD) --build-arg VERSION_DATE=$(date +%m/%d/%Y) -t anonimizador .
docker stop anonimizador
docker rm anonimizador
docker run -p 7998:7998 --restart unless-stopped --name anonimizador -d anonimizador