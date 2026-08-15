const fs = require('fs');
const path = require('path');
const https = require('https');

const binDir = path.join(__dirname, '..', 'bin');
const binaryPath = path.join(binDir, `yt-dlp${process.platform === 'win32' ? '.exe' : ''}`);
const verifiedMarker = `${binaryPath}.linux-verified`;
const downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

if (process.platform === 'win32' || (fs.existsSync(binaryPath) && fs.existsSync(verifiedMarker))) {
    process.exit(0);
}

function downloadToFile(url, redirects = 0) {
    if (redirects > 5) return Promise.reject(new Error('too many redirects'));
    return new Promise((resolve, reject) => {
        const request = https.get(url, { headers: { 'User-Agent': 'MINI-FINAL build' } }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                response.resume();
                return downloadToFile(response.headers.location, redirects + 1).then(resolve, reject);
            }
            if (response.statusCode !== 200) {
                response.resume();
                return reject(new Error(`HTTP ${response.statusCode}`));
            }

            fs.mkdirSync(binDir, { recursive: true });
            const tempPath = `${binaryPath}.download-${process.pid}`;
            const output = fs.createWriteStream(tempPath);
            let settled = false;
            const fail = (error) => {
                if (settled) return;
                settled = true;
                output.destroy();
                try { fs.unlinkSync(tempPath); } catch {}
                reject(error);
            };
            response.on('error', fail);
            output.on('error', fail);
            output.on('finish', () => {
                if (settled) return;
                settled = true;
                try {
                    fs.renameSync(tempPath, binaryPath);
                    fs.chmodSync(binaryPath, 0o755);
                    fs.writeFileSync(verifiedMarker, String(Date.now()));
                    resolve();
                } catch (error) {
                    try { fs.unlinkSync(tempPath); } catch {}
                    reject(error);
                }
            });
            response.pipe(output);
        });
        request.setTimeout(120000, () => request.destroy(new Error('download timeout')));
        request.on('error', reject);
    });
}

(async () => {
    try {
        process.stdout.write('[YTDLP] prefetching standalone binary during build...\n');
        await downloadToFile(downloadUrl);
        process.stdout.write('[YTDLP] build-time binary ready\n');
    } catch (error) {
        // Runtime ensureYtDlp() will retry later; a transient build-network
        // failure must not prevent the bot itself from installing and starting.
        console.warn(`[YTDLP] build prefetch skipped: ${error.message}`);
    }
})();
