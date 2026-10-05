import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const migrationUrl=new URL('../migrations/0028_supplier_and_wholesale.sql',import.meta.url);

test('supplier migration is in the directory used by the migration runner',async()=>{
  const sql=await readFile(migrationUrl,'utf8');
  for(const required of ['activity_type','wholesale_enabled','stock_quantity','order_items ADD COLUMN IF NOT EXISTS product_id'])assert.match(sql,new RegExp(required.replaceAll(' ','\\s+')));
});

test('existing products receive safe launch stock before the default returns to zero',async()=>{
  const sql=await readFile(migrationUrl,'utf8');
  assert.match(sql,/stock_quantity integer NOT NULL DEFAULT 100/);
  assert.match(sql,/ALTER COLUMN stock_quantity SET DEFAULT 0/);
});
