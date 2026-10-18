import crypto from 'node:crypto';
const fail=(code,status=400)=>{const error=new Error(code);error.code=code;error.status=status;throw error;};
export function localVoiceEnabled(env){
 try{const url=new URL(env.DATABASE_URL);return env.KHALASA_LOCAL_VOICE==='1'&&env.NODE_ENV==='development'&&url.hostname==='127.0.0.1'&&url.pathname==='/khalasa_local_test';}catch{return false;}
}
export function createLocalVoiceSessions({now=()=>Date.now()}={}){
 const calls=new Map();
 const participants=scope=>`${scope.customer_id}:${scope.rider_user_id}`;
 function current(orderId,scope){
  for(const [key,call] of calls)if(call.expires<=now())calls.delete(key);
  const call=calls.get(orderId);
  if(call&&call.participants!==participants(scope)){calls.delete(orderId);return null;}
  return call||null;
 }
 function sdp(value,type){if(!value||value.type!==type||typeof value.sdp!=='string'||value.sdp.length>32768||!value.sdp.startsWith('v=0')||!value.sdp.includes('m=audio')||value.sdp.includes('m=video'))fail('INVALID_VOICE_DESCRIPTION');return {type,sdp:value.sdp};}
 return {
  remove:orderId=>calls.delete(orderId),
  read(orderId,scope,user){
   const call=current(orderId,scope);if(!call)return {call:null};
   return {call:{id:call.id,state:call.state,callerRole:call.callerRole,initiatedByMe:call.caller===user.sub,offer:call.offer,answer:call.answer,candidates:call.candidates.filter(item=>item.sender!==user.sub).map(item=>item.value)}};
  },
  act(orderId,scope,user,body){
   let call=current(orderId,scope);
   if(body.action==='start'){
    if(call&&call.state!=='ended')fail('VOICE_BUSY',409);
    if(calls.size>=50&&!calls.has(orderId))fail('VOICE_CAPACITY',503);
    const offer=sdp(body.description,'offer');
    call={id:crypto.randomUUID(),participants:participants(scope),caller:user.sub,callerRole:user.role,offer,answer:null,candidates:[],state:'ringing',expires:now()+30000};
    calls.set(orderId,call);return {callId:call.id};
   }
   if(!call||call.id!==body.callId||call.state==='ended')fail('VOICE_CALL_NOT_FOUND',404);
   if(body.action==='answer'){
    if(call.caller===user.sub||call.state!=='ringing')fail('VOICE_INVALID_STATE',409);
    call.answer=sdp(body.description,'answer');call.state='accepted';call.expires=now()+600000;
   }else if(body.action==='end'){
    call.state='ended';call.offer=null;call.answer=null;call.candidates=[];call.expires=now()+5000;
   }else if(body.action==='ice'){
    const value=body.candidate;
    if(!value||typeof value.candidate!=='string'||value.candidate.length>2048||value.sdpMid!=null&&(typeof value.sdpMid!=='string'||value.sdpMid.length>128)||value.sdpMLineIndex!=null&&(!Number.isInteger(value.sdpMLineIndex)||value.sdpMLineIndex<0||value.sdpMLineIndex>32))fail('INVALID_VOICE_CANDIDATE');
    if(call.candidates.filter(item=>item.sender===user.sub).length>=64)fail('VOICE_ICE_LIMIT',429);
    call.candidates.push({sender:user.sub,value:{candidate:value.candidate,sdpMid:value.sdpMid??null,sdpMLineIndex:value.sdpMLineIndex??null}});
   }else fail('INVALID_VOICE_ACTION');
   return {ok:true};
  }
 };
}
export function registerLocalVoice(app,{pool,auth,asyncRoute,env}){
 if(!localVoiceEnabled(env))return;
 const sessions=createLocalVoiceSessions();
 const access=async(req,res)=>{
  if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(req.params.id||''))){res.status(400).json({error:'INVALID_ORDER_ID'});return null;}
  const result=await pool.query(`SELECT o.id,o.customer_id,r.user_id rider_user_id FROM orders o JOIN riders r ON r.id=o.rider_id
   WHERE o.id=$1 AND o.status IN ('assigned','picked_up')
   AND (($3::text='customer' AND o.customer_id=$2) OR ($3::text='rider' AND r.user_id=$2))`,[req.params.id,req.user.sub,req.user.role]);
  res.set('Cache-Control','no-store');
  if(!result.rowCount){res.status(404).json({error:'ACTIVE_ORDER_CALL_NOT_FOUND'});return null;}
  return result.rows[0];
 };
 app.get('/v1/orders/:id/voice/local',auth('customer','rider'),asyncRoute(async(req,res)=>{
  const scope=await access(req,res);if(scope)res.json(sessions.read(req.params.id,scope,req.user));
 }));
 app.post('/v1/orders/:id/voice/local',auth('customer','rider'),asyncRoute(async(req,res)=>{
  const scope=await access(req,res);if(scope)res.json(sessions.act(req.params.id,scope,req.user,req.body||{}));
 }));
}
