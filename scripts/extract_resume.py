import pypdf
import sys

reader = pypdf.PdfReader('public/Vishal_Nishad_Resume.pdf')
with open('scripts/extracted_resume.txt', 'w', encoding='utf-8') as f:
    for i, page in enumerate(reader.pages):
        f.write(f'=== PAGE {i+1} ===\n')
        f.write(page.extract_text() or '')
        f.write('\n\n')

print("Resume extracted successfully to scripts/extracted_resume.txt")
