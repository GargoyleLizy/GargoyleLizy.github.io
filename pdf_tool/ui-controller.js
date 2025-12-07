// UIController: wires UI to PdfService and Renderer.

import { PdfService } from './pdf-service.js';
import { Renderer } from './renderer.js';

export class UIController {
    constructor({ pdfUploadEl, pagesContainerEl, viewBtn, reassembleBtn, mainActionsEl }) {
        this.pdfUploadEl = pdfUploadEl;
        this.pagesContainerEl = pagesContainerEl;
        this.viewBtn = viewBtn;
        this.reassembleBtn = reassembleBtn;
        this.mainActionsEl = mainActionsEl;

        this.pdfService = new PdfService();
        this.renderer = new Renderer(this.pagesContainerEl);

        this.objectUrl = null;
        this._bindEvents();
    }

    _bindEvents() {
        this.pdfUploadEl.addEventListener('change', e => this._onFileChange(e));
        this.viewBtn.addEventListener('click', () => { if (this.objectUrl) window.open(this.objectUrl, '_blank'); });
        this.reassembleBtn.addEventListener('click', () => this._onReassemble());
    }

    async _onFileChange(event) {
        const file = event.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;

        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = URL.createObjectURL(file);
        this.pagesContainerEl.innerHTML = 'Loading PDF...';
        this.mainActionsEl.style.display = 'none';

        try {
            const arrayBuffer = await file.arrayBuffer();
            await this.pdfService.loadFromArrayBuffer(arrayBuffer);

            const fragment = await this.renderer.renderAllPages(this.pdfService);
            this.pagesContainerEl.innerHTML = '';
            this.pagesContainerEl.appendChild(fragment);

            this.mainActionsEl.style.display = 'flex';
        } catch (err) {
            console.error('Failed to load PDF', err);
            this.pagesContainerEl.innerHTML = 'Failed to load PDF. The file might be corrupted or invalid.';
            alert('Could not load the PDF. Please try another file.');
        }
    }

    async _onReassemble() {
        if (!this.pdfService.pdfLibDoc) return;

        const selectedIndexes = Array.from(this.pagesContainerEl.querySelectorAll('input:checked'))
            .map(cb => parseInt(cb.dataset.pageIndex, 10));

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