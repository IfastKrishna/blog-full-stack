import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_COLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uplodeOnCloudinary = async (filepath) => {
  try {
    if (!filepath) return null;

    const response = await cloudinary.uploader.upload(filepath, {
      resource_type: "auto",
    });

    fs.unlinkSync(filepath);
    return response;
  } catch (err) {
    fs.unlinkSync(filepath);
    return null;
  }
};

export const deleteFileFromCloudinary = async (fileurl) => {
  try {
    const urlArray = fileurl.split("/");
    const publicId = urlArray[urlArray.length - 1];
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: "auto",
    });
    console.log("file deleted successfully from cloudinary :: ", response);
    return true;
  } catch (err) {
    console.log("ERROR DELETING FILE FORM CLOUDINARY :: ", err);
    return false;
  }
};
