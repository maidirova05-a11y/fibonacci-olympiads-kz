/* Consultation request → Bitrix24.
   Creates a contact and a deal in the ATLANTIA-FIMO pipeline (воронка, id 21);
   BITRIX_DEAL_CATEGORY_ID overrides the pipeline, and "lead" there creates a lead instead.
   The Bitrix incoming webhook is a secret (it gives write access to the CRM),
   so it lives only in Vercel env vars, never in the page:
     BITRIX_WEBHOOK_URL        https://<portal>.bitrix24.kz/rest/<user>/<code>/  (required)
     BITRIX_DEAL_CATEGORY_ID   deal pipeline id, from …/crm/deal/kanban/category/<id>/ (optional, default 21)
     BITRIX_DEAL_STAGE_ID      deal stage, e.g. C5:NEW; default is the pipeline's first stage (optional)
     BITRIX_STATUS_ID          lead stage, e.g. NEW, when creating leads             (optional)
     BITRIX_SOURCE_ID          source, e.g. WEB                                      (optional)
     BITRIX_ASSIGNED_BY_ID     responsible user id                                   (optional) */
const ALLOWED_ORIGIN=/^https:\/\/((www\.)?fibonacci-olympiads\.kz|[a-z0-9-]+\.vercel\.app)$|^http:\/\/localhost(:\d+)?$/;
const DEAL_CATEGORY_ID='21'; // ATLANTIA-FIMO
const UTM=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];

const clean=(v,max)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);

function webhookBase(){
  const raw=(process.env.BITRIX_WEBHOOK_URL||'').trim();
  if(!/^https:\/\/[^/]+\/rest\/\d+\/[^/]+/.test(raw))return null;
  // accept the URL with or without a method on the end (…/profile.json, …/crm.lead.add)
  return raw.match(/^https:\/\/[^/]+\/rest\/\d+\/[^/]+\//)?.[0]||raw+'/';
}

module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false})}
  const origin=req.headers.origin;
  if(origin&&!ALLOWED_ORIGIN.test(origin))return res.status(403).json({ok:false});

  let b=req.body;
  if(typeof b==='string'){try{b=JSON.parse(b)}catch(e){b=null}}
  if(!b||typeof b!=='object')return res.status(400).json({ok:false,error:'bad_request'});
  // honeypot: real visitors never see this field
  if(b.website)return res.status(200).json({ok:true});

  const name=clean(b.name,100);
  const phone=clean(b.phone,32);
  const digits=phone.replace(/\D/g,'');
  const question=clean(b.question,1000);
  if(!name)return res.status(400).json({ok:false,error:'name'});
  if(digits.length<10||digits.length>15)return res.status(400).json({ok:false,error:'phone'});

  const base=webhookBase();
  if(!base){console.error('BITRIX_WEBHOOK_URL is not set');return res.status(500).json({ok:false,error:'config'})}

  const lang=['ru','kk','en'].includes(b.lang)?b.lang:'ru';
  const page=clean(b.page,500);
  const env=process.env;
  const common={
    COMMENTS:[question&&'Вопрос: '+question,'Язык сайта: '+lang,page&&'Страница: '+page].filter(Boolean).join('\n'),
    SOURCE_DESCRIPTION:'Сайт fibonacci-olympiads.kz — кнопка «Получить консультацию»'
  };
  if(env.BITRIX_SOURCE_ID)common.SOURCE_ID=env.BITRIX_SOURCE_ID;
  if(env.BITRIX_ASSIGNED_BY_ID)common.ASSIGNED_BY_ID=env.BITRIX_ASSIGNED_BY_ID;
  for(const k of UTM){const v=clean(b[k],200);if(v)common[k.toUpperCase()]=v}
  const title='FIMO: консультация — '+name;
  const contact={NAME:name,PHONE:[{VALUE:phone,VALUE_TYPE:'WORK'}]};

  const call=async(method,fields)=>{
    const r=await fetch(base+method+'.json',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({fields,params:{REGISTER_SONET_EVENT:'Y'}}),
      signal:AbortSignal.timeout(10000)
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok||!data.result)throw new Error(`${method}: ${r.status} ${data.error||''} ${data.error_description||''}`);
    return data.result;
  };

  try{
    const cat=(env.BITRIX_DEAL_CATEGORY_ID||DEAL_CATEGORY_ID).trim();
    if(cat!=='lead'){
      const contactId=await call('crm.contact.add',{...contact,SOURCE_ID:common.SOURCE_ID,ASSIGNED_BY_ID:common.ASSIGNED_BY_ID});
      const deal={...common,TITLE:title,CATEGORY_ID:cat,CONTACT_ID:contactId};
      if(env.BITRIX_DEAL_STAGE_ID)deal.STAGE_ID=env.BITRIX_DEAL_STAGE_ID;
      await call('crm.deal.add',deal);
    }else{
      const lead={...common,...contact,TITLE:title};
      if(env.BITRIX_STATUS_ID)lead.STATUS_ID=env.BITRIX_STATUS_ID;
      await call('crm.lead.add',lead);
    }
    return res.status(200).json({ok:true});
  }catch(e){
    console.error('Bitrix error',e.message);
    return res.status(502).json({ok:false,error:'crm'});
  }
};
