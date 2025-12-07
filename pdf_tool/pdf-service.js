// PdfService: loads PDFs using pdf.js and pdf-lib and provides helpers.

import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.min.mjs';

// keep worker version in sync
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs';

// expose for compatibility/debugging
window.pdfjsLib = pdfjsLib;

export class PdfService {
    constructor() {
        this.pdfjs = pdfjsLib;
        this.PDFLib = window.PDFLib; // global provided by script tag
        this.pdfjsDoc = null;
        this.pdfLibDoc = null;
        this.arrayBuffer = null;
    }

    async loadFromArrayBuffer(arrayBuffer) {
        this.arrayBuffer = arrayBuffer;
        const pdfjsPromise = this.pdfjs.getDocument({ data: arrayBuffer }).promise;
        const pdfLibPromise = this.PDFLib.PDFDocument.load(arrayBuffer);
        [this.pdfjsDoc, this.pdfLibDoc] = await Promise.all([pdfjsPromise, pdfLibPromise]);
    }

    numPages() {
        return this.pdfjsDoc?.numPages ?? 0;
    }

    getPage(pageNumber) {
        return this.pdfjsDoc.getPage(pageNumber);
    }

    async createReassembledPdf(selectedIndexes) {
        const newDoc = await this.PDFLib.PDFDocument.create();
        const copiedPages = await newDoc.copyPages(this.pdfLibDoc, selectedIndexes);
        copiedPages.forEach(p => newDoc.addPage(p));
        return newDoc.save();
    }
}