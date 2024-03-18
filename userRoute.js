const express = require('express');

const router = express.Router();

const path = require('path');
const multer = require('multer');

const storage= multer.diskStorage({
    destination:function(req, file, cb){
      cb(null, path.join(__dirname,'../public/images'));
    },
    filename:function(req, file, cb){
        const name = Date.now()+'-'+file.originalname;
        cb(null,name);
    }
});

const filefilter = (req, file, cb)=>{
    (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png')?cb(null,true):cb(null,false);
}

const upload = multer({ 
    storage:storage,
    fileFilter:filefilter
});

const { signUpValidtaion,loginValidation, forgetValidation } = require('../helpers/validation'); // Corrected the typo here

const userController = require('../controllers/userController');

const auth = require('../middleware/auth');

router.post('/register',upload.single('image'), signUpValidtaion, userController.register);
router.post('/login',loginValidation, userController.login);

router.get('/get-user',auth.isAuthorize, userController.getUser);
router.post('/forget-password', forgetValidation, userController.forgetPassword);

module.exports = router;