mkdir -p logs/
docker build --build-arg VERSION_COMMIT=$(git rev-parse --short HEAD) --build-arg VERSION_DATE=$(date +%d/%m/%Y) -t anonimizador .
docker stop anonimizador
docker rm anonimizador
docker run -p 7998:7998 --restart unless-stopped --name anonimizador -d -v $(pwd)/logs/:/opt/app/logs anonimizador