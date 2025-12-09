// Renderer: produces canvas previews and page selection DOM fragments.

export class Renderer {
    constructor() {}

    async renderPageToCanvas(pdfPage, scale = 1.2) {
        const viewport = pdfPage.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        return canvas;
    }
}