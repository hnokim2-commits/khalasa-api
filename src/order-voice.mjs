import {localVoiceEnabled,registerLocalVoice} from './local-voice-signaling.mjs';
export function voiceServiceState(env=process.env){
 const urls=String(env.VOICE_TURN_URLS||'').split(',').map(value=>value.trim()).filter(Boolean);
 const valid=urls.length>0&&urls.every(value=>/^turns?:[a-z0-9.-]+(?::\d{1,5})?(?:\?transport=(?:tcp|udp))?$/i.test(value));
 const configured=valid&&String(env.VOICE_TURN_SECRET||'').length>=32;
 // Keep off until signaling, client lifecycle and end-to-end testing are implemented.
 return {available:false,turnConfigured:configured,reason:configured?'VOICE_IMPLEMENTATION_PENDING':'VOICE_TURN_NOT_CONFIGURED'};
}
export function registerOrderVoice(app,{pool,auth,asyncRoute,env=process.env}){
 registerLocalVoice(app,{pool,auth,asyncRoute,env});
 app.get('/v1/orders/:id/voice/status',auth('customer','rider'),asyncRoute(async(req,res)=>{
  if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(req.params.id||'')))return res.status(400).json({error:'INVALID_ORDER_ID'});
  const access=await pool.query(`SELECT o.id FROM orders o JOIN riders r ON r.id=o.rider_id
    WHERE o.id=$1 AND o.status IN ('assigned','picked_up')
    AND (($3::text='customer' AND o.customer_id=$2) OR ($3::text='rider' AND r.user_id=$2))`,[req.params.id,req.user.sub,req.user.role]);
  res.set('Cache-Control','no-store');
  if(!access.rowCount)return res.status(404).json({error:'ACTIVE_ORDER_CALL_NOT_FOUND'});
  const local=localVoiceEnabled(env);
  res.json({...voiceServiceState(env),localExperimental:local,privacy:{phoneNumbersExposed:false,recordingEnabled:false,relayRequired:!local,localNetworkAddressesMayBeShared:local}});
 }));
}
