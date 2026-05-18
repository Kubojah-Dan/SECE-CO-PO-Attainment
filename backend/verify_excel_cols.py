import pandas as pd
import glob
import os

files = glob.glob("*.xlsx")
print(f"Found files: {files}")
for f in files[:3]:
    print(f"\n--- Analyzing file: {f} ---")
    try:
        xl = pd.ExcelFile(f)
        print(f"Sheets: {xl.sheet_names}")
        for sheet in xl.sheet_names[:1]:
            raw_df = pd.read_excel(f, sheet_name=sheet, header=None)
            print(f"Rows count: {len(raw_df)}")
            for idx, row in raw_df.head(15).iterrows():
                row_str = [str(cell).strip().upper() for cell in row]
                if any(any(k in cell for k in ('ROLL', 'REG', 'NAME', 'MARKS')) for cell in row_str):
                    print(f"Found potential header at row {idx}: {row_str[:15]}")
    except Exception as e:
        print(f"Error: {e}")
