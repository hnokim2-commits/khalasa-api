UPDATE merchants m
SET verification='approved', is_accepting_orders=true
WHERE (
  SELECT count(DISTINCT d.document_type)
  FROM merchant_documents d
  WHERE d.merchant_id=m.id AND d.verification='approved'
) >= 4;
