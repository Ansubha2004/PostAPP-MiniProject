const jwt=require('jsonwebtoken');

const isLoggedIn=(req,res,next)=>{
    const token=req.cookies.Token;
    if(token===""){
        return res.status(401).redirect("/login");
    }
    else
    {
        let data=jwt.verify(token,"ansubha ka secret key");
        req.user=data;
    }
    next();
}

module.exports=isLoggedIn;