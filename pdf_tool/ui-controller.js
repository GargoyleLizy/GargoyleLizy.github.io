// UIController: wires UI to PdfService and Renderer.

console.log('UI Controller loaded. Single-page view version.'); // Debugging line

import { PdfService } from './pdf-service.js';
import { Renderer } from './renderer.js';

export class UIController {
    constructor({ pdfUploadEl, pagesContainerEl, viewBtn, reassembleBtn, mainActionsEl, paginationControlsEl, prevPageBtnEl, nextPageBtnEl, pageNumInputEl, totalPagesEl, version }) {
        this.pdfUploadEl = pdfUploadEl;
        this.pagesContainerEl = pagesContainerEl;
        this.viewBtn = viewBtn;
        this.reassembleBtn = reassembleBtn;
        this.mainActionsEl = mainActionsEl;
        this.paginationControlsEl = paginationControlsEl;
        this.prevPageBtnEl = prevPageBtnEl;
        this.nextPageBtnEl = nextPageBtnEl;
        this.pageNumInputEl = pageNumInputEl;
        this.totalPagesEl = totalPagesEl;

        this.pdfService = new PdfService();
        this.renderer = new Renderer();

        this.objectUrl = null;
        this.currentPage = 1;
        this.selectedPages = new Set();
        this._bindEvents();

        if (version) {
            const versionEl = document.createElement('div');
            versionEl.id = 'version-display'; // Give it an ID for easy debugging
            versionEl.textContent = `v${version}`;
            // Style for high visibility and to avoid being overlapped
            versionEl.style.position = 'fixed';
            versionEl.style.bottom = '5px';
            versionEl.style.right = '10px';
            versionEl.style.fontSize = '12px';
            versionEl.style.color = 'white';
            versionEl.style.backgroundColor = 'black';
            versionEl.style.padding = '2px 5px';
            versionEl.style.zIndex = '1000'; // Ensure it's on top
            document.body.appendChild(versionEl);
        }
    }

    _bindEvents() {
        this.pdfUploadEl.addEventListener('change', e => this._onFileChange(e));
        this.viewBtn.addEventListener('click', () => { if (this.objectUrl) window.open(this.objectUrl, '_blank'); });
        this.reassembleBtn.addEventListener('click', () => this._onReassemble());
        this.prevPageBtnEl.addEventListener('click', () => this._onPrevPage());
        this.nextPageBtnEl.addEventListener('click', () => this._onNextPage());
        this.pageNumInputEl.addEventListener('change', e => this._onPageJump(e));
    }

    async _onFileChange(event) {
        const file = event.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;

        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = URL.createObjectURL(file);
        this.pagesContainerEl.textContent = 'Loading PDF...';
        this.mainActionsEl.style.display = 'none';
        this.paginationControlsEl.style.display = 'none';
        this.selectedPages.clear();

        try {
            const arrayBuffer = await file.arrayBuffer();
            await this.pdfService.loadFromArrayBuffer(arrayBuffer);

            this.totalPagesEl.textContent = this.pdfService.numPages();
            this.pageNumInputEl.max = this.pdfService.numPages();
            this.paginationControlsEl.style.display = 'flex';
            this.mainActionsEl.style.display = 'flex';

            await this._renderPage(1);
        } catch (err) {
            console.error('Failed to load PDF', err);
            this.pagesContainerEl.textContent = 'Failed to load PDF. The file might be corrupted or invalid.';
            alert('Could not load the PDF. Please try another file.');
        }
    }

    async _renderPage(pageNumber) {
        if (pageNumber < 1 || pageNumber > this.pdfService.numPages()) {
            this.pageNumInputEl.value = this.currentPage;
            return;
        }

        console.log(`Rendering page number: ${pageNumber}`); // Debugging line

        this.currentPage = pageNumber;

        const page = await this.pdfService.getPage(pageNumber);
        const canvas = await this.renderer.renderPageToCanvas(page);
        const pageIndex = pageNumber - 1;

        const existingPageSelectionDiv = this.pagesContainerEl.querySelector('.page-selection');

        if (existingPageSelectionDiv) {
            // Update existing elements to prevent flashing and preserve scroll
            const existingCanvas = existingPageSelectionDiv.querySelector('canvas');
            existingCanvas.replaceWith(canvas);

            const checkbox = existingPageSelectionDiv.querySelector('input[type="checkbox"]');
            checkbox.id = `page-${pageIndex}`;
            checkbox.dataset.pageIndex = String(pageIndex);
            checkbox.checked = this.selectedPages.has(pageIndex);

            const label = existingPageSelectionDiv.querySelector('label');
            label.htmlFor = `page-${pageIndex}`;
            label.textContent = ` Select Page ${pageNumber}`;
        } else {
            // First render: build the full structure
            this.pagesContainerEl.textContent = ''; // Clear "Loading..." text

            const pageSelectionDiv = document.createElement('div');
            pageSelectionDiv.className = 'page-selection';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `page-${pageIndex}`;
            checkbox.dataset.pageIndex = String(pageIndex);
            checkbox.checked = this.selectedPages.has(pageIndex);
            checkbox.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.pageIndex, 10);
                e.target.checked ? this.selectedPages.add(idx) : this.selectedPages.delete(idx);
            });

            const label = document.createElement('label');
            label.htmlFor = `page-${pageIndex}`;
            label.textContent = ` Select Page ${pageNumber}`;

            pageSelectionDiv.appendChild(canvas);
            const checkboxContainer = document.createElement('div');
            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            pageSelectionDiv.appendChild(checkboxContainer);

            this.pagesContainerEl.replaceChildren(pageSelectionDiv);
        }

        this.pageNumInputEl.value = pageNumber;
        this.prevPageBtnEl.disabled = pageNumber <= 1;
        this.nextPageBtnEl.disabled = pageNumber >= this.pdfService.numPages();
    }

    _onPrevPage() {
        if (this.currentPage > 1) {
            this._renderPage(this.currentPage - 1);
        }
    }

    _onNextPage() {
        if (this.currentPage < this.pdfService.numPages()) {
            this._renderPage(this.currentPage + 1);
        }
    }

    _onPageJump(event) {
        const pageNum = parseInt(event.target.value, 10);
        if (!isNaN(pageNum)) {
            this._renderPage(pageNum);
        }
    }

    async _onReassemble() {
        if (!this.pdfService.pdfLibDoc) return;

        const selectedIndexes = Array.from(this.selectedPages).sort((a, b) => a - b);

        if (selectedIndexes.length === 0) {
            alert('Please select at least one page.');
            return;
        }

        try {
            const newPdfBytes = await this.pdfService.createReassembledPdf(selectedIndexes);
            const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'reassembled.pdf';
            document.body.appendChild(link);
            link.style.display = 'none';
            link.click();
            setTimeout(() => {
                URL.revokeObjectURL(link.href);
                link.remove();
            }, 1500);
        } catch (err) {
            console.error('Reassemble failed', err);
            alert('Failed to create reassembled PDF.');
        }
    }
}