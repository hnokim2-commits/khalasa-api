import crypto from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';

export function createLocalDocumentStorage({root,secret,origin,now=()=>Date.now()}){
  const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
  const sign=value=>crypto.createHmac('sha256',secret).update(value).digest('hex');
  return {
    async put(key,file){
      if(!['image/png','image/jpeg','application/pdf'].includes(file.mimeType)||file.buffer.length>4194304)throw new Error('INVALID_DOCUMENT');
      await mkdir(root,{recursive:true,mode:0o700});
      const target=join(root,digest(key)+'.json'),temporary=target+'.'+crypto.randomUUID()+'.tmp';
      await writeFile(temporary,JSON.stringify({mime:file.mimeType,data:file.buffer.toString('base64')}),{mode:0o600});
      await rename(temporary,target);
    },
    url(key){const payload=Buffer.from(JSON.stringify({key,expires:now()+300000})).toString('base64url');return `${origin}/v1/local-private-documents/${payload}.${sign(payload)}`;},
    async read(token){
      if(typeof token!=='string'||token.length>4096)throw new Error('INVALID_LINK');
      const [payload,signature,...rest]=token.split('.');
      if(rest.length||!signature||!/^[a-f0-9]{64}$/.test(signature)||!crypto.timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(sign(payload),'hex')))throw new Error('INVALID_LINK');
      const parsed=JSON.parse(Buffer.from(payload,'base64url').toString());
      if(typeof parsed.key!=='string'||!Number.isFinite(parsed.expires)||parsed.expires<=now()||parsed.expires>now()+300000)throw new Error('INVALID_LINK');
      const stored=JSON.parse(await readFile(join(root,digest(parsed.key)+'.json'),'utf8'));
      return {mime:stored.mime,buffer:Buffer.from(stored.data,'base64')};
    }
  };
}
