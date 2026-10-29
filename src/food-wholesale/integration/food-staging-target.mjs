// No credentials are returned, logged or included in errors.
const project='dfusnyqogllhezfvmwqh';
export function assertFoodTarget(env){
 let db;try{db=new URL(env.DATABASE_URL)}catch{throw Error('FOOD_TARGET_DATABASE_REQUIRED')}
 if(!['postgres:','postgresql:'].includes(db.protocol))throw Error('FOOD_TARGET_DATABASE_REQUIRED');
 const local=env.NODE_ENV==='development'&&env.LOCAL_FOOD_WHOLESALE_TEST==='true'&&db.hostname==='127.0.0.1'&&db.pathname==='/hotfix_http_test';
 if(local)return 'local';
 if(env.KHALASA_DEPLOYMENT_ENV!=='staging'||env.NODE_ENV!=='production')throw Error('FOOD_STAGING_ONLY');
 if(env.RENDER_SERVICE_ID!=='srv-dbaascrrjlhs739iql6g'||env.RENDER_EXTERNAL_HOSTNAME!=='khalasa-api-staging.onrender.com')throw Error('FOOD_WRONG_RENDER_TARGET');
 let user;try{user=decodeURIComponent(db.username)}catch{throw Error('FOOD_WRONG_DATABASE_TARGET')}
 const direct=db.hostname===`db.${project}.supabase.co`&&['postgres',`postgres.${project}`].includes(user);
 const pooler=/^[a-z0-9.-]+\.pooler\.supabase\.com$/.test(db.hostname)&&user===`postgres.${project}`;
 if((!direct&&!pooler)||db.pathname!=='/postgres')throw Error('FOOD_WRONG_DATABASE_TARGET');
 if(env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('FOOD_WRONG_STORAGE_TARGET');
 if(env.FOOD_WHOLESALE_ENABLED!==undefined&&!['true','false'].includes(env.FOOD_WHOLESALE_ENABLED))throw Error('FOOD_INVALID_ENABLE_FLAG');
 return 'staging';
}
