import pandas as pd
import os

def layer_to_int(letter):
    mapping = {'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6}
    return mapping.get(letter.upper(), 1)

def parse_location(loc_str):
    # F33-01-A -> col="F33", row=1, layer=1
    try:
        parts = loc_str.split('-')
        if len(parts) >= 3:
            col = parts[0]
            row = int(parts[1])
            layer = layer_to_int(parts[2][0])
            return col, row, layer
        return None, None, None
    except:
        return None, None, None

def generate_sql():
    file_path = 'ProductInventory_20260224221639.xlsx'
    df = pd.read_excel(file_path)
    
    # Map headers correctly
    # ['sku', 'Barcode/产品条码', 'productName', 'Warehouse/仓库', 'Customer/客户', 'Location/库位', 'Area/库区', 'Stock Property/库存属性', 'Total Stock/总库存', 'Available Inventory/可用库存', 'Locked Inventory/锁定库存']
    
    sku_col = 'sku'
    loc_col = 'Location/库位'
    qty_col = 'Available Inventory/可用库存'
    
    sql_lines = []
    
    for _, row_data in df.iterrows():
        sku = str(row_data[sku_col]).strip()
        loc = str(row_data[loc_col]).strip()
        qty = int(row_data[qty_col])
        
        if not loc or loc == 'nan':
            continue
            
        col, row, layer = parse_location(loc)
        if col:
            bin_id = f"{col}-L{layer}-R{row}"
            # Escape single quotes in SKU
            safe_sku = sku.replace("'", "''")
            sql = f"INSERT INTO \"Bin\" (id, col, row, layer, sku, quantity, \"updatedAt\") VALUES ('{bin_id}', '{col}', {row}, {layer}, '{safe_sku}', {qty}, NOW()) ON CONFLICT (id) DO UPDATE SET sku = EXCLUDED.sku, quantity = EXCLUDED.quantity, \"updatedAt\" = EXCLUDED.\"updatedAt\";"
            sql_lines.append(sql)
            
    with open('import_inventory.sql', 'w') as f:
        f.write("\n".join(sql_lines))
    
    print(f"Generated {len(sql_lines)} SQL statements.")

if __name__ == "__main__":
    generate_sql()
