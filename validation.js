const {check} = require('express-validator');

exports.signUpValidtaion = [
    check('name','Name is required').not().isEmpty(),
    check('email','plz enter a valid email').isEmail().normalizeEmail({ gmail_remove_dots:true }),
    check('password','passwors is required').isLength({ min:6 }),
    check('image').custom( (value, {req}) =>{
        if(req.file.mimetype == 'image/jpeg' || req.file.mimetype == 'image/png'){
            return true;
        }
        else{
            return false;
        }

    }).withMessage('please upload an image type PNG, JPG')
]

exports.loginValidation = [
    
    check('email','plz enter a valid email').isEmail().normalizeEmail({ gmail_remove_dots:true }),
    check('password','passwors minimum 6 digit').isLength({ min:6 })

]

exports.forgetValidation = [
    
    check('email','plz enter a valid email').isEmail().normalizeEmail({ gmail_remove_dots:true })
    

]