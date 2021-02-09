const fs=require('fs').promises;
let htmlFilePath=__dirname.replace('/routes', ''); htmlFilePath=htmlFilePath.replace('/modules', '');
module.exports.profilePhotos=async (userID)=>{
  try{
  	//Verifico que existe el usuario consultando su directorio.
    await fs.opendir(`users-photos/${userID}`);
    //Cuento la cantidad de fotos que tiene el usuario en su directorio, y se retorna un array con las respectivas.
    let fotos=await fs.readdir(`users-photos/${userID}`);
    //Ahora combino las fotos con la plantilla html.
    let plantilla=await fs.readFile(htmlFilePath+'/photos.html', 'utf8');
    let fotoshtml='', fila='<tr>'; //La fila solo contendra 3 elementos(fotos). Cada vez que una fila se llena, se añade al relleno de la tabla y se crea otra nueva.
    let contadorDeFotos=1;
    let contenidoDeTabla='';
    for (let i=0; i<fotos.length; i++){
      if (i===fotos.length-1){
        fotoshtml+=`<td><div><img src="/${userID}/${fotos[i]}" id="${'photo'+i.toString()}">
        <div class="dropdown"><button class="btn btn-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
        ...</button>
        <ul class="dropdown-menu" id="${i.toString()}">
        <li><button class="dropdown-item">Seleccionar como foto de perfil</button></li>
        <li><button class="dropdown-item">Eliminar foto</button></li>
        </ul></div></div></td>`;
        fila+=fotoshtml+'</tr>';
        contenidoDeTabla+=fila;
      } else{
          if (contadorDeFotos===3){
            fotoshtml+=`<td><div><img src="/${userID}/${fotos[i]}" id="${'photo'+i.toString()}">
            <div class="dropdown"><button class="btn btn-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
            ...</button>
            <ul class="dropdown-menu" id="${i.toString()}">
            <li><button class="dropdown-item">Seleccionar como foto de perfil</button></li>
            <li><button class="dropdown-item">Eliminar foto</button></li>
            </ul></div></div></td>`;
            fila+=fotoshtml+'</tr>';
            contenidoDeTabla+=fila;
            fotoshtml='';
            fila='<tr>';
            contadorDeFotos=1;
          } else{
            fotoshtml+=`<td><div><img src="/${userID}/${fotos[i]}" id="${'photo'+i.toString()}">
            <div class="dropdown"><button class="btn btn-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
            ...</button>
            <ul class="dropdown-menu" id="${i.toString()}">
            <li><button class="dropdown-item">Seleccionar como foto de perfil</button></li>
            <li><button class="dropdown-item">Eliminar foto</button></li>
            </ul></div></div></td>`;
            contadorDeFotos++;
          }
      }
    }
    plantilla=plantilla.replace('<!--Fotos-->', contenidoDeTabla);
    return plantilla;
  } catch(err){
  	//throw err;
  	/*Si hay un error, entonces probablemente el subdirectorio no exista y se tenga que crear el subdirectorio del usuario.
    Tengo mis dudas respecto a que solo puede ser que no exista, asi que probablemente tenga que usar otro bloque try-catch.
    Creo el directorio vuelvo a redirigir al usuario para que al menos vea su vista de fotos vacia (recursion).*/
  	await fs.mkdir(`users-photos/${userID}`);
  	return '';
  }
}