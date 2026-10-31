export function assertFoodProductionTarget(env){
 let db;try{db=new URL(env.DATABASE_URL)}catch{throw Error('FOOD_DATABASE_TARGET_REQUIRED')}
 if(!['postgres:','postgresql:'].includes(db.protocol))throw Error('FOOD_DATABASE_TARGET_REQUIRED');
 if(env.NODE_ENV==='development'&&env.LOCAL_FOOD_WHOLESALE_TEST==='true'&&db.hostname==='127.0.0.1'&&db.pathname==='/hotfix_http_test')return 'local';
 if(env.NODE_ENV!=='production'||env.KHALASA_DEPLOYMENT_ENV==='staging')throw Error('FOOD_PRODUCTION_TARGET_REQUIRED');
 if(env.RENDER_SERVICE_ID!=='srv-d9mhlun10e5c73cbuhq0'||env.RENDER_EXTERNAL_HOSTNAME!=='khalasa-api.onrender.com')throw Error('FOOD_WRONG_RENDER_TARGET');
 let user;try{user=decodeURIComponent(db.username)}catch{throw Error('FOOD_WRONG_DATABASE_TARGET')}
 const project='uqwdmlfihyccxpcocfsh';
 const direct=db.hostname===`db.${project}.supabase.co`&&['postgres',`postgres.${project}`].includes(user);
 const pooler=/^[a-z0-9.-]+\.pooler\.supabase\.com$/.test(db.hostname)&&user===`postgres.${project}`;
 if((!direct&&!pooler)||db.pathname!=='/postgres')throw Error('FOOD_WRONG_DATABASE_TARGET');
 if(env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('FOOD_WRONG_STORAGE_TARGET');
 if(env.FOOD_WHOLESALE_ENABLED!==undefined&&!['true','false'].includes(env.FOOD_WHOLESALE_ENABLED))throw Error('FOOD_INVALID_ENABLE_FLAG');
 if(env.FOOD_WHOLESALE_FIXTURES_ENABLED!==undefined&&env.FOOD_WHOLESALE_FIXTURES_ENABLED!=='false')throw Error('TEST_GRANTS_FORBIDDEN_IN_PRODUCTION');
 return 'production';
}
