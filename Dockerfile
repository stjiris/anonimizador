
FROM python:3.8.18-slim-bookworm

WORKDIR /opt/app

RUN apt-get update && apt-get install -y pandoc git-lfs
RUN apt-get --no-install-recommends install libreoffice -y

RUN apt-get install -y ca-certificates curl gnupg
RUN mkdir -p /etc/apt/keyrings

RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list

RUN apt-get update && apt-get install -y nodejs

RUN apt-get install poppler-utils -y

COPY requirements.txt ./

# clone this repo manually and put it inside the folder of the app and it'll work
RUN git clone https://gitlab.com/diogoalmiro/iris-lfs-storage.git
RUN cd iris-lfs-storage &&  git lfs pull

# if the line above is commented make sure to run this:
#COPY iris-lfs-storage/model-best ./src/scripts/model-best
#COPY iris-lfs-storage/model-gpt ./src/scripts/model-gpt

RUN pip install --no-cache-dir -r requirements.txt

ENV PYTHON_PATH=/usr/local/bin/python3

COPY package*.json ./

RUN npm ci

ENV PUBLIC_URL="."

ARG NEXT_PUBLIC_VERSION_COMMIT
ARG NEXT_PUBLIC_TITLE
ARG NEXT_PUBLIC_VERSION_DATE
ARG NEXT_PUBLIC_BASE_PATH

ENV NEXT_PUBLIC_TITLE=${NEXT_PUBLIC_TITLE} \
    NEXT_PUBLIC_VERSION_DATE=${NEXT_PUBLIC_VERSION_DATE} \
    NEXT_PUBLIC_VERSION_COMMIT=${NEXT_PUBLIC_VERSION_COMMIT}\
    NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

COPY . .



RUN npm run build

EXPOSE 7999

CMD ["npm", "start"]