exports.getChatFilesUserAndTheOtherUsername=(allChatFiles, username)=>{
  /*Esta funcion retorna una matriz de n filas y dos columnas. La primera columna contendra el nombre del archivo de chat 
  completo, mientras que la segunda contendra el otro nombre del otro usuario, con el que el usuario solicitante esta conversando,
  esto con el fin de no duplicar codigo haciendo una funcion que extraiga el nombre del otro usuario. El nombre del otro usuario
  servira para obtener su misma foto de perfil y tambien pegar a cada fila de la plantilla tal nombre*/
  let results=[];
  for (let i=0; i<allChatFiles.length; i++){
    //-4 porque '.txt' son los ultimos cuatro caracteres, y eso corresponde a la extension del archivo.
    let j=0, coincide=false, fileName=allChatFiles[i].slice(0, allChatFiles[i].length-4), contador='', theOtherUsername='';
    while (j<fileName.length && !coincide){
      if (fileName[j]!=='-'){
        contador+=fileName[j];
      } else{
        //Esta condicion verifica si el primer nombre de usuario coincide.
        contador===username? coincide=true : theOtherUsername=contador;
        contador=''
      }
      j++;
      if (j===fileName.length){
        //Esta condicion verifica si el segundo nombre de usuario coincide.
        contador===username? coincide=true : contador='';
      }
    }
    if (coincide){
      if (theOtherUsername!==''){
        results.push([allChatFiles[i], theOtherUsername]);
      } else{
        theOtherUsername=fileName.slice(j, fileName.length);
        results.push([allChatFiles[i], theOtherUsername]);
      }
    } 
  }
  return results;
}