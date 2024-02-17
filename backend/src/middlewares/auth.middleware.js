import { ApiError } from "../utls/apiError.js";
import { asyncHandler } from "../utls/asyncHandler.js";
import { User } from "../models/user.model.js";
import Jwt from "jsonwebtoken";

export const verifyJwt = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = Jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    req.user = user;

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    req.user = user;
    next();
  } catch (err) {
    console.log(err);
    throw new ApiError(401, err?.message || "Invalid Access token");
  }
});
