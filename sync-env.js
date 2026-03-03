const { execSync } = require('child_process');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');

lines.forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const val = match[2].trim();
        if (key && val) {
            try {
                try {
                    execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' });
                } catch (e) { }

                fs.writeFileSync('temp_val.txt', val);
                console.log(`Adding ${key} to Vercel production...`);
                // Use input redirection so Vercel reads exactly the file content
                execSync(`npx vercel env add ${key} production < temp_val.txt`);
            } catch (e) {
                console.error(`Error adding ${key}:`, e.message);
            }
        }
    }
});
fs.unlinkSync('temp_val.txt');
