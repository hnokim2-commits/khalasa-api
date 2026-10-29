// Isolated business-rule prototype. NOT authentication, persistence or stock locking.
import { randomUUID } from 'node:crypto';
const fail=code=>{throw new Error(code)};
const check=(ok,code)=>{if(!ok)fail(code)};
const copy=value=>structuredClone(value);
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export function moneyToPiastres(value){
  check(typeof value==='string'&&/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(value),'INVALID_MONEY');
  const [whole,fraction='']=value.split('.');
  const amount=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  check(integer(amount,0,1000000000),'INVALID_MONEY');return amount;
}
function date(value){check(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value),'INVALID_DATE');const time=Date.parse(value+'T00:00:00.000Z');check(Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value,'INVALID_DATE');return time}
function instant(value){check(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value),'INVALID_TIMESTAMP');const time=Date.parse(value);check(Number.isFinite(time)&&new Date(time).toISOString().replace('.000Z','Z')===value.replace('.000Z','Z'),'INVALID_TIMESTAMP');return time}
function text(value,max,code){check(typeof value==='string'&&value.trim().length>0&&value.trim().length<=max,code);return value.trim()}
function participant(actor,merchantId){check(actor?.merchantId===merchantId&&actor?.approved===true,'PARTICIPANT_DENIED')}
function revision(order,expected){check(Number.isSafeInteger(expected)&&order.revision===expected,'REVISION_CONFLICT')}
export function validateProduct(product,now){
  instant(now);check(product&&product.storage==='ambient_packaged','AMBIENT_PACKAGED_ONLY');
  text(product.id,100,'INVALID_PRODUCT_ID');text(product.supplierId,100,'INVALID_SUPPLIER');text(product.name,150,'INVALID_PRODUCT_NAME');text(product.batchCode,80,'BATCH_REQUIRED');text(product.storageInstructions,500,'STORAGE_INSTRUCTIONS_REQUIRED');
  check(product.supplierApproved===true,'SUPPLIER_NOT_APPROVED');
  check(integer(product.unitsPerCarton,1,10000)&&integer(product.unitWeightGrams,1,1000000),'INVALID_PACKAGING');
  check(integer(product.minCartons,1,10000)&&integer(product.stockCartons,0,1000000),'INVALID_CARTON_QUANTITY');
  check(integer(product.cartonPricePiastres,1,1000000000),'INVALID_CARTON_PRICE');
  const made=date(product.productionDate),expires=date(product.expiryDate);
  check(made<=date(now.slice(0,10))&&made<expires&&expires>date(now.slice(0,10)),'INVALID_SHELF_LIFE');
  return copy(product);
}
export function createRequest({buyer,product,cartons,now}){
  validateProduct(product,now);check(buyer?.approved===true,'BUYER_NOT_APPROVED');text(buyer.merchantId,100,'INVALID_BUYER');
  check(buyer.merchantId!==product.supplierId,'SELF_SUPPLY_DENIED');
  check(integer(cartons,product.minCartons,10000)&&cartons<=product.stockCartons,'INVALID_CARTONS');
  return {id:randomUUID(),buyerId:buyer.merchantId,supplierId:product.supplierId,productId:product.id,cartons,status:'requested',revision:1,requestedAt:now,quote:null,acceptance:null,receipt:null};
}
export function quoteRequest({order,supplier,product,cartonPrice,transportPrice,deliveryAt,validUntil,now,expectedRevision}){
  participant(supplier,order.supplierId);revision(order,expectedRevision);check(['requested','quoted'].includes(order.status),'NOT_QUOTABLE');
  validateProduct(product,now);check(product.id===order.productId&&product.supplierId===order.supplierId,'PRODUCT_SCOPE_MISMATCH');
  check(order.cartons>=product.minCartons&&order.cartons<=product.stockCartons,'INSUFFICIENT_STOCK');
  const current=instant(now),delivery=instant(deliveryAt),until=instant(validUntil);
  check(delivery>current&&until>current&&until<=delivery,'INVALID_QUOTE_WINDOW');
  check(delivery<date(product.expiryDate),'EXPIRES_BEFORE_DELIVERY');
  const price=moneyToPiastres(cartonPrice),transport=moneyToPiastres(transportPrice);check(price>0,'INVALID_CARTON_PRICE');
  const subtotal=order.cartons*price,total=subtotal+transport;check(Number.isSafeInteger(total),'TOTAL_OVERFLOW');
  const next=copy(order);next.status='quoted';next.revision++;
  next.quote={version:(order.quote?.version||0)+1,createdAt:now,validUntil,deliveryAt,payment:'cash_on_delivery',cartons:order.cartons,cartonPricePiastres:price,goodsPiastres:subtotal,transportPiastres:transport,totalPiastres:total,productSnapshot:copy(product)};
  return next;
}
export function acceptQuote({order,buyer,product,quoteVersion,now,expectedRevision}){
  participant(buyer,order.buyerId);revision(order,expectedRevision);check(order.status==='quoted','NOT_ACCEPTABLE');
  check(order.quote.version===quoteVersion,'QUOTE_CHANGED_RECONFIRM');check(instant(now)<instant(order.quote.validUntil),'QUOTE_EXPIRED');
  validateProduct(product,now);check(product.id===order.productId&&product.supplierId===order.supplierId,'PRODUCT_SCOPE_MISMATCH');
  check(product.stockCartons>=order.cartons,'INSUFFICIENT_STOCK');
  for(const field of ['batchCode','productionDate','expiryDate','unitsPerCarton','unitWeightGrams','storage','storageInstructions','name'])check(product[field]===order.quote.productSnapshot[field],'PRODUCT_CHANGED_REQUOTE');
  const next=copy(order);next.status='accepted';next.revision++;next.acceptance={at:now,quoteVersion,totalPiastres:order.quote.totalPiastres,payment:'cash_on_delivery'};return next;
}
export function recordReceipt({order,buyer,receivedCartons,damagedCartons,reference,now,expectedRevision}){
  participant(buyer,order.buyerId);revision(order,expectedRevision);check(order.status==='accepted','NOT_RECEIVABLE');instant(now);check(instant(now)>=instant(order.acceptance.at),'INVALID_RECEIPT_TIME');
  check(integer(receivedCartons,0,order.cartons)&&integer(damagedCartons,0,receivedCartons),'INVALID_RECEIPT_COUNTS');
  const ref=text(reference,500,'RECEIPT_REFERENCE_REQUIRED'),next=copy(order);
  next.status=receivedCartons===order.cartons&&damagedCartons===0?'received':'disputed';next.revision++;
  next.receipt={at:now,receivedCartons,damagedCartons,missingCartons:order.cartons-receivedCartons,reference:ref,paymentConfirmed:false};return next;
}
export function cancelRequest({order,buyer,now,expectedRevision}){
  participant(buyer,order.buyerId);revision(order,expectedRevision);check(['requested','quoted'].includes(order.status),'CANCELLATION_REQUIRES_REVIEW');instant(now);
  return {...copy(order),status:'cancelled',revision:order.revision+1,cancelledAt:now};
}
