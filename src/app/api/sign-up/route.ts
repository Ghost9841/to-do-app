import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/lib/sendVerificationEmails";

export async function POST(request: Request) {
  await dbConnect();
  try { 
    const {username, email, password} = await request.json();
    const existingUserVerifiedByUsername = await UserModel.findOne({
      username,
      isVerified: true
    })
    if (existingUserVerifiedByUsername) {
      return Response.json({
        success: false,
        message: "Username already taken"
      },
      {
        status: 400
      })
    }
    const existingUserVerifiedByEmail = await UserModel.findOne({
      email,
      isVerified: true
    })
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString()
    if (existingUserVerifiedByEmail) {
      if (existingUserVerifiedByEmail.isVerified) {
        return Response.json({
          success: false,
          message: "Email already registered"
        },
        {
          status: 400
        })
      }else{
       const hashedPassword = await bcrypt.hash(password, 10);
       existingUserVerifiedByEmail.password = hashedPassword;
       existingUserVerifiedByEmail.verifyCode = verifyCode;
       existingUserVerifiedByEmail.verifyCodeExpiry = new Date(Date.now() + 3600000)
       await existingUserVerifiedByEmail.save()
      }
      return Response.json({
        success: false,
        message: "Email already registered"
      },
      {
        status: 400
      })
    }else{
      const hashedPassword = await bcrypt.hash(password, 10);
      const expiryDate = new Date()
      expiryDate.setHours(expiryDate.getHours() + 1)

     const newUser = await new UserModel({
        username,
        email,
        password: hashedPassword,
        verifyCode,
        verifyCodeExpiry: expiryDate,
        isVerified: false,
        isAcceptingMessage: true,
        messages: []
      })
      await newUser.save()
    }
    //send verification code to email
   const emailResponse = await sendVerificationEmail(
    email, 
    verifyCode,
    username)
    if(!emailResponse.success){
      return Response.json({
        success: false,
        message: emailResponse.message
      },
      {
        status: 500
      })
    }
    return Response.json({
      success: true,
      message: "User registered successfully. Please check your email for verification."
    },{
      status: 200
    })
  }catch(error){
    console.error('Error registering user',error)
    return Response.json({
        success: false,
        message: "Error registering user"
    },
  {
    status: 500
  })
  }
}