const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../config/dbConnenction');
const randomstring = require('randomstring');
const sendMail = require('../helpers/sendMail');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

const register = (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    db.query(
        `SELECT * FROM users WHERE LOWER(email) = LOWER(${db.escape(req.body.email)});`,
        (err, result) => {
            if (err) {
                return res.status(500).json({ msg: 'Internal Server Error' });
            }

            if (result && result.length) {
                return res.status(409).json({ msg: 'This email is already in use' });
            } else {
                bcrypt.hash(req.body.password, 10, (err, hash) => {
                    if (err) {
                        return res.status(500).json({ msg: 'Internal Server Error' });
                    } else {
                        const image = req.file ? `image/${req.file.filename}` : null;
                        db.query(
                            `INSERT INTO users (name, email, password, image) VALUES (${db.escape(req.body.name)}, ${db.escape(req.body.email)}, ${db.escape(hash)}, ${db.escape(image)});`,
                            (err, result) => {
                                if (err) {
                                    return res.status(500).json({ msg: 'Internal Server Error' });
                                }

                                const mailSubject = 'Mail Verification';
                                const randomToken = randomString.generate();
                                const content = `<p>Hii ${req.body.name}, Please <a href="http://127.0.0.1:3000/mail-verification?token=${randomToken}">Verify</a> your Mail.</p>`;

                                sendMail(req.body.email, mailSubject, content);

                                db.query('UPDATE users SET token = ? WHERE email = ?', [randomToken, req.body.email], (error, result, fields) => {
                                    if (error) {
                                        return res.status(500).json({ msg: 'Internal Server Error' });
                                    }
                                });

                                return res.status(200).json({ msg: 'The user has been registered successfully' });
                            }
                        );
                    }
                });
            }
        }
    );
};

const verifyMail = (req, res) => {
    const token = req.query.token;
    db.query('SELECT * FROM users WHERE token = ? LIMIT 1', token, (error, result, fields) => {
        if (error) {
            return res.status(500).json({ msg: 'Internal Server Error' });
        }

        if (result.length > 0) {
            db.query(`UPDATE users SET token = null, is_verified = 1 WHERE id = '${result[0].id}'`, (error, updateResult, fields) => {
                if (error) {
                    return res.status(500).json({ msg: 'Internal Server Error' });
                }

                return res.render('mail-verification', { message: 'Mail verified successfully' });
            });
        } else {
            return res.render('404');
        }
    });
};

const login = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    db.query(`SELECT * FROM users WHERE email = ${db.escape(req.body.email)}`, (err, result) => {
        if (err) {
            return res.status(400).json({ msg: 'Internal Server Error' });
        }

        if (!result.length) {
            return res.status(401).json({ msg: 'Email or password is incorrect' });
        }

        bcrypt.compare(req.body.password, result[0].password, (bErr, bResult) => {
            if (bErr) {
                return res.status(400).json({ msg: 'Internal Server Error' });
            }

            if (bResult) {
                const token = jwt.sign({ id: result[0].id, is_admin: result[0].is_admin }, JWT_SECRET, { expiresIn: '2h' });
                db.query(`UPDATE users SET last_login = NOW() WHERE id = '${result[0].id}'`, (error, updateResult) => {
                    if (error) {
                        return res.status(400).json({ msg: 'Internal Server Error' });
                    }

                    return res.status(200).json({ msg: 'Logged in', token, user: result[0] });
                });
            } else {
                return res.status(401).json({ msg: 'Email or password is incorrect' });
            }
        });
    });
};

const getUser = (req, res) => {
    const authToken = req.headers.authorization.split(' ')[1];
    const decode = jwt.verify(authToken, JWT_SECRET);

    db.query('SELECT *FROM users WHERE id=?', decode.id, function(error, result,fields){
        if (error) throw error;

        return res.status(200).send({ success: true, data:result[0], message:'fetch successfully!' });
    });
};

const forgetPassword = (req, res)=> {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    var email= req.body.email;
    db.query('SELECT * FROM users WHERE email=? limit 1', email, function(error, result, fields){

        if(error){
            return res.status(400).json({ message:error });
        }

        if(result.length > 0){
        
          let mailSubject = 'Forget Password';
          const randomString = randomstring.generate();
          let content = '<p>Hii, '+result[0].name+' \
               please <a href="http://127.0.0.1:3000/reset-password?token='+randomString+'"> click here</a> to Reset your password</p>';
         
          sendMail(email, mailSubject, content);
          

          db.query(
            `DELETE FROM password_reset WHERE email = ${db.escape(result[0].email)}`
          );

          db.query(
            `INSERT INTO password_reset(email,token) VALUES(${db.escape(result[0].email)}, '${randomString}')`
          );

          return res.status(200).send({
            message:"Mail sent successfully for reset password!"
        });
        }

        return res.status(401).send({
            message:"Email doesn't exiest!"
        });
    });
}

const resetPasswordLoad = (req,res)=>{
    try {
        var token = req.query.token;
        if(token == undefined){

            res.render('404');

        }
        db.query(`SELECT *FROM password_reset where token=? limit 1`, token, function(error,result,fields){

            if(error){
                console.log(error.message);
            }
            if(result !== undefined && result.length>0){

                db.query('SELECT * FROM users where email=? limit 1', result[0].email, function(error,result,fields) {

                    if(error){
                        console.log(error.message);
                    }
                    
                    res.render('reset-password', { user: result[0] });
                });
            }
            else{
                res.render('404');
            }
        });

    } catch (error) {
        console.log(error.message);
    }
}

const resetPassword = (req, res) => {
    
    if (req.body.password !== req.body.confirm_password) {
        
        return res.render('reset-password', {
            error_message: 'Passwords do not match',
            user: {
                id: req.body.user_id,
                email: req.body.email
            }
        });
    }

   
    bcrypt.hash(req.body.password, 10, (err, hash) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        }

        db.query(`DELETE FROM password_reset WHERE email = '${req.body.email}'`);
        db.query(`UPDATE users SET password = '${hash}' WHERE id = '${req.body.user_id}'`);

        
        res.render('message', { message: 'Password reset successfully!' });
    });
};


module.exports = {
    register,
    verifyMail,
    login,
    getUser,
    forgetPassword,
    resetPassword,
    resetPasswordLoad
};
