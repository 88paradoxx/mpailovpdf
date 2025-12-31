
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for strict checks if needed
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

function getAllHtmlFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
                arrayOfFiles = getAllHtmlFiles(dirPath + "/" + file, arrayOfFiles);
            }
        } else {
            if (file.endsWith('.html')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

const rootDir = process.cwd();
console.log(`Scanning ${rootDir}...`);

const files = getAllHtmlFiles(rootDir);
console.log(`Found ${files.length} HTML files.`);

let updatedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    if (content.includes('site.webmanifest')) {
        // console.log(`Skipping ${file} - already has manifest`);
        return;
    }

    const manifestLink = '  <link rel="manifest" href="/site.webmanifest">\n';

    if (content.includes('</head>')) {
        content = content.replace('</head>', manifestLink + '</head>');
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
        updatedCount++;
    } else {
        console.warn(`Warning: No </head> tag found in ${file}`);
    }
});

console.log(`Done. Updated ${updatedCount} files.`);
