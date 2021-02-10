const fs=require('fs').promises;
exports.readChatFile=async (usernameA, usernameB, templateOrWriteMessage)=>{
  let content;
  try{
    content=await fs.readFile(`chats/${usernameA+'-'+usernameB}.txt`, 'utf8');
    if (templateOrWriteMessage){
      return content;
    }
    return usernameA+'-'+usernameB;
  } catch(err){
    try{
      content=await fs.readFile(`chats/${usernameB+'-'+usernameA}.txt`, 'utf8');
      if (templateOrWriteMessage){
        return content;
      }
      return usernameB+'-'+usernameA;
    } catch(err){
      return 'X';
     }
   }
}