const { spawn } = require('child_process');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
const envs = [];

lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (key && val) envs.push({ key, val });
    }
});

async function addEnv(key, val) {
    return new Promise((resolve) => {
        console.log(`\n--- Adding ${key} ---`);

        try {
            require('child_process').execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' });
        } catch (e) { }

        const proc = spawn('npx', ['vercel', 'env', 'add', key, 'production'], { shell: true });
        let addedVal = false;

        proc.stdout.on('data', (data) => {
            const out = data.toString();
            process.stdout.write(out);

            if (out.includes('How to proceed?')) {
                proc.stdin.write('\n'); // Select "Leave as is" (default)
            }
            if (out.includes('Mark as sensitive?')) {
                proc.stdin.write('no\n');
            }
            if (!addedVal && out.includes(`What's the value of ${key}?`)) {
                proc.stdin.write(val + '\n');
                addedVal = true;
            }
        });

        proc.stderr.on('data', (data) => {
            const out = data.toString();
            process.stderr.write(out);

            if (out.includes('How to proceed?')) {
                proc.stdin.write('\n'); // Select "Leave as is" (default)
            }
            if (out.includes('Mark as sensitive?')) {
                proc.stdin.write('no\n');
            }
            if (!addedVal && out.includes(`What's the value of ${key}?`)) {
                proc.stdin.write(val + '\n');
                addedVal = true;
            }
        });

        proc.on('close', (code) => {
            console.log(`Finished ${key} with code ${code}`);
            resolve();
        });

        proc.on('error', (err) => {
            console.error(`Spawn error for ${key}:`, err);
            resolve();
        });
    });
}

(async () => {
    for (const env of envs) {
        if (env.key !== 'OPENAI_API_KEY') {
            await addEnv(env.key, env.val);
        }
    }
    console.log('\nAll done!');
})();
