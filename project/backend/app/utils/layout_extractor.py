import os
import pypdf
import docx
from typing import Dict, Any, List

# Try imports for LayoutLMv3 (Deactivated for memory optimization on Render free tier)
LAYOUTLM_ACTIVE = False

def extract_text_pypdf(file_bytes: bytes) -> str:
    """Standard pypdf fallback text extractor."""
    import io
    pdf_file = io.BytesIO(file_bytes)
    reader = pypdf.PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text

def extract_text_docx(file_bytes: bytes) -> str:
    """Standard docx paragraph text extractor."""
    import io
    docx_file = io.BytesIO(file_bytes)
    doc = docx.Document(docx_file)
    text = ""
    for paragraph in doc.paragraphs:
        text += paragraph.text + "\n"
    return text

def extract_text_layoutlmv3(file_bytes: bytes) -> str:
    """
    Multimodal extraction using LayoutLMv3 and EasyOCR.
    Renders PDF pages to images, extracts coordinates and words,
    and returns a layout-sorted text representation.
    """
    if not LAYOUTLM_ACTIVE:
        raise ImportError("LayoutLMv3 libraries are not installed.")
        
    import io
    # Convert PDF to PIL Images
    try:
        # Note: pdf2image requires Poppler binary installed on system
        images = pdf2image.convert_from_bytes(file_bytes)
    except Exception as e:
        print(f"pdf2image conversion failed (usually due to missing Poppler): {e}")
        raise e
        
    # Lazy init of OCR and LayoutLMv3 to speed up startup
    print("Loading EasyOCR Reader and LayoutLMv3 Model...")
    reader = easyocr.Reader(['en'], gpu=torch.cuda.is_available())
    
    # Load processor and model
    processor = AutoProcessor.from_pretrained("microsoft/layoutlmv3-base", apply_ocr=False)
    model = AutoModel.from_pretrained("microsoft/layoutlmv3-base", dtype="auto")
    
    full_text_blocks = []
    
    for page_idx, img in enumerate(images):
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_bytes = img_byte_arr.getvalue()
        
        ocr_results = reader.readtext(img_bytes)
        if not ocr_results:
            continue
            
        words = []
        boxes = []
        width, height = img.size
        
        for bbox, word, conf in ocr_results:
            # Scale coordinates to 0-1000 for LayoutLMv3
            x0 = int(bbox[0][0] * 1000 / width)
            y0 = int(bbox[0][1] * 1000 / height)
            x1 = int(bbox[2][0] * 1000 / width)
            y1 = int(bbox[2][1] * 1000 / height)
            
            x0 = max(0, min(1000, x0))
            y0 = max(0, min(1000, y0))
            x1 = max(0, min(1000, x1))
            y1 = max(0, min(1000, y1))
            
            words.append(word)
            boxes.append([x0, y0, x1, y1])
            
        # Process with LayoutLMv3
        try:
            inputs = processor(img, words, boxes=boxes, return_tensors="pt")
            with torch.no_grad():
                outputs = model(**inputs)
            
            # Sort OCR results by top coordinate y0, then left x0
            # to preserve column reading order
            sorted_ocr = sorted(ocr_results, key=lambda x: (x[0][0][1], x[0][0][0]))
            page_text = " ".join([item[1] for item in sorted_ocr])
            full_text_blocks.append(page_text)
        except Exception as e:
            print(f"LayoutLMv3 model execution failed, using raw OCR list: {e}")
            page_text = " ".join([item[1] for item in ocr_results])
            full_text_blocks.append(page_text)
            
    return "\n\n".join(full_text_blocks)

def extract_document_content(file_bytes: bytes, filename: str) -> str:
    """
    Main entry point for document extraction.
    Determines file type, runs LayoutLMv3 if PDF and active,
    and falls back to standard text extractors on failure.
    """
    _, ext = os.path.splitext(filename)
    ext = ext.lower()
    
    if ext == ".docx":
        return extract_text_docx(file_bytes)
        
    # For PDFs
    if LAYOUTLM_ACTIVE:
        try:
            print("Attempting document visual extraction using LayoutLMv3...")
            return extract_text_layoutlmv3(file_bytes)
        except Exception as e:
            print(f"LayoutLMv3 visual extraction failed, falling back to standard PyPDF extraction: {e}")
            return extract_text_pypdf(file_bytes)
    else:
        return extract_text_pypdf(file_bytes)
