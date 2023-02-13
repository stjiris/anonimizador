const express = require('express');
const app = express();
const path = require('path');
const os = require('os');
const multer = require('multer');
const ws = require('ws');
const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        cb(null, os.tmpdir());
    },
    filename: (req, file, cb) => {
        let ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`);
    }
})
const upload = multer({storage: storage});
const {readFileSync, rmSync} = require('fs');
const { spawn } = require('child_process');
const process = require('process');

const PYTHON_COMMAND = process.env.PYTHON_COMMAND || path.join(__dirname, "env/bin/python");

app.get("*/types", (req, res) => {
    let nerTypes = ["ORG", "LOC", "PER", "DAT"];
    let patterns = readFileSync('patterns.csv').toString().trim().split("\n").slice(1);
    for( let linePattern of patterns ){
        let label = JSON.parse(linePattern.split("\t")[1]);
        if( nerTypes.indexOf(label) == -1 ){
            nerTypes.push(label);
        }
    }
	return res.json(nerTypes);
})

app.post("*/html", upload.single('file'), (req, res) => {
    let subproc = spawn(PYTHON_COMMAND,["python-cli/pandoc.py", req.file.path], {...process.env, PYTHONIOENCODING: 'utf-8', PYTHONLEGACYWINDOWSSTDIO: 'utf-8' })
    subproc.stdout.pipe(res);
    subproc.on("error", (err) => {
        console.log(err);  
    })
    subproc.stderr.on('data', (err) => {
        process.stderr.write(`ERROR: spawn: ${subproc.spawnargs.join(' ')}: ${err.toString()}`)
    });
    subproc.on('close', (code) => {
        console.log("spawn: Exited with",code)
        if( code != 0 ){
            res.status(500).end();
        }
        rmSync(req.file.path);
    })
})

app.post("*/docx", upload.single('file'), (req, res) => {
    let out = path.join(os.tmpdir(), `${Date.now()}.docx`)
    let subproc = spawn(PYTHON_COMMAND,["python-cli/inverse-pandoc.py", req.file.path, out], {...process.env, PYTHONIOENCODING: 'utf-8', PYTHONLEGACYWINDOWSSTDIO: 'utf-8' })
    subproc.on("error", (err) => {
        console.log(err);  
    })
    subproc.stderr.on('data', (err) => {
        process.stderr.write(`ERROR: spawn: ${subproc.spawnargs.join(' ')}: ${err.toString()}`)
    });
    subproc.on('close', (code) => {
        console.log("spawn: Exited with",code)
        if( code != 0 ){
            res.status(500).end();
            return;
        }
        res.sendFile(out);
        setTimeout(() => {
            rmSync(out);
            rmSync(req.file.path);
        }, 3000)
    })
})

app.post("*/from-text", upload.single('file'), (req, res) => {
    let subproc = spawn(PYTHON_COMMAND,["python-cli/anonimizador-text.py", "-i", req.file.path,"-f","json"], {...process.env, PYTHONIOENCODING: 'utf-8', PYTHONLEGACYWINDOWSSTDIO: 'utf-8' }) // envs might not be needed outside windows world
    subproc.on("error", (err) => {
        console.log(err);
        res.status(500).write(err.toString());
        res.end();
    })
    subproc.stdout.pipe(res);
    subproc.stderr.on('data', (err) => {
        process.stderr.write(`[${new Date().toISOString()} STDERR python-cli/anonimizador-text] ${err.toString()}`)
    });
    subproc.on('close', (code) => {

        process.stderr.write(`[EXIT ${new Date().toISOString()} python-cli/anonimizador-text] CODE: ${code}`)
        rmSync(req.file.path);
    })
})


app.post("*/", upload.single('file'), (req, res) => {
    let subproc = spawn(PYTHON_COMMAND,["black-box-cli.py", req.file.path], {...process.env, PYTHONIOENCODING: 'utf-8', PYTHONLEGACYWINDOWSSTDIO: 'utf-8' }) // envs might not be needed outside windows world
    subproc.on("error", (err) => {
        console.log(err);
        res.status(500).write(err.toString());
        res.end();
    })
    subproc.stdout.pipe(res);
    subproc.stderr.on('data', (err) => {
        process.stderr.write(`[${new Date().toISOString()} STDERR black-box-cli.py .${req.file.path.split(".").at(-1)}] ${err.toString()}`)
    });
    subproc.on('close', (code) => {

        process.stderr.write(`[EXIT ${new Date().toISOString()} black-box-cli.py .${req.file.path.split(".").at(-1)}] CODE: ${code}`)
        rmSync(req.file.path);
    })
})


let pkjson = require('./package.json');
let url = pkjson.proxy;
let port = 7998;
if( url ){
    port = new URL(url).port
}

let http = require("http");
let server = http.createServer(app);
let wss = new ws.WebSocketServer({ clientTracking: false, noServer: true });

server.on('upgrade', (req, sock, head) => {
    if( !req.url.endsWith('/runnlp') ) {
        sock.write('HTTP/1.1 404 Not Found\r\n\r\n');
        sock.destroy();
        return;
    }
    wss.handleUpgrade(req, sock, head, (ws) => {
        wss.emit('connection', ws, req)
    })
})

wss.on('connection', (ws, req) => {
    let startDate = new Date();
    let dataIn = 0;
    let dataOut = 0;
    
    process.stderr.write(`[${new Date().toISOString()} RUN python-cli/nlp-socket.py]\n`)
    let subproc = spawn(PYTHON_COMMAND,["python-cli/nlp-socket.py"], {env: { PYTHONUNBUFFERED: '1', PYTHONIOENCODING: "utf-8:surrogateescape", ...process.env }}) // utf8 envs might not be needed outside windows world
    
    let send = (line) => {
        dataOut += line.length
        ws.send(line);
    }

    ws.on("close", () => {
        subproc.stdin.end();
    })
    
    ws.on("message", (d) => {
        dataIn+=d.toString().length;
        subproc.stdin.write(`${d}\n`);
    });
    
    subproc.on("error", (err) => {
        process.stderr.write(`[${new Date().toISOString()} ERROR python-cli/nlp-socket.py] ${err.toString()}\n`)
    })

    let buffer = "";
    subproc.stdout.on("data", (data) => {
        buffer += data.toString();
        let ms = buffer.split("\n");
        buffer = ms.at(-1);
        for( let line of ms.slice(0,-1) ){
            send(line);
        }
    })

    subproc.stderr.on('data', (err) => {
        process.stderr.write(`[${new Date().toISOString()} STDERR python-cli/nlp-socket.py] ${err.toString()}\n`)
    });

    subproc.on('close', (code) => {
        for(let line of buffer.split("\n") ){
            send(line) // Empty buffer
        }
        ws.close();
        let endDate = new Date();

        process.stderr.write(`[${new Date().toISOString()} EXIT python-cli/nlp-socket.py] `)
        process.stderr.write(JSON.stringify({
            time: endDate - startDate,
            dataIn,
            dataOut,
            code
        }))
        process.stderr.write(`\n`)
    })  
})

server.listen(port);