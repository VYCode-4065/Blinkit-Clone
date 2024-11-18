import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiErrors.js'
import { asynchandler } from '../utils/asynchandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import generateEmail from '../utils/Email.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import generateOTP from '../utils/forgotPassword.js';


const UserRegister = asynchandler(async (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        throw new ApiError(401, 'Name , Email and Password are required !');
    }

    const existedUser = await User.findOne({ email });

    if (existedUser) {
        throw new ApiError(402, 'Email id is registered please enter another one !')
    }

    const createdUser = await User.create({
        name: name,
        email: email,
        password: password,
    })

    const code = `${process.env.FRONTEND_URL}/${createdUser._id}`;
    console.log(code);


    if (createdUser) {
        const subject = 'Verify Email option'
        const html = `
        <p>Thank you for joining Blinkit</p>
        <p>We are here to provide you a best <br/>
        experience for choosing your desired product !</p>
        <a href="${url}">Verify Email</a>`
        generateEmail(name, email, code, subject, html)
        return res.json(new ApiResponse(200, createdUser, "User created successfully !"));
    }
})

const LoginUser = asynchandler(async (req, res) => {

    const { email, password, avatar } = req.body;
    console.log(req);


    console.log('avatar file ', avatar);


    if (!email || !password) {
        return new ApiError(401, "Email and password are required !")
    }

    const existedUser = await User.findOne({ email })

    if (!existedUser) {
        throw new ApiError(401, "You don't have account !")
    }
    if (existedUser.status != "Active") {
        throw new ApiError(402, 'Contact to Admin !')
    }

    const correctPassword = await existedUser.isCorrectPassword(password);

    if (!correctPassword) {
        throw new ApiError(402, 'Incorrect password ')
    }


    const genrefresh_token = existedUser.generateRefreshToken();
    const access_token = existedUser.generateAccessToken();
    await User.updateOne({ _id: existedUser._id }, {
        $set: {
            refresh_token: genrefresh_token,
            last_login_date: new Date().toString()
        }
    })



    const cookieOptions = {
        httpOnly: true,
        secure: true,
        samesite: "None"
    }
    res.cookie("Refresh_Token", genrefresh_token, cookieOptions);
    res.cookie("Access_Token", access_token, cookieOptions);


    return res.json(new ApiResponse(200,
        {
            existedUser, access_token, genrefresh_token
        }, "User logged-in successfully"));

})

const LogoutUser = asynchandler(async (req, res) => {

    const user = req.user

    await User.findByIdAndUpdate({ _id: user._id }, {
        $set: {
            refresh_token: ''
        }
    })
    const option = {
        httpOnly: true,
        secure: true,
    }
    res.clearCookie('Access_Token', option)
    res.clearCookie('Refresh_Token', option)


    return res.json(new ApiResponse(201, {}, "User logout successfully !"))
})

const uploadController = asynchandler(async (req, res) => {


    const avatarLocalPath = req?.file?.path;




    if (!avatarLocalPath) {
        throw new ApiError(401, "Please provide avatar to upload !")
    }
    const avatarCloudPath = await uploadOnCloudinary(avatarLocalPath);


    const updatedUser = await User.updateOne({ _id: req.user.id }, {
        avatar: avatarCloudPath?.url
    })

    if (!updatedUser) {
        throw new ApiError(401, "Unauthorized request ")
    }

    return res.json(new ApiResponse(200, updatedUser, "Avatar file uploaded successfully !"))


})

const updateUserDetailsController = asynchandler(async (req, res) => {


    console.log(req.body);

    const userId = req.user.id;

    if (!userId) {
        throw new ApiError(400, "Please login to change details !")
    }

    const { name, email, password, mobile } = req.body;

    if (!name && !email && !password && !mobile) {
        throw new ApiError(400, "Please provide any details to update !")
    }

    const user = await User.findById(userId)

    if (!user) {
        throw new ApiError(402, "User not exists !")
    }


    const updatedUser = await User.updateOne({ _id: userId }, {
        ...{ name } && { name: name },
        ...{ email } && { email: email },
        ...{ password } && { password: password },
        ...{ mobile } && { mobile: mobile },
    })

    return res.
        status(200).
        json(new ApiResponse(200, updatedUser, "User details updated successfully !"))
})

