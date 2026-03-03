const { execSync } = require('child_process');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');

let buildArgs = '';
lines.forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const val = match[2].trim();
        if (key && val) {
            buildArgs += ` -b ${key}="${val}" -e ${key}="${val}"`;
        }
    }
});

console.log('Triggering Vercel deployment with inline environment variables...');
try {
    execSync(`npx vercel deploy --prod --yes ${buildArgs}`, { stdio: 'inherit' });
} catch (e) {
    console.error('Deployment failed:', e.message);
    process.exit(1);
}
