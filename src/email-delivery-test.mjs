// Recipient must be explicitly allowlisted by the operator; never supplied in a request.
export function registerEmailDeliveryTest({app,auth,asyncRoute,limiter,ownerPhone,env=process.env,send=fetch}){
 app.post('/v1/admin/monitoring/email-delivery-test',auth('admin'),limiter,asyncRoute(async(req,res)=>{
  if(req.user.role!=='admin'||!ownerPhone||req.user.phone!==ownerPhone)return res.status(403).json({error:'OWNER_ONLY'});
  const recipient=String(env.EMAIL_DELIVERY_TEST_TO||'').trim().toLowerCase();
  if(!recipient||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)||env.OTP_PROVIDER!=='resend_email'||!env.RESEND_API_KEY||!env.OTP_EMAIL_FROM)return res.status(503).json({error:'EMAIL_TEST_NOT_CONFIGURED'});
  try{
   const result=await send('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'content-type':'application/json',Authorization:`Bearer ${env.RESEND_API_KEY}`},body:JSON.stringify({from:env.OTP_EMAIL_FROM,to:[recipient],subject:'خالصة — اختبار وصول البريد',text:'هذه رسالة اختبار لخدمة البريد في خالصة. ليست رمز دخول ولا تغيّر أي حساب. لا يلزم الرد عليها.'})});
   if(!result.ok)return res.status(502).json({error:'EMAIL_TEST_PROVIDER_REJECTED'});
   return res.status(202).json({providerAccepted:true,inboxDeliveryConfirmed:false});
  }catch(_){return res.status(502).json({error:'EMAIL_TEST_DELIVERY_UNCONFIRMED'});}
 }));
}
