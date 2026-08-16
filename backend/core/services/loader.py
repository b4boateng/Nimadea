import pymupdf 
import csv

def extract_text_from_file(file_path):
    """Extracts text based on extension (.pdf, .txt, .md, .csv)"""
    
    if file_path.endswith('.pdf'):
        # This is now safely inside the function!
        doc = pymupdf.open(file_path)
        text = "".join([page.get_text() for page in doc])
        return text
        
    elif file_path.endswith(('.txt', '.md')):
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
            
    # --- CSV LOGIC ---
    elif file_path.endswith('.csv'):
        extracted_text = []
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.reader(f)
            
            # 1. Extract the first row to use as column headers
            headers = next(reader, None) 
            
            if headers:
                # 2. Loop through the remaining data rows
                for row_idx, row in enumerate(reader, start=2):
                    row_data = []
                    
                    # 3. Map each cell to its corresponding header
                    for col_idx, cell in enumerate(row):
                        if col_idx < len(headers) and cell.strip():
                            header_name = headers[col_idx].strip()
                            row_data.append(f"{header_name}: {cell.strip()}")
                    
                    # 4. Join the row into a highly contextual string
                    if row_data:
                        row_text = f"Row {row_idx} - " + ", ".join(row_data)
                        extracted_text.append(row_text)
                        
        return "\n".join(extracted_text)
            
    return ""