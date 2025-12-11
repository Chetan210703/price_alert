import fs from 'fs';

export function loadDB(){
    const data = fs.readFileSync('../backend/db.json', 'utf8');    
    return JSON.parse(data);
}

export function saveDB(data){
    fs.writeFileSync('../backend/db.json', JSON.stringify(data, null, 2));
}