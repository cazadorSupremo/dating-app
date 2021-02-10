const {Client}=require('pg');
const client=new Client({
  user: 'postgres',
  database: 'postgres',
  password: '2020',
  host: 'localhost',   //Todos estos parametros, si no se declaran, se establecen por defecto (ver documentacion. En caso del host, el por defecto tambien es localhost, pero lo incluyo por inercia)
});
client.connect();
const bcrypt=require('bcrypt');
const saltRounds=10;
exports.changePassword=(req, res)=>{ 
  try{
  	bcrypt.genSalt(saltRounds, (err, salt)=>{
  	  if (err){
  	  	return res.json({message: 'Error'});
  	  } 
      bcrypt.hash(req.body.password, salt, async (err, hash)=>{
        if (err){
          return res.json({message: 'Error'});
        }
        await client.query(`UPDATE users SET password='${hash}' WHERE username='${req.user}'`);
        res.json({message: 'Successful operation'});
      });
    });
  } catch(err){
  	res.json({message: 'Error'});
  }
}