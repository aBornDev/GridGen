const { jsPDF } = window.jspdf;

        const orientationInput = document.getElementById('orientation');
        const rowsInput = document.getElementById('rows');
        const colsInput = document.getElementById('cols');
        const lineInput = document.getElementById('line');
        const lineColorInput = document.getElementById('lineColor');
        const textColorInput = document.getElementById('textColor');
        const backgroundImgInput = document.getElementById('backgroundImg');
        const imagePreview = document.getElementById('imagePreview');
        const previewPdfButton = document.getElementById('previewPdf');
        const downloadPdfButton = document.getElementById('downloadPdf');
        const pdfPreviewContainer = document.getElementById('pdfPreviewContainer');
        const pdfPreview = document.getElementById('pdfPreview');
        let uploadedImageBase64 = null;
        let currentPdfBlobUrl = null;

        function getColumnLetter(colIndex) {
            /*
             * Converts a 0-based column index to its corresponding Excel-style column letter (e.g., 0 -> A, 1 -> B, 25 -> Z, 26 -> AA).
             * @param {number} colIndex - The 0-based index of the column.
             * @returns {string} The Excel-style column letter.
             */
            let result = '';
            let num = colIndex;
            while (num >= 0) {
                result = String.fromCharCode(65 + (num % 26)) + result;
                num = Math.floor(num / 26) - 1;
            }
            return result;
        }

        backgroundImgInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = 'block';
                    uploadedImageBase64 = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                imagePreview.src = '#';
                imagePreview.style.display = 'none';
                uploadedImageBase64 = null;
            }
        });

        function generatePdfDocument() {
            /*
             * Generates a PDF document with a grid based on user input.
             * @returns {jsPDF|null} The generated jsPDF document object, or null if validation fails.
             */
            
            const selectedOrientation = orientationInput.value;
            const numRows = parseInt(rowsInput.value);
            const numCols = parseInt(colsInput.value);
            const numLine = parseInt(lineInput.value);
            const lineColor = lineColorInput.value;
            const textColor = textColorInput.value;

            if (isNaN(numRows) || numRows <= 0 || isNaN(numCols) || numCols <= 0) {
                alert("Voer geldige aantallen voor rijen en kolommen in (minimaal 1).");
                return null;
            }

            const doc = new jsPDF(selectedOrientation, 'mm', 'a4');

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            const margin = 0;
            const labelMargin = 8;

            const gridStartX = margin + labelMargin;
            const gridStartY = margin + labelMargin;
            const gridEndX = pageWidth - margin;
            const gridEndY = pageHeight - margin;

            const usableGridWidth = gridEndX - gridStartX;
            const usableGridHeight = gridEndY - gridStartY;

            const colWidth = usableGridWidth / numCols;
            const rowHeight = usableGridHeight / numRows;

            if (uploadedImageBase64) {
                try {
                    doc.addImage(uploadedImageBase64, 'JPEG', gridStartX, gridStartY, usableGridWidth, usableGridHeight);
                } catch (e) {
                    console.error("Fout bij het toevoegen van de afbeelding:", e);
                    alert("Kon de afbeelding niet toevoegen. Zorg ervoor dat het een geldig afbeeldingsbestand is.");
                }
            }

            doc.setDrawColor(lineColor);
            doc.setLineWidth(numLine / 10);

            for (let i = 0; i <= numCols; i++) {
                const x = gridStartX + i * colWidth;
                doc.line(x, gridStartY, x, gridEndY);
            }

            for (let i = 0; i <= numRows; i++) {
                const y = gridStartY + i * rowHeight;
                doc.line(gridStartX, y, gridEndX, y);
            }

            doc.setFontSize(10);
            doc.setTextColor(textColor);

            for (let c = 0; c < numCols; c++) {
                const colLetter = getColumnLetter(c);
                const textX = gridStartX + c * colWidth + colWidth / 2;

                doc.text(colLetter, textX, margin + (labelMargin / 2), { align: 'center', baseline: 'middle' });
                doc.text(colLetter, textX, pageHeight - margin - (labelMargin / 2), { align: 'center', baseline: 'middle' });
            }

            
            for (let r = 0; r < numRows; r++) {
                const rowNumber = r + 1;
                const textY = gridStartY + r * rowHeight + rowHeight / 2;

                doc.text(String(rowNumber), margin + (labelMargin / 2), textY, { align: 'center', baseline: 'middle' });
                doc.text(String(rowNumber), pageWidth - margin - (labelMargin / 2), textY, { align: 'center', baseline: 'middle' });
            }

            return doc;
        }

        previewPdfButton.addEventListener('click', () => {
            // Generate the PDF preview
            const doc = generatePdfDocument();
            if (doc) {
                const pdfBlob = doc.output('blob');

                if (currentPdfBlobUrl) {
                    URL.revokeObjectURL(currentPdfBlobUrl);
                }

                currentPdfBlobUrl = URL.createObjectURL(pdfBlob);

                pdfPreview.src = currentPdfBlobUrl;
                pdfPreviewContainer.style.display = 'block';
            } else {
                pdfPreviewContainer.style.display = 'none';
            }
        });

        downloadPdfButton.addEventListener('click', () => {
            // Generate the PDF document
            const doc = generatePdfDocument();
            if (doc) {
                doc.save("gridkaart.pdf");
            }
        });