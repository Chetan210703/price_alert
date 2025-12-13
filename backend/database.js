import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'db.json');

export function loadDB(){
    const data = fs.readFileSync(dbPath, 'utf8');    
    return JSON.parse(data);
}

export function saveDB(data){
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}