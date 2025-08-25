import express from "express"
import { loginUser, registerUser } from "./user.service.js";
const route = express.Router();


route.post("/register", async (req, res) => {
    try {
        const {username, email, password, confirmPassword, role} = req.body;
        const data = await registerUser({username, email, password, confirmPassword, role})
        if(!data) {
            throw new Error("data gagal dibuat");
            
        };
        res.status(201).json({message:"berhasil", data:data})
    } catch (error) {
        console.error(error)
        res.status(500).json({message:error})
    }
});

route.post("/login", async (req, res) =>{
     try {
        const { email, password} = req.body;
        const data = await loginUser({ email, password})
        if(!data) {
            throw new Error("data gagal dibuat");
            
        };
        res.status(201).json({message:"berhasil", data:data})
    } catch (error) {
        console.error(error)
        res.status(500).json({message:error})
    }
})

export default  route;