import jwt from "jsonwebtoken"

export const verifyToken= async(req, res, next) =>{
    const bearerHeader = req.headers["authorization"];

    if(typeof bearerHeader !== "undefined"){
        const token = bearerHeader.split('')[1];

        jwt.verify(token, process.env.JWT_TOKEN, ((err, decode) => {
            if(err){
                throw new Error("invalid token");
            }else{
                req.user = decode;
                next();
            }
        }));


    }else{
        res.status(401).json({message:"token not match"})
    }
}

export const verifyAdmin = async(req, res, next) => {
    if(req.user.role !== "admin"){
        throw new Error("hanya admin yang bisa mengakses");
        
    }
    next()
}