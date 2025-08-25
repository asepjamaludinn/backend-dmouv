import prisma from "../config/db/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

export const registerUser= async ({username, email, password, confirmPassword, role}) =>{
    const hashedPassword = await bcrypt.hash(password, 10);
    if(!["user", "admin"].includes(role)){
        throw new Error("role dibutuhkan");
        
    }

    if(password !== confirmPassword){
        throw new Error("Invalid password");
        
    };
    
    const data = await prisma.user.create({
        data:{
            username,
            email,
            password:hashedPassword,
            role
        }
    });
    return data
};

export const findUserByEmail = async (email) => {
    const user = await prisma.user.findUnique({
        where: {email: email},
    });
    return user;
}

export const loginUser = async({email, password}) => {
    const user = await findUserByEmail(email);
    if(!user){
        throw new Error("error admin tidak ditemukan");
        
    }
    const comparePassword = await bcrypt.compare(password, user.password);
    if(!comparePassword){
        throw new Error("password salah");
    };
    const payload = {
        id:user.id,
        email:user.role,
        role:user.role
    }
    const token = jwt.sign(payload, process.env.JWT_TOKEN, {expiresIn:'1h'});
    console.log("token: ", token, process.env.JWT_TOKEN);
    return ({message:"berhasil login", token})
}
   
