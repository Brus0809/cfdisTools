// main.js
// Orquesta los demás módulos: conecta los eventos del DOM (drop zone,
// botones) con el estado de archivos, el renderizado y la llamada al API.

import {
    getSelectedFiles,
    getFileCount,
    addFiles,
    removeFile,
    clearFiles,
} from './FileManager/FileManager.js';

import {
    renderFileList,
    onRemoveFileClick,
    showError,
    hideError,
    showProgressView,
    updateProgress,
    hideProgressView,
    showResult,
    hideResult,
    showDropZoneView,
} from './UI/UIRenderer.js';

import { convertFiles } from './Api/Api.js';

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnConvert = document.getElementById('btn-convert');
    const btnClear = document.getElementById('btn-clear');
    const btnRestart = document.getElementById('btn-restart');

    let activeRequest = null; // referencia al XHR en curso, evita doble envío

    // ---------- Selección de archivos ----------

    dropZone.addEventListener('click', (e) => {
        if (e.target !== fileInput) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        handleFilesSelected(e.target.files);
        fileInput.value = '';
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        handleFilesSelected(e.dataTransfer.files);
    });

    function handleFilesSelected(fileList) {
        hideError();
        const { rejected } = addFiles(fileList);

        if (rejected.length > 0) {
            showError(`No se agregaron ${rejected.length} archivo(s): ${rejected.join(', ')}`);
        }

        renderFileList(getSelectedFiles());
    }

    onRemoveFileClick((fileId) => {
        removeFile(fileId);
        renderFileList(getSelectedFiles());
    });

    btnClear.addEventListener('click', () => {
        clearFiles();
        renderFileList(getSelectedFiles());
    });

    // ---------- Conversión ----------

    btnConvert.addEventListener('click', () => {
        if (getFileCount() === 0 || activeRequest) return;
        startConversion();
    });

    function startConversion() {
        hideError();
        showProgressView();
        updateProgress(0, 'Subiendo archivos...');

        const files = getSelectedFiles().map(f => f.file);

        activeRequest = convertFiles(files, {
            onProgress: (percent) => {
                updateProgress(
                    percent,
                    percent < 100 ? `Subiendo archivos... ${percent}%` : 'Procesando en el servidor...'
                );
            },
            onSuccess: ({ blob, fileName }) => {
                activeRequest = null;
                updateProgress(100, '¡Completado!');
                hideProgressView();
                showResult({
                    blob,
                    fileName,
                    message: `Se procesaron y estructuraron ${files.length} archivo(s) correctamente en hojas organizadas de Excel.`,
                });
            },
            onError: (message) => {
                activeRequest = null;
                hideProgressView();
                renderFileList(getSelectedFiles());
                showError(message);
            },
        });
    }

    // ---------- Reinicio ----------

    btnRestart.addEventListener('click', () => {
        clearFiles();
        hideError();
        hideResult();
        showDropZoneView();
    });
});