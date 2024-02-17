import { asyncHandler } from "../utls/asyncHandler.js";
import { ApiError } from "../utls/apiError.js";
import { ApiResponse } from "../utls/apiResponse.js";
import {
  deleteFileFromCloudinary,
  uplodeOnCloudinary,
} from "../utls/cloudinary.js";
import { User } from "../models/user.model.js";
import Jwt from "jsonwebtoken";
import { cookieOptions } from "../constants.js";
import mongoose from "mongoose";
import { Blog } from "../models/blog.model.js";

const genrateAccessTokenAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.genrateAccessToken();
    const refreshToken = await user.genrateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw ApiError(
      500,
      "Something went wrong while genrating access token and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, fullName, email, password } = req.body;

  if (
    [username, fullName, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "User fields are required");
  }

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });

  if (existedUser) {
    throw new ApiError(409, "User is already exists");
  }

  const avatarLocalPath = req.files?.avatar[0].path;
  let coverImageLocalPath;

  if (req.files && req.files?.coverImage && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uplodeOnCloudinary(avatarLocalPath);
  let coverImage;

  if (coverImageLocalPath) {
    coverImage = await uplodeOnCloudinary(coverImageLocalPath);
  }

  if (!avatar) {
    throw new ApiError(500, "Uploading avatar failed. Please try again.");
  }

  const createdUser = await User.create({
    fullName,
    email,
    username,
    password,
    avatar: avatar.url,
    coverImage: coverImage ? coverImage.url : "",
  });

  const user = await User.findById(createdUser._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(500, "Somting went wrong while registring user");
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, "User registred successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { usernameoremail, password } = req.body;
  if (usernameoremail === "" && password === "") {
    throw new ApiError(400, "Email or username and password is required");
  }

  const user = await User.findOne({
    $or: [{ username: usernameoremail }, { email: usernameoremail }],
  });

  if (!user) {
    throw new ApiError(404, "User is not registred");
  }

  const isPasswordValid = await user.isPasswordCurrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentails");
  }

  const { accessToken, refreshToken } =
    await genrateAccessTokenAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, loggedInUser, "User logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const inComingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;
  if (!inComingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  const decodedToken = await Jwt.verify(
    inComingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (inComingRefreshToken !== user?.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or used");
  }

  const { accessToken, refreshToken } =
    await genrateAccessTokenAndRefreshTokens(user?._id);

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "Refreshed Access token"
      )
    );
});

const changeCurrentPasswrd = asyncHandler(async (req, res) => {
  const { oldPassword, password } = req.body;
  const user = await User.findById(req.user?._id);

  const isValidPassword = user.isPasswordCurrect(oldPassword);
  if (!isValidPassword) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = password;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Passsword updated successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullName, email, bio } = req.body;
  if (!fullName && !email && !bio) {
    throw new ApiError("All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { fullName, email, bio },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User details updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatar = req.file?.path;
  if (!avatar) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const uploadedAvatar = await uplodeOnCloudinary(avatar);
  if (!uploadedAvatar) {
    throw new ApiError(500, "Uploading avatar faild Please try again");
  }
  const oldAvtarurl = req.user?.avatar;

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: uploadedAvatar.url,
      },
    },
    { new: true }
  ).select("-password");

  if (!user) {
    throw new ApiError(500, "Updating avatar faild Please try again");
  }

  const deletefileResponse = await deleteFileFromCloudinary(oldAvtarurl);
  console.log(deletefileResponse);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image file is missing");
  }

  const coverImage = await uplodeOnCloudinary(coverImageLocalPath);
  if (!coverImage) {
    throw new ApiError(500, "Cover Image Uploading faild Please try again");
  }

  const oldCoverImageUrl = req.user?.coverImage;
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  if (!user) {
    throw new ApiError(500, "Updating Cover Image faild in database");
  }

  const coverImageDelRes = await deleteFileFromCloudinary(oldCoverImageUrl);
  console.log(coverImageDelRes);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(400, "Something went wrong while getting user");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
});

const getUserBlogProfile = asyncHandler(async (req, res) => {
  const { username } = req.parms;
  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const profile = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "userrelations",
        localField: "_id",
        foreignField: "following",
        as: "followers",
      },
    },
    {
      $lookup: {
        from: "userrelations",
        localField: "_id",
        foreignField: "follower",
        as: "following",
      },
    },
    {
      $addFields: {
        followersCount: {
          $size: "$followers",
        },
        followingCount: {
          $size: "$following",
        },
        isFollowing: {
          $cond: {
            if: {
              $in: [req.user?._id, "$followers.follower"],
            },
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        bio: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        isFollowing: 1,
        followersCount: 1,
        followingCount: 1,
      },
    },
  ]);

  if (!profile?.length) {
    throw new ApiError(200, "User dose not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, profile[0], "User Profile fetched successfully")
    );
});

const getLikedPosts = asyncHandler(async (req, res) => {
  const likesPost = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "likedBy",
        as: "likedBlogs",
        pipeline: [
          {
            $lookup: {
              from: "blogs",
              localField: "blogId",
              foreignField: "_id",
              as: "likedBlogs",
              pipeline: [
                {
                  $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "_id",
                    as: "owner",
                  },
                },
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              commentCount: {
                $size: "$comments",
              },
            },
          },
          {
            $project: {
              commentCount: 1,
              title: 1,
              image: 1,
              content: 1,
              owner: 1,
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, likesPost, "Liked blogs fetched successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPasswrd,
  updateUserDetails,
  updateAvatar,
  updateCoverImage,
  getCurrentUser,
  getUserBlogProfile,
  getLikedPosts,
};
