const {Client}=require('pg');
const client=new Client({
  user: 'postgres',
  database: 'postgres',
  password: '2020',
  host: 'localhost',   //Todos estos parametros, si no se declaran, se establecen por defecto (ver documentacion. En caso del host, el por defecto tambien es localhost, pero lo incluyo por inercia)
});
client.connect();
const fs=require('fs').promises;
const bcrypt=require('bcrypt');
exports.deleteAccount=async (req, res)=>{
  try{
    let truePassword=await client.query(`SELECT password FROM users where username='${req.user}'`);
    bcrypt.compare(req.body.password, truePassword.rows[0].password, async (err, result)=>{
      if (err){
        res.json({message: 'Error'});
      } else if (result){
        let message;
        let borrado=await client.query(`DELETE FROM users WHERE username='${req.user}'`);
        if (borrado.rowCount===1){
          message={message: 'Successful operation'};
          let userPhotos=await fs.readdir(`users-photos/${req.user}`);
          if (userPhotos.length>0){
            for (let i=0; i<userPhotos.length; i++){
              await fs.unlink(`users-photos/${req.user}/${userPhotos[i]}`);
            }
          }
        } else if (borrado.rowCount===0){
          message={message: 'Error'};
        }
        res.json(message);
      } else{
        res.json({message: 'Error'});
      }
    });
  } catch(err){
    res.json({message: 'Error'});
  }
}