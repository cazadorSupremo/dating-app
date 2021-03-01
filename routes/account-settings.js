const express=require('express');
const router=express();
const htmlFilePath=__dirname.replace('/routes', '');
const logged=require('./modules/isLoggedIn.js');
const delete_account=require('./modules/delete-account.js');
const change_password=require('./modules/change-password.js');

router.get('/', logged.isLoggedIn, (req, res)=>{
  res.sendFile(htmlFilePath+'/account-settings.html');
});

router.delete('/delete-account', logged.isLoggedIn, delete_account.deleteAccount);

router.put('/change-password', logged.isLoggedIn, change_password.changePassword);

module.exports=router;