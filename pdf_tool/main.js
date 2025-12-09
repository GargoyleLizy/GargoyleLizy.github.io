// Entry: initialize the UIController when DOM is ready.

import { UIController } from './ui-controller.js';

window.addEventListener('DOMContentLoaded', () => {
    const VERSION = '0.0.1';

    const pdfUpload = document.getElementById('pdf-upload');
    const pagesContainer = document.getElementById('pages-container');
    const reassembleBtn = document.getElementById('reassemble-btn');
    const mainActions = document.getElementById('main-actions');
    const viewPdfBtn = document.getElementById('view-pdf-btn');
    const paginationControls = document.getElementById('pagination-controls');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageNumInput = document.getElementById('page-num-input');
    const totalPagesEl = document.getElementById('total-pages');

    new UIController({
        pdfUploadEl: pdfUpload,
        pagesContainerEl: pagesContainer,
        viewBtn: viewPdfBtn,
        reassembleBtn,
        mainActionsEl: mainActions,
        paginationControlsEl: paginationControls,
        prevPageBtnEl: prevPageBtn,
        nextPageBtnEl: nextPageBtn,
        pageNumInputEl: pageNumInput,
        totalPagesEl: totalPagesEl,
        version: VERSION
    });
});