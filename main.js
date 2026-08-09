import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.mjs';

let pyodideInstance;
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const statusBar = document.getElementById('status-bar');
const outputArea = document.getElementById('output-area');
const markdownPreview = document.getElementById('markdown-preview');

// Initialize Pyodide and install markitdown package on window load
window.addEventListener('load', async () => {
    try {
        statusBar.textContent = 'Loading Pyodide runtime...';
        pyodideInstance = await loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'
        });

        statusBar.textContent = 'Installing Python markitdown package...';
        await pyodideInstance.loadPackage('micropip');
        const micropip = pyodideInstance.pyimport('micropip');
        await micropip.install(['markitdown']);

        statusBar.textContent = 'Ready! Drop a file to convert.';
        dropZone.style.opacity = '1';
        dropZone.style.pointerEvents = 'auto';
    } catch (error) {
        statusBar.textContent = 'Startup failed. Check console for details.';
        console.error('Pyodide/markitdown boot error:', error);
        alert('Failed to initialize Pyodide with Python markitdown. See browser console for details.');
    }
});

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-indigo-500'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-indigo-500'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-indigo-500');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

async function handleFile(file) {
    if (!file || !pyodideInstance) return;

    statusBar.classList.remove('hidden');
    statusBar.textContent = `Converting "${file.name}" completely in your browser...`;
    outputArea.classList.add('hidden');

    try {
        const fileBytes = new Uint8Array(await file.arrayBuffer());
        const targetPath = `/tmp/${file.name}`;
        pyodideInstance.FS.writeFile(targetPath, fileBytes);

        const escapedPath = targetPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const markdown = await pyodideInstance.runPythonAsync(`
from markitdown import MarkItDown

converter = MarkItDown()
result = converter.convert('${escapedPath}')
result.text_content
        `);

        markdownPreview.value = markdown;
        outputArea.classList.remove('hidden');
    } catch (error) {
        alert("Conversion failed. Check browser console logs for deep errors.");
        console.error('Pyodide conversion error:', error);
    } finally {
        statusBar.classList.add('hidden');
    }
}
