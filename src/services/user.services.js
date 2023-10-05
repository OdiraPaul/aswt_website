require("dotenv").config();
const _ = require("lodash");
const bcrypt = require("bcrypt");
const { User } = require("../model/user.model");
const propertiesToPick = require("../common/propertiesToPick.common");
const generateRandomAvatar = require("../utils/generateRandomAvatar.utils");

class UserService {
  //Create new user
  async createUser(user) {
    const salt = await bcrypt.genSalt(10);
    // for hashing the password that is saved the database for security reasons
    user.password = await bcrypt.hash(user.password, salt);

    return await user.save();
  }

  async getUserById(userId) {
    return await User.findOne({ _id: userId, isDeleted: undefined });
  }

  async getUserWithoutPasswordById(role, userId) {
    const isUserStaff = role === "staff";
    const selectArgs = isUserStaff ? "-password" : "-password -staffDetails";

    return await User.findOne({ _id: userId, isDeleted: undefined }).select(
      selectArgs
    );
  }

  query = (role, selectArg) =>
    User.find({ role, isDeleted: undefined }).select(selectArg);

  getUsersByRole = async (role) => {
    return role === "customer"
      ? await this.query(role, "-departments -password")
      : await this.query(role, "-customerDetails -password");
  };

  async getCustomersForStaff() {
    return await User.find({ role: "customer", isDeleted: undefined }).select(
      "firstName lastName id"
    );
  }

  async getEmployees() {
    return await User.find({
      role: { $ne: "customer" },
      isDeleted: undefined,
    })
      .select("-password")
      .populate("departments");
  }

  async getUserByRoleAndId(userId, role) {
    return await User.find({ _id: userId, role, isDeleted: undefined }).select(
      "-password"
    );
  }

  async getUserByEmail(email) {
    return await User.findOne({ email, isDeleted: undefined });
  }

  async getUserWithoutPasswordByEmail(email) {
    return await User.findOne({ email, isDeleted: undefined }).select(
      "-password"
    );
  }

  async getUserByUsername(userName) {
    return await User.findOne({ userName, isDeleted: undefined }).select(
      "-password"
    );
  }

  async getStaffsByDepartments(departmentIds) {
    return await User.find({
      departments: {
        $in: departmentIds,
      },
      role: "staff",
      isDeleted: undefined,
    }).select("-password");
  }

  async getAllUsers() {
    return await User.find({ isDeleted: undefined }).select("-password");
  }

  async addSignInLocation(email, signInLocations) {
    return await User.findOneAndUpdate(
      { email },
      {
        $push: { "staffDetails.signInLocations": signInLocations },
      },
      { new: true }
    );
  }

  async updateUserById(id, user) {
    return await User.findByIdAndUpdate(
      id,
      {
        $set: user,
      },
      { new: true }
    );
  }

  async signInStaff(email, currentSignInLocation) {
    return User.findOneAndUpdate(
      { email },
      {
        $set: {
          "staffDetails.currentSignInLocation": currentSignInLocation,
          "staffDetails.isLoggedIn": true,
        },
      }
    );
  }

  async signOutStaff(email) {
    return User.findOneAndUpdate(
      { email },
      {
        $set: {
          "staffDetails.isLoggedIn": false,
        },
      }
    );
  }

  async getLoggedInStaffs() {
    return User.find({ "staffDetails.isLoggedIn": true, role: "staff" }).select(
      "-password -staffDetails.signInLocations"
    );
  }

  updateStaffTotalEarnings = async (staff, session) => {
    const staffFromDb = await User.findById(staff._id).session(session);
    staff = staffFromDb;

    const staffEarningRate = staff.staffDetails.earningRate;

    return await User.updateOne(
      { _id: staff._id },
      { $inc: { "staffDetails.totalEarning": staffEarningRate } },
      { session }
    );
  };

  async deleteUser(id) {
    return await User.findByIdAndRemove(id);
  }

  createUserWithAvatar = async (req, user, departments) => {
    if (req.body.role === "staff") propertiesToPick.push("staffDetails");

    user = new User(_.pick(req.body, [...propertiesToPick, "password"]));

    const avatarUrl = await generateRandomAvatar(user.email);
    user.avatarUrl = avatarUrl;
    user.avatarImgTag = `<img src=${avatarUrl} alt=${user._id}>`;

    user.role = user.role.toLowerCase();
    if (user.role !== "customer") user.departments = [...new Set(departments)];

    user = await this.createUser(user);

    const token = user.generateAuthToken();
    if (user.role === "staff") propertiesToPick.push("staffDetails");

    user = _.pick(user, propertiesToPick);
    // It creates a token which is sent as a header to the client

    return { user, token };
  };

  async addAvatarToUser(user) {
    const avatarUrl = await generateRandomAvatar(user.email);
    user.avatarUrl = avatarUrl;
    user.avatarImgTag = `<img src=${avatarUrl} alt=${user._id}>`;

    return user;
  }

  // modifyCustomer(req) {
  //   const { role, password } = req.body;

  //   if (role.toLowerCase() == "customer") {
  //     if (!password) req.body.password = process.env.customerPassword;

  //     propertiesToPick.push("customerDetails");
  //     const filteredFieldsArray = propertiesToPick.filter(
  //       (field) => field !== "departments"
  //     );
  //     return filteredFieldsArray;
  //   }
  //   return propertiesToPick;
  // }
  async softDeleteUser(id) {
    const user = await User.findById(id);

    user.isDeleted = true;

    return await user.save();
  }
}

module.exports = new UserService();
