const session=require('express-session');
const passport=require('passport');
const LocalStrategy=require('passport-local').Strategy;
const {Client}=require('pg');
const client=new Client({
  user: 'postgres',
  database: 'postgres',
  password: '2020',
  host: 'localhost',   //Todos estos parametros, si no se declaran, se establecen por defecto (ver documentacion. En caso del host, el por defecto tambien es localhost, pero lo incluyo por inercia)
});
client.connect();
const bcrypt=require('bcrypt');
passport.use('local-login', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
  }, async (username, password, done)=>{
     try{
       let consultaDeContraseña=await client.query(`SELECT password FROM users WHERE email='${username}'`);
       if (consultaDeContraseña.rows.length===1){
         bcrypt.compare(password, consultaDeContraseña.rows[0].password, async (err, result)=>{
           if (err) throw err;
           if (result){
             //Consulto el nombre de usuario para enviar el id con el objetivo de serializar. El username sera el req.user
             let consultaDeUsername=await client.query(`SELECT username FROM users WHERE email='${username}'`);
             let newUser={id: consultaDeUsername.rows[0].username};
             return done(null, newUser);
           }
           return done(null, false, {message: 'Usuario o contraseña incorrecta!'});
         });
       } else{
         return done(null, false, {message: 'Usuario o contraseña incorrecta!'});
       }
     } catch(err){
       console.log('Error en el inicio de sesion del usuario.');
       return done(err);
     }
}));

passport.serializeUser((user, done)=>{
  return done(null, user.id);
});
passport.deserializeUser(async (id, done)=>{
  try{
    let consultaIdDeUsuario=await client.query(`SELECT * FROM users WHERE username='${id}'`);
    if (consultaIdDeUsuario.rows.length===1){
      return done(false, id); //Si esta el usuario, por lo que error valdra false
    } else{
      return done(true, id);
    }
  } catch(err){
    console.log('Error en la desearilizacion del usuario.');
    return done(err, id);
  }
});

exports.authenticate=passport.authenticate('local-login', {
  successRedirect: '/online',
  failureRedirect: '/error:incorrect-data',
});