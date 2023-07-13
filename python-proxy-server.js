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
const {readFileSync, rmSync, createWriteStream} = require('fs');
const { spawn, spawnSync } = require('child_process');
const process = require('process');

const PYTHON_COMMAND = process.env.PYTHON_COMMAND || path.join(__dirname, "env/bin/python");

let requetsLogger = createWriteStream(`logs/requests-deploy-${Date.now()}.log`, {flags: "a+"})
let processingLogger = createWriteStream(`logs/post-requests-info-deploy-${Date.now()}.log`, {flags: "a+"})
let logProcess = (requestPath, startTime, endTime, fileSize, fileExt, exitCode) => {
    processingLogger.write(JSON.stringify({
        requestPath,
        startTime,
        endTime,
        fileSize,
        fileExt,
        exitCode
    }));
    processingLogger.write("\n");
}

app.use((req, res, next) => {
    let start = new Date();
    res.on('close', () => {
        let end = new Date();
        requetsLogger.write(`[${start.toISOString()}|${end.toISOString()}] ${req.method} ${res.statusCode} ${req.url} ${end-start}ms\n`);
    })
    next()
})

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
    let start = new Date();
    let out = path.join(os.tmpdir(), `${Date.now()}.html`)
    let ext = path.extname(req.file.path);
    let subproc;
    if( ext.toLowerCase() == ".txt" ){
        subproc = spawnSync("pandoc",[req.file.path, "-f", "markdown","-t","html","-o",out,"--self-contained","--wrap","none"]);
    }
    else if( ext.toLowerCase() == ".doc" ){
        let name = path.basename(req.file.path, ext)
        let tmp = path.join(os.tmpdir(), `${name}.docx`)
        subproc = spawnSync("lowriter", ["--headless","--convert-to","docx",req.file.path,"--outdir",os.tmpdir()]);
        if( subproc.status == 0 ){
            subproc = spawnSync("pandoc",[tmp, "-t","html","-o",out,"--self-contained","--wrap","none","--lua-filter","xemf-to-png.lua"])
        }
        rmSync(tmp);
    }
    else{
        subproc = spawnSync("pandoc",[req.file.path,"-t","html","-o",out,"--self-contained","--wrap","none","--lua-filter","xemf-to-png.lua"]);
    }
    console.error("spawn: Exited with",subproc.status);
    console.error(subproc.stderr.toString())
    console.error(subproc.stdout.toString())
    
    if( subproc.status !== 0 ){
        res.status(500).send(subproc.error);
    }
    else{
        res.sendFile(out, () => rmSync(out));
    }
    logProcess("/html", start, new Date(), req.file.size, req.file.mimetype, subproc.status);
});

app.post("*/docx", upload.single('file'), (req, res) => {
    let start = new Date();
    let out = path.join(os.tmpdir(), `${Date.now()}.docx`)
    let subproc = spawn(PYTHON_COMMAND,["python-cli/inverse-pandoc.py", req.file.path, out])
    subproc.on("error", (err) => {
        console.log(err);  
    })
    subproc.stderr.on('data', (err) => {
        process.stderr.write(`ERROR: spawn: ${subproc.spawnargs.join(' ')}: ${err.toString()}`)
    });
    subproc.on('close', (code) => {
        let end = new Date();
        console.log("spawn: Exited with",code)
        if( code != 0 ){
            res.status(500).end();
        }
        else{
            res.sendFile(out, () => {
                rmSync(out);
            });
        }
        rmSync(req.file.path);
        logProcess("/docx", start, end, req.file.size, req.file.mimetype, code);
    })
})

app.post("*/from-text", upload.single('file'), (req, res) => {
    let start = new Date();
    let subproc = spawn(PYTHON_COMMAND,["python-cli/anonimizador-text.py", "-i", req.file.path,"-f","json"])
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
        let end = new Date();

        process.stderr.write(`[EXIT ${new Date().toISOString()} python-cli/anonimizador-text] CODE: ${code}`)
        logProcess("/from-text", start, end, req.file.size, req.file.mimetype, code);
        rmSync(req.file.path);
    })
})

app.use(express.static("build"))

let pkjson = require('./package.json');
let url = pkjson.proxy;
let port = 7998;
if( url ){
    port = new URL(url).port
}

app.listen(port);