FROM python:3.8

WORKDIR /opt/app

RUN apt-get update && apt-get install -y pandoc git-lfs

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

RUN apt-get install nodejs -y 

RUN git clone https://gitlab.com/diogoalmiro/iris-lfs-storage.git
RUN cd iris-lfs-storage && git lfs pull

RUN python -m venv env

COPY requirements.txt ./

RUN env/bin/pip install --no-cache-dir -r requirements.txt

ENV PYTHON_COMMAND=/opt/app/env/bin/python

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

RUN mv iris-lfs-storage/model-best/ ./python-cli/

ENV PUBLIC_URL="."

RUN npm run build

EXPOSE 7998

CMD [ "npm", "run", "proxy"]