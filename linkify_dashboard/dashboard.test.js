/**
 * @jest-environment jsdom
 */

const { deploy, fetchList } = require('./dashboard');

describe('Linkify Dashboard', () => {
    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = `
            <input id="pat" value="test-token" />
            <input id="user" value="test-user" />
            <input id="repo" value="test-repo" />
            <input id="filename" />
            <textarea id="code"></textarea>
            <button onclick="deploy()">Deploy</button>
            <p id="status"></p>
            <div class="main">
                <h2></h2>
                <p><code></code></p>
                <div id="file-list"></div>
            </div>
        `;

        // Mock Globals
        global.fetch = jest.fn();
        global.alert = jest.fn();
        global.localStorage = {
            getItem: jest.fn(),
            setItem: jest.fn()
        };
        
        // Reset Hash
        window.location.hash = '';
    });

    test('fetchList should call GitHub API and render files', async () => {
        const mockResponse = [
            { type: 'dir', name: 'subfolder', path: 'linkify_dashboard/subfolder' },
            { type: 'file', name: 'chart.html', path: 'linkify_dashboard/chart.html', html_url: 'http://github.com/blob/chart.html' }
        ];

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        await fetchList('');

        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.github.com/repos/test-user/test-repo/contents/linkify_dashboard'
        );

        const listDiv = document.getElementById('file-list');
        expect(listDiv.innerHTML).toContain('subfolder');
        expect(listDiv.innerHTML).toContain('chart');
    });

    test('fetchList should handle empty folders', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => []
        });

        await fetchList('');

        const listDiv = document.getElementById('file-list');
        expect(listDiv.innerHTML).toContain('No widgets found');
    });

    test('deploy should validate inputs', async () => {
        document.getElementById('filename').value = ''; // Empty filename
        
        await deploy();

        expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Please fill in all fields'));
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('deploy should create a new file', async () => {
        document.getElementById('filename').value = 'new-widget.html';
        document.getElementById('code').value = '<div>Widget Code</div>';

        // Mock GET (check existence) - 404 means file doesn't exist yet
        global.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false }));
        
        // Mock PUT (create file)
        global.fetch.mockImplementationOnce(() => Promise.resolve({ ok: true }));

        await deploy();

        // Verify PUT request
        expect(global.fetch).toHaveBeenCalledTimes(2);
        const putCall = global.fetch.mock.calls[1];
        const url = putCall[0];
        const options = putCall[1];

        expect(url).toContain('new-widget.html');
        expect(options.method).toBe('PUT');
        
        const body = JSON.parse(options.body);
        expect(body.message).toBe('New Widget: new-widget.html');
        expect(body.content).toBeDefined(); // Base64 content
    });

    test('deploy should update an existing file (include SHA)', async () => {
        document.getElementById('filename').value = 'existing.html';
        
        // Mock GET - 200 OK returns SHA
        global.fetch.mockImplementationOnce(() => Promise.resolve({
            ok: true,
            json: async () => ({ sha: 'abc-123' })
        }));

        // Mock PUT
        global.fetch.mockImplementationOnce(() => Promise.resolve({ ok: true }));

        await deploy();

        const body = JSON.parse(global.fetch.mock.calls[1][1].body);
        expect(body.sha).toBe('abc-123');
    });
});