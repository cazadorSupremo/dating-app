const express=require('express');
const router=express.Router();
const htmlFilePath=__dirname.replace('/routes', '');
const signin=require('./modules/signin.js');
const localLogin=require('./modules/passport-local-login.js');
const isLoggedIn=require('./modules/isLoggedIn.js');

const {Client}=require('pg');
const client=new Client({
  user: 'postgres',
  database: 'postgres',
  password: '2020',
  host: 'localhost',   //Todos estos parametros, si no se declaran, se establecen por defecto (ver documentacion. En caso del host, el por defecto tambien es localhost, pero lo incluyo por inercia)
});
client.connect();

router.get('/', (req, res)=>{
  if (req.isAuthenticated()){
    res.redirect('/my-profile');
  } else{
    res.sendFile(htmlFilePath+'/index.html');
  }
});
router.route('/registry')
  .get((req, res)=>{
    res.sendFile(htmlFilePath+'/registry.html');
  })
  .post((req, res)=>{
    signin.signin(req, res);
  })
router.get('/succesful-sign-up', (req, res)=>{
  res.sendFile(htmlFilePath+'/successful-sign-up.html');
});
router.get('/error:sign-up-failed', (req, res)=>{
  res.sendFile(htmlFilePath+'/error:sign-up-failed.html');
});

router.post('/login', localLogin.authenticate);

router.get('/error:incorrect-data', (req, res)=>{
  res.sendFile(htmlFilePath+'/error:incorrect-data.html');
});

router.get('/online', isLoggedIn.isLoggedIn, async (req, res)=>{
  await client.query(`UPDATE users SET online=true WHERE username='${req.user}'`);
  res.redirect('/my-profile');
});

router.get('/logout', async (req, res)=>{
  await client.query(`UPDATE users SET online=false WHERE username='${req.user}'`);
  req.logout();
  res.redirect("/");
});

module.exports=router;