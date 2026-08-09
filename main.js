import { WebContainer } from 'https://jsdelivr.net';
import { files } from './files.js';

let webcontainerInstance;
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const statusBar = document.getElementById('status-bar');
const outputArea = document.getElementById('output-area');
const markdownPreview = document.getElementById('markdown-preview');

// Initialize the virtual environment on window load
window.addEventListener('load', async () => {
    statusBar.textContent = "Booting virtual client runtime environment...";
    webcontainerInstance = await WebContainer.boot();
    await webcontainerInstance.mount(files);
    
    statusBar.textContent = "Installing markitdown-js dependencies inside browser...";
    const installProcess = await webcontainerInstance.spawn('npm', ['install']);
    await installProcess.exit;
    
    statusBar.textContent = "Ready! Drop a file to convert.";
    dropZone.style.opacity = "1";
    dropZone.style.pointerEvents = "auto";
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
    if (!file || !webcontainerInstance) return;

    statusBar.classList.remove('hidden');
    statusBar.textContent = `Converting "${file.name}" completely in your browser...`;
    outputArea.classList.add('hidden');

    // Read file bytes locally into an ArrayBuffer array
    const fileBytes = await file.arrayBuffer();

    // Write file directly into the WebContainer virtual storage loop
    await webcontainerInstance.fs.writeFile('/target-doc', new Uint8Array(fileBytes));

    // Execute script via native shell simulation inside the browser tab
    const runProcess = await webcontainerInstance.spawn('node', ['worker-convert.js']);
    
    let rawOutput = '';
    runProcess.output.pipeTo(new WritableStream({
        write(data) {
            rawOutput += data;
        }
    }));

    const exitCode = await runProcess.exit;
    statusBar.classList.add('hidden');

    if (exitCode === 0 && rawOutput.includes('---BEGIN_MARKDOWN---')) {
        // Parse stream chunk between logs
        const markdown = rawOutput.split('---BEGIN_MARKDOWN---\n')[1].split('\n---END_MARKDOWN---')[0];
        markdownPreview.value = markdown;
        outputArea.classList.remove('hidden');
    } else {
        alert("Conversion failed. Check browser console logs for deep errors.");
        console.error("Shell Output logs:\n", rawOutput);
    }
}
