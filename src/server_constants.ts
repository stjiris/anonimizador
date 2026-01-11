import { execSync } from 'child_process';
import path from 'path';

export { CONFIG_DIR, PYTHON_COMMAND };

const CONFIG_DIR = path.join(process.cwd(), 'src', 'regex')

let PYTHON_COMMAND: string;
try {
    PYTHON_COMMAND = process.env.PYTHON_PATH || execSync('which python3').toString().trim();
} catch (error) {
    console.error('Python config error:', error);
    PYTHON_COMMAND = '/usr/local/bin/python3';
}

declare global {
    interface Window {
        currentFile?: import('@/client-utils/UserFile').UserFile;
    }
}