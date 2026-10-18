const validId=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value||''));
export function registerOrderMessages(app,{pool,auth,asyncRoute}){
 const scopeSql=`SELECT o.id FROM orders o JOIN riders r ON r.id=o.rider_id
 WHERE o.id=$1 AND o.status IN ('assigned','picked_up')
 AND (($3::text='customer' AND o.customer_id=$2) OR ($3::text='rider' AND r.user_id=$2))`;
 app.get('/v1/orders/:id/messages',auth('customer','rider'),asyncRoute(async(req,res)=>{
  if(!validId(req.params.id))return res.status(400).json({error:'INVALID_ORDER_ID'});
  // One statement keeps the participant/status check and message read in one snapshot.
  const result=await pool.query(`WITH permitted AS (${scopeSql}) SELECT p.id order_id,
    COALESCE((SELECT json_agg(m ORDER BY m.created_at,m.id) FROM
      (SELECT id,sender_role,body,created_at FROM order_messages WHERE order_id=p.id ORDER BY created_at DESC,id DESC LIMIT 100) m),'[]'::json) messages
    FROM permitted p`,[req.params.id,req.user.sub,req.user.role]);
  res.set('Cache-Control','no-store');
  if(!result.rowCount)return res.status(404).json({error:'ACTIVE_ORDER_CHAT_NOT_FOUND'});
  res.json({messages:result.rows[0].messages});
 }));
 app.post('/v1/orders/:id/messages',auth('customer','rider'),asyncRoute(async(req,res)=>{
  if(!validId(req.params.id))return res.status(400).json({error:'INVALID_ORDER_ID'});
  if(typeof req.body.message!=='string')return res.status(400).json({error:'INVALID_MESSAGE'});
  const message=req.body.message.trim();
  if(!message||[...message].length>500||Buffer.byteLength(message,'utf8')>2000)return res.status(400).json({error:'INVALID_MESSAGE'});
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const permitted=await client.query(scopeSql+' FOR UPDATE OF o',[req.params.id,req.user.sub,req.user.role]);
   if(!permitted.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'ACTIVE_ORDER_CHAT_NOT_FOUND'});}
   const recent=await client.query("SELECT count(*)::int count FROM order_messages WHERE order_id=$1 AND sender_user_id=$2 AND created_at>now()-interval '1 minute'",[req.params.id,req.user.sub]);
   if(Number(recent.rows[0].count)>=20){await client.query('ROLLBACK');return res.status(429).set('Retry-After','60').json({error:'MESSAGE_RATE_LIMITED'});}
   const result=await client.query('INSERT INTO order_messages(order_id,sender_user_id,sender_role,body) VALUES($1,$2,$3,$4) RETURNING id,sender_role,body,created_at',[req.params.id,req.user.sub,req.user.role,message]);
   await client.query('COMMIT');res.set('Cache-Control','no-store').status(201).json({message:result.rows[0]});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }));
}
