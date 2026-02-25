-- Clear existing data
TRUNCATE TABLE "Bin" RESTART IDENTITY;

-- Generate seed data for K1, K2, K3, K4
DO $$
DECLARE
    col_name TEXT;
    row_num INT;
    layer_num INT;
    has_item BOOLEAN;
    sku_val TEXT;
    qty_val INT;
    bin_id TEXT;
BEGIN
    FOR col_name IN SELECT unnest(ARRAY['K1', 'K2', 'K3', 'K4']) LOOP
        FOR row_num IN 1..10 LOOP
            FOR layer_num IN 1..3 LOOP
                has_item := random() > 0.4;
                bin_id := col_name || '-L' || layer_num || '-R' || row_num;
                
                IF has_item THEN
                    sku_val := 'SKU-A' || floor(random() * 900 + 100)::TEXT;
                    qty_val := floor(random() * 50 + 1)::INT;
                ELSE
                    sku_val := NULL;
                    qty_val := 0;
                END IF;

                INSERT INTO "Bin" (id, col, row, layer, sku, quantity, "inboundTime", "updatedAt")
                VALUES (bin_id, col_name, row_num, layer_num, sku_val, qty_val, CASE WHEN has_item THEN NOW() ELSE NULL END, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    sku = EXCLUDED.sku,
                    quantity = EXCLUDED.quantity,
                    "inboundTime" = EXCLUDED."inboundTime",
                    "updatedAt" = EXCLUDED."updatedAt";
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
