const BASE_DIR = 'linkify_dashboard';
let currentPath = '';

window.onload = () => {
    document.getElementById('pat').value = localStorage.getItem('gh_token') || '';
    
    let valUser = localStorage.getItem('gh_user') || '';
    let valRepo = localStorage.getItem('gh_repo') || '';

    const host = window.location.hostname;
    const path = window.location.pathname;

    if (host.endsWith('.github.io')) {
        if (!valUser) valUser = host.split('.')[0];
        if (!valRepo) valRepo = host;
    } else {
        const repoPart = path.split('/').find(p => p.endsWith('.github.io'));
        if (repoPart) {
            if (!valUser) valUser = repoPart.split('.')[0];
            if (!valRepo) valRepo = repoPart;
        }
    }

    document.getElementById('user').value = valUser;
    document.getElementById('repo').value = valRepo;
    
    // Load initial path from URL Hash (e.g., #folder/subfolder)
    const hashPath = decodeURIComponent(window.location.hash.substring(1));

    if(valUser) fetchList(hashPath);

    // Listen for browser Back/Forward buttons
    window.onhashchange = () => {
        fetchList(decodeURIComponent(window.location.hash.substring(1)));
    };
};

async function deploy() {
    const token = document.getElementById('pat').value.trim();
    const user = document.getElementById('user').value.trim();
    const repo = document.getElementById('repo').value.trim();
    const filename = document.getElementById('filename').value.trim().replace(/^\/+/, '');
    const widgetBody = document.getElementById('code').value;

    if (!token || !user || !repo || !filename) {
        alert("Please fill in all fields (Token, Username, Repo, Filename).");
        return;
    }

    localStorage.setItem('gh_token', token);
    localStorage.setItem('gh_user', user);
    localStorage.setItem('gh_repo', repo);

    const cleanPath = currentPath ? currentPath + '/' : '';
    const fullRelPath = cleanPath + filename;
    const depth = fullRelPath.split('/').length - 1;
    
    let backLink = depth > 0 ? '../'.repeat(depth) + 'index.html' : 'index.html';
    // Append the folder path as a hash so the dashboard opens in the correct folder
    const folderPath = fullRelPath.substring(0, fullRelPath.lastIndexOf('/'));
    if (folderPath) {
        backLink += `#${folderPath}`;
    }

    const fullHTML = `<!DOCTYPE html><html><head><style>body{margin:0;background:#000;color:#58a6ff;font-family:sans-serif;}.nav{padding:8px;background:#161b22;border-bottom:1px solid #30363d;font-size:12px;}.container{height:610px;width:980px;margin:20px auto;position:relative;overflow:hidden;border:1px solid #30363d;border-radius:8px;}.container > div, .container > iframe {height:100%;width:100%;border:none;}</style></head><body><div class="nav"><a href="${backLink}" style="color:inherit;text-decoration:none;">← Back to Dashboard</a></div><div class="container">${widgetBody}</div></body></html>`;

    // Path is now specifically BASE_DIR
    const apiUrl = `https://api.github.com/repos/${user}/${repo}/contents/${BASE_DIR}/${fullRelPath}`;
    
    let sha = "";
    try {
        const check = await fetch(apiUrl, { headers: {'Authorization': `token ${token}`} });
        if(check.ok) { const d = await check.json(); sha = d.sha; }
    } catch(e) {}

    const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: {'Authorization': `token ${token}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({
            message: `New Widget: ${filename}`,
            content: btoa(unescape(encodeURIComponent(fullHTML))),
            sha: sha || undefined
        })
    });

    if(res.ok) {
        document.getElementById('status').innerText = "✅ Deployed! Refreshing list...";
        setTimeout(fetchList, 2000);
        setTimeout(() => fetchList(currentPath), 2000);
    } else {
        alert("Error. Ensure PAT has 'repo' permissions.");
    }
}

async function fetchList(path = '') {
    // If this call wasn't triggered by a hash change, update hash and let the event listener handle the fetch.
    // This ensures the URL is always in sync and enables the "Back" button.
    if (decodeURIComponent(window.location.hash.substring(1)) !== path) {
        window.location.hash = path;
        return; 
    }

    currentPath = path;
    const user = document.getElementById('user').value.trim();
    const repo = document.getElementById('repo').value.trim();
    const listDiv = document.getElementById('file-list');
    const displayPath = currentPath ? `/${currentPath}` : '';
    
    document.querySelector('.main h2').innerText = `📚 Widget Library ${displayPath}`;
    document.querySelector('.main p code').innerText = `/${BASE_DIR}${displayPath}/`;
    document.querySelector('button[onclick="deploy()"]').innerText = `Deploy to /${BASE_DIR}${displayPath}/`;

    listDiv.innerHTML = '<p style="color: #8b949e;">Loading...</p>';

    try {
        // Fetch contents of the BASE_DIR folder
        const cleanPath = currentPath ? '/' + currentPath : '';
        const res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${BASE_DIR}${cleanPath}`);
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || res.statusText);
        }

        const files = await res.json();
        
        const dirs = files.filter(f => f.type === 'dir');
        const htmlFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.html') && f.name !== 'index.html');
        
        if (dirs.length === 0 && htmlFiles.length === 0) {
            listDiv.innerHTML = currentPath ? 
                `<div class="widget-card" onclick="fetchList('${currentPath.split('/').slice(0,-1).join('/')}')" style="cursor:pointer; justify-content: flex-start; gap: 10px; background: #161b22;"><span style="font-size: 20px;">📂</span> <strong>.. (Back)</strong></div><p style='color: #8b949e;'>Empty folder.</p>` : 
                "<p style='color: #8b949e;'>No widgets found. Library loaded.</p>";
            return;
        }

        let html = '';

        if (currentPath) {
            const parentPath = currentPath.split('/').slice(0, -1).join('/');
            html += `<div class="widget-card" onclick="fetchList('${parentPath}')" style="cursor:pointer; justify-content: flex-start; gap: 10px; background: #161b22;">
                        <span style="font-size: 20px;">📂</span> <strong>.. (Back)</strong>
                     </div>`;
        }

        html += dirs.map(d => {
            const newPath = currentPath ? `${currentPath}/${d.name}` : d.name;
            return `<div class="widget-card" onclick="fetchList('${newPath}')" style="cursor:pointer; justify-content: flex-start; gap: 10px;">
                        <span style="font-size: 20px;">📁</span> <strong>${d.name}</strong>
                    </div>`;
        }).join('');

        html += htmlFiles.map(f => {
            const sourceUrl = f.html_url;
            // GitHub Pages URL logic: User sites are at root, Project sites are at /repo-name/
            const isUserSite = repo.toLowerCase() === `${user.toLowerCase()}.github.io`;
            const embedUrl = `https://${user.toLowerCase()}.github.io${isUserSite ? '' : '/' + repo}/${f.path}`;
            return `
            <div class="widget-card">
                <div>
                    <strong>${f.name.replace('.html', '')}</strong>
                    <span class="copy-link" onclick="navigator.clipboard.writeText('${sourceUrl}'); alert('Link Copied!');">${sourceUrl}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <a href="${sourceUrl}" target="_blank" style="background:#21262d; color:#58a6ff; padding:8px 15px; border-radius:6px; text-decoration:none; font-size:13px;">View Source</a>
                    <a href="${embedUrl}" style="background:#21262d; color:#58a6ff; padding:8px 15px; border-radius:6px; text-decoration:none; font-size:13px;">Embed View</a>
                </div>
            </div>`;
        }).join('');
        
        listDiv.innerHTML = html;
    } catch(e) {
        console.error(e);
        listDiv.innerHTML = `<p style="color: #f85149;">Error: ${e.message}</p><p style="color: #8b949e; font-size: 12px;">Please check credentials and ensure the folder <code>${BASE_DIR}</code> exists in the repo.</p>`;
    }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { deploy, fetchList, BASE_DIR };
}