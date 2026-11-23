#!/bin/sh
set -eu

VERSION_COMMIT=$(git rev-parse --short HEAD)
VERSION_DATE=$(date +%d/%m/%Y)

if [ ! -d "iris-lfs-storage" ]; then
    git clone https://gitlab.com/diogoalmiro/iris-lfs-storage.git
fi

(cd iris-lfs-storage && git lfs pull)

export VERSION_COMMIT VERSION_DATE
docker compose build anonimizador nlp_server
docker compose up -d --remove-orphans --wait anonimizador nlp_server
