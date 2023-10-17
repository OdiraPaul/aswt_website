const mongoose = require("mongoose");
const { env } = process;
const constants = {
  DATABASE_URI: process.env.DATABASE_URI,
  noSpecials: /^[a-zA-Z0-9_]+$/,
  vinRegex: /\b(?:[A-HJ-NPR-Z0-9]{17})\b/,
  DATABASES: {
    ROOM: "room",
    ROOM_TYPE: "room_type",
    USER: "user",
  },
  USER_TYPES: {
    USER: "user",
    ADMIN: "admin",
  },
  apiEndpoint: `https://sandbox-quickbooks.api.intuit.com/v3/company/${env.realmId}/payment/${env.paymentId}`,
  tokenSchema: new mongoose.Schema({
    realmId: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    expires: {
      type: Date,
      // Set the 'expires' field as a TTL index
      index: { expireAfterSeconds: 0 }, // 0 means documents expire immediately after 'expires' date
    },
  }),
  MESSAGES: {
    FETCHED: "Resource fetched successfully",
    UPDATED: "Resource updated successfully",
    ERROR: "Resource error",
    CREATED: "Resource created successfully",
    DELETED: "Resource deleted successfully",
    UNAUTHORIZE(operate) {
      return `You cannot ${operate} a resource created by another user`;
    },
    NOT_FOUND(resource) {
      return `We can't find ${resource} with the given ID`;
    },
    SUCCESFUL_LOGIN: "Sucessfully logged in",
    SUCCESFUL_LOGOUT: "Sucessfully logged out",
    LOGIN_FAILURE: "Unable to login. Username or password incorrect",
    USER_EXISTS: "User already registered",
    INVALID(ids, collection) {
      return `This ids: [${ids}] are not in the ${collection}`;
    },
  },
  DATE: {
    now: new Date(),
    yesterday: new Date(new Date().getTime() - 24 * 60 * 60 * 1000),
    twentyFourHoursInMs: 24 * 60 * 60 * 1000,
  },
  EXPIRES: 1800,

  errorMessage: (data) => {
    return {
      message: `We can't find ${data} with the given ID`,
      success: false,
    };
  },
  errorAlreadyExists(resource) {
    return {
      message: `The ${resource} has been already created.`,
      success: false,
    };
  },
  days: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  validMonthNames: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  FREE_TIME_SLOTS: {
    VALID_TIME_SLOTS: [
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
      "13:00",
      "13:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
      "17:30",
      "18:00",
      "18:30",
    ],
    COMPLETION_TIME_HOURS: 3,
    START_OF_BUSINESS: 9,
    TIME_OFFSET: 0.001,
  },
  transactionOptions: {
    readPreference: "primary",
    readConcern: { level: "local" },
    writeConcern: { w: "majority" },
  },
};

module.exports = constants;
