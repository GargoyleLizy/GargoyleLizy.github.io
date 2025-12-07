// Renderer: produces canvas previews and page selection DOM fragments.

export class Renderer {
    constructor(container) {
        this.container = container;
    }

    async renderPageToCanvas(pdfPage, scale = 1.2) {
        const viewport = pdfPage.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        return canvas;
    }

    async renderAllPages(pdfService) {
        const fragment = document.createDocumentFragment();
        const total = pdfService.numPages();
        for (let i = 0; i < total; i++) {
            const page = await pdfService.getPage(i + 1);
            const canvas = await this.renderPageToCanvas(page, 1.2);

            const pageSelectionDiv = document.createElement('div');
            pageSelectionDiv.className = 'page-selection';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `page-${i}`;
            checkbox.dataset.pageIndex = String(i);

            const label = document.createElement('label');
            label.htmlFor = `page-${i}`;
            label.textContent = ` Page ${i + 1}`;

            pageSelectionDiv.appendChild(canvas);
            const checkboxContainer = document.createElement('div');
            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            pageSelectionDiv.appendChild(checkboxContainer);

            fragment.appendChild(pageSelectionDiv);
        }
        return fragment;
    }
}