# majorandminor
Dating web app for young men and older women.

Before executing, you need to create two directories inside the main directory:
-The first one will be called "chats" and within this directory, you will create another one called "new-messages".
-The second will be called "users-photos".

Then, you will need to install postgresql, and create the respective database with the respective table. In the "technical details" folder, you will see a text file called "database creation.txt".
Paste that in the postgre console and you will have the table ready.
A warning, I have not yet modified the environment variables so that you can use a configuration file and execute the connection to the database with those variables. 
So you will have to manually change all environment variables in all modules that make use of postgresql, for now. However, as long as I have not modified the application to include configuration files for the database, you can simply change the password of the postgres user from psql to "2020" and create the "users" table in the postgres database belonging to it to the postgres user.

Once done, install all the dependencies with "npm install" (I assume you have node installed).

Then run in the console "node app.js" or "npm start" if you want to do it with nodemon, and you go in your browser to "localhost: 8080"
That's all.

Antes de ejecutar, necesitas crear dos directorio dentro del directorio principal:
-El primero, se llamara "chats" y dentro de este directorio, crearas otro llamado "new-messages".
-El segundo, se llamara "users-photos".

Luego, necesitaras instalar postgresql, y crear la respectiva base de datos con la respectiva tabla. En la carpeta "detalles tecnicos", podras ver un archivo de texto llamado "creacion de base de datos.txt".
Pega eso en la consola de postgre y tendras lista la tabla.
Una advertencia, todavia no he modificado las variables de entorno para que puedas usar un archivo de configuracion y ejecutar la conexion a la base de datos con esas variables.
Asi que tendras que cambiar manualmente todos los variables de entorno en todos los modulos que hagan uso de postgresql, por ahora. Sin enmbargo, mientras que yo no haya modificado la aplicacion para incluir archivos de configuracion para la base de datos, puedes simplemente cambiar la contraseña del usuario postgres de psql a "2020" y crear la tabla "users" en la base de datos postgres perteneciente al usuario postgres.

Una vez hecho esto, instala toda las dependencias con "npm install" (asumo que tienes node instalado).

Luego ejecuta en la consoloa "node app.js" o "npm start" si lo quieres hacer con nodemon, y te diriges en tu navegador a "localhost:8080"
Eso es todo.
