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
module.exports.signin=async (req, res)=>{
  if (req.body.sex==='man'){
    req.body.sex=1;
  } else {
  	req.body.sex=0;
  }
  try{
  	//Compruebo si ya esta ese correo o nombre de usuario registrado.
  	let comprobacionDeEmail=await client.query(`SELECT EXISTS(SELECT * FROM users WHERE email='${req.body.email}')`);
  	let comprobacionDeUsername=await client.query(`SELECT EXISTS (SELECT * FROM users WHERE username='${req.body.username}')`);
  	if (!comprobacionDeEmail.rows[0].exists && !comprobacionDeUsername.rows[0].exists){
      bcrypt.genSalt(saltRounds, (err, salt)=>{
        if (err) throw err;
        bcrypt.hash(req.body.password, salt, async (err, hash)=>{
          if (err) throw err;
          //Hasheo y agrego salt a la contraseña para almacenarla en la base de datos.
          let hashedPassword=hash;
          //Luego inserto la contraseña hasheada junto al resto de los datos a la base de datos para crear al nuevo usuario.
          let registroDeNuevoUsuario=`INSERT INTO users (email, password, username, name, lastName, sex, age, country) values('${req.body.email}', '${hashedPassword}', 
            '${req.body.username}', '${req.body.name}', '${req.body.lastName}', '${req.body.sex}', '${req.body.age}', '${req.body.country}')`;
          await client.query(registroDeNuevoUsuario);
          console.log('Nuevo usuario registrado');
          res.redirect('/succesful-sign-up');
        });
      });
  	} else{
  	  res.redirect('/error:sign-up-failed');
  	}
  } catch(err){
    console.log(err);
    res.redirect('/error:sign-up-failed');
  }
}