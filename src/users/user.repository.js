import prisma from "../config/db";

const allUser = async () =>{
    const data = await prisma.user.findMany();
    return data;
}


module.exports = allUser;