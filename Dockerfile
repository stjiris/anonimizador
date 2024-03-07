FROM python:3.8

WORKDIR /opt/app

RUN apt-get update && apt-get install -y pandoc git-lfs
RUN apt-get --no-install-recommends install libreoffice -y

RUN apt-get install -y ca-certificates curl gnupg
RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
RUN apt-get update && apt-get install nodejs -y 

RUN git clone https://gitlab.com/diogoalmiro/iris-lfs-storage.git
RUN cd iris-lfs-storage && git lfs pull

RUN python -m venv env

COPY requirements.txt ./

RUN env/bin/pip install --no-cache-dir -r requirements.txt

ENV PYTHON_COMMAND=/opt/app/env/bin/python

COPY package*.json ./

RUN npm ci

ENV PUBLIC_URL="."

ARG VERSION_DATE="01/01/1990"

ARG VERSION_COMMIT="0000000"

COPY . .

RUN REACT_APP_VERSION_DATE=${VERSION_DATE} REACT_APP_VERSION_COMMIT=${VERSION_COMMIT} npm run build

RUN mv iris-lfs-storage/model-best/ ./python-cli/
RUN mv iris-lfs-storage/model-gpt/ ./python-cli/

EXPOSE 7998

CMD [ "npm", "run", "proxy"]