import mongoose from "mongoose";

const userRelationsSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId, // one who is follower
      ref: "User",
    },
    following: {
      type: mongoose.Schema.Types.ObjectId, // one who is 'follower' is following
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Userrelation = mongoose.model("Userrelation", userRelationsSchema);
