const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
require('dotenv').config();

const sendmail = async (email,subject,text) => {

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,            // or 587
        secure: true,         // true for port 465, false for port 587
        auth: {
          user: process.env.MAIL, // generated ethereal user
          pass: process.env.PASSWORD, // generated ethereal password
        }
      });
      
    
    const mailOptions = {
        from: process.env.MAIL,
        to: email ,
        subject: subject,
        text: text
    }

    await transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

}

module.exports = sendmail;