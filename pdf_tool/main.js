// Entry: initialize the UIController when DOM is ready.

import { UIController } from './ui-controller.js';

window.addEventListener('DOMContentLoaded', () => {
    const pdfUpload = document.getElementById('pdf-upload');
    const pagesContainer = document.getElementById('pages-container');
    const reassembleBtn = document.getElementById('reassemble-btn');
    const mainActions = document.getElementById('main-actions');
    const viewPdfBtn = document.getElementById('view-pdf-btn');

    new UIController({
        pdfUploadEl: pdfUpload,
        pagesContainerEl: pagesContainer,
        viewBtn: viewPdfBtn,
        reassembleBtn,
        mainActionsEl: mainActions
    });
});