const forgotPasswordController = asynchandler(async (req, res) => {

    const { email } = req.body;

    if (!email) {

        throw new ApiError(400, "Provide a valid email id to reset your password !")
    }

    const existedUser = await User.findOne({ email: email });

    if (!existedUser) {
        throw new ApiError(400, "Email does not exists !")
    }

    const otp = generateOTP();

    const forgotPasswordExipry = Date.now() + 60 * 60 * 1000;

    //send otp with email

    const subject = 'Verify OTP to forgot your password ';

    const html = ` 
    
    
    <div style="text-align: center; font-weight: 600;">

        <h4 style="color: rgb(0, 17, 255);  font-size: 16px;">Hey Vishal</h4>
        <p>You are requested to reset your password </p>
        <p>Enter the OTP provided below :</p>
        <span
            style="background-color: yellow;color: blue; font-size: 32px;font-weight: 700; padding: 0 20px;">${otp}</span>
        <br>
        <br>
        <p style="font-weight: 700;">Note : This OTP is valid only for 1 hour</p>
        <br><br><br>
        <p style="font-size: 1.2rem; text-align:left; padding-left: 20%; font-weight: 700;">Regards, Blinkit ❤️</p>
    </div>

    `
    generateEmail(existedUser.name, email, '', subject, html)

    const updatedUser = await User.findByIdAndUpdate(existedUser._id, {
        forgot_password_otp: otp,
        forgot_password_expiry: forgotPasswordExipry
    })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Forgot password initiated successfully !"))
})

const verifyForgotPassword = asynchandler(async (req, res) => {

    const { email, otp } = req.body;

    if (!email || !otp) {

        throw new ApiError(400, "Provide a valid email id or otp to reset password !")
    }

    const existedUser = await User.findOne({ email: email });

    if (!existedUser) {
        throw new ApiError(400, "Email does not exists !")
    }

    const currentTime = Date.now()

    if (existedUser.forgot_password_expiry < currentTime) {
        throw new ApiError(401, "Your OTP was expired generate new OTP ")
    }

    const dbOtp = existedUser.forgot_password_otp;
    if (otp != dbOtp) {
        throw new ApiError(402, "You have entered an invalid otp ")
    }


    return res
        .status(200)
        .json(new ApiResponse(200, {}, "OTP verified successfully !"))
})

const resetPasswordController = asynchandler(async (req, res) => {

    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword
    ) {
        throw new ApiError(400, "Provide all required fields ")
    }

    const existedUser = await User.findOne({ email });

    if (!existedUser) {
        throw new ApiError(400, "Email Id is not valid ")
    }

    if (newPassword !== confirmPassword) {
        throw new ApiError(401, "New password and Confirm password fileds should be same !")
    }


    let updatedUser = await User.findOne({ _id: existedUser._id }
    )

    updatedUser.password = newPassword
    updatedUser.forgot_password_otp = ''
    updatedUser.forgot_password_expiry = ''
    updatedUser = await updatedUser.save()

    const html =
        `<div style="text-align: center; font-weight: 600;">

        <p>Your password is changed successfully !</p>
        <br>
        <p style="font-size: 1.2rem; text-align:left; padding-left: 20%; font-weight: 700;">Regards, Blinkit ❤️</p>
    </div>`
    generateEmail(existedUser.name, email, '', "Password reset successfully !", html);

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Password reset successfully "))
})
export {
    UserRegister,
    LoginUser,
    LogoutUser,
    uploadController,
    updateUserDetailsController,
    forgotPasswordController,
    verifyForgotPassword,
    resetPasswordController
};