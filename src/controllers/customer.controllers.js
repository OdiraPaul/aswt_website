require("dotenv").config();
const _ = require("lodash");
const { MESSAGES } = require("../common/constants.common");
const { getOrSetCache, updateCache } = require("../utils/getOrSetCache.utils");
const customerService = require("../services/customer.service");
const initializeQbUtils = require("../utils/initializeQb.utils");
const errorChecker = require("../utils/paginationErrorChecker.utils");
const { register } = require("../controllers/user.controllers");
const userServices = require("../services/user.services");
const propertiesToPick = require("../common/propertiesToPick.common");
const { transporter, mailOptions } = require("../utils/email.utils");
const jwt = require("jsonwebtoken");
const {
  successMessage,
  jsonResponse,
  errorMessage,
} = require("../common/messages.common");

const expires = 1800;

class Customer {
  async getCustomers(req, res) {
    const qbo = await initializeQbUtils();
    const { data: customers } = await getOrSetCache(
      `customers`,
      expires,
      customerService.fetchAllCustomers,
      [qbo]
    );

    //// 'customers' now contains an array of customer records from QuickBooksc
    return res.send(successMessage(MESSAGES.FETCHED, customers));
  }

  async fetchCustomersByPage(req, res) {
    const qbo = await initializeQbUtils();
    const { pageNumber, customerName } = req.params;
    const expiryTimeInSecs = 1800;
    const pageSize = 10;

    if (customerName) {
      const { data: customer, error } = await getOrSetCache(
        `customers?name${customerName.toLowerCase()}`,
        expiryTimeInSecs,
        customerService.fetchCustomerByName,
        [qbo, customerName]
      );
      if (error) return jsonResponse(res, 404, false, error);

      return res.send(successMessage(MESSAGES.FETCHED, customer));
    }

    const { data: count } = await getOrSetCache(
      `customerCount`,
      expiryTimeInSecs,
      customerService.fetchCustomersCount,
      [qbo]
    );

    const totalPages = Math.ceil(count / pageSize);

    const { message } = errorChecker(pageNumber, totalPages);
    if (message) return jsonResponse(res, 400, false, message);

    const { data: customers, error: customersError } = await getOrSetCache(
      `customers?pageNumber${pageNumber}`,
      expiryTimeInSecs,
      customerService.fetchCustomersByPage,
      [qbo, pageNumber, pageSize]
    );

    if (customersError) return jsonResponse(res, 404, false, customersError);

    return res.send(successMessage(MESSAGES.FETCHED, customers));
  }

  async getCustomerById(req, res) {
    const id = req.params.id;

    const { data: customer, error } =
      await customerService.getOrSetCustomerOnCache(id);

    if (error)
      return jsonResponse(res, 404, false, error.Fault.Error[0].Detail);

    // 'customers' now contains an array of customer records from QuickBooksc
    return res.send(successMessage(MESSAGES.FETCHED, customer));
  }

  async updateCustomerById(req, res) {
    const { DisplayName, PrimaryEmailAddr } = req.body;

    const id = req.params.id;
    const qbo = await initializeQbUtils();

    const { data: customer, error } =
      await customerService.getOrSetCustomerOnCache(id);

    if (error)
      return jsonResponse(res, 404, false, error.Fault.Error[0].Detail);

    const { Id, SyncToken } = customer;

    console.log(req.body);

    const updatedCustomer = await customerService.updateCustomerById(
      qbo,
      Id,
      req.body,
      SyncToken
    );

    let firstName, lastName;

    const nameArray = DisplayName ? DisplayName.split(" ") : undefined;

    if (nameArray)
      [firstName, lastName] =
        nameArray.length === 1 ? [nameArray[0], nameArray[0]] : nameArray;

    req.body = {
      firstName,
      lastName,
      customerDetails: {
        companyName: req.body.CompanyName,
      },
    };

    await userServices.updateCustomerByQbId(Id, req.body);

    // Fetch all customers and update the cache
    const customers = await customerService.fetchAllCustomers(qbo);

    updateCache(`customers?Id=${id}`, expires, updatedCustomer);
    updateCache(`customers`, expires, customers);

    return res.send(successMessage(MESSAGES.FETCHED, updatedCustomer));
  }

  async createCustomer(req, res) {
    const qbo = await initializeQbUtils();
    const { DisplayName, PrimaryEmailAddr, PrimaryPhone, BillAddr, Notes } =
      req.body;
    // Create the customer in QuickBooks
    const customerData = {
      DisplayName: DisplayName,
      PrimaryEmailAddr: PrimaryEmailAddr,
      PrimaryPhone: PrimaryPhone,
      BillAddr: BillAddr,
      Notes: Notes,
      CompanyName: req.body.CompanyName,
    };

    const createdCustomer = await customerService.createQuickBooksCustomer(
      qbo,
      customerData
    );
    const id = createdCustomer.Id;

    const nameArray = DisplayName.split(" ");

    const [firstName, lastName] =
      nameArray.length === 1 ? [nameArray[0], nameArray[0]] : nameArray;

    req.body = {
      ...req.body,
      firstName,
      lastName,
      email: PrimaryEmailAddr.Address,
      role: "customer",
      customerDetails: {
        qbId: id,
        companyName: req.body.CompanyName,
      },
    };

    // Fetch all customers and update the cache
    const customers = await customerService.fetchAllCustomers(qbo);

    updateCache(`customers?Id=${id}`, expires, createdCustomer);
    updateCache(`customers`, expires, customers);

    await register(req, res, createdCustomer);
    // Send a success response
  }

  sendRegistrationLink(req, res) {
    const { email, name } = req.body;

    const emailIntro = process.env.emailIntro;

    const token = jwt.sign(
      { customerCanCreate: true },
      process.env.jwtPrivateKey,
      {
        expiresIn: "1h",
      }
    );

    const baseUrl = process.env.clientUrl;
    const subject = "Register your account";
    const emailLink = (token) => `${baseUrl}/?token=${token}`;
    const buttonInstructions = "Click this link to create your account:";
    const buttonText = "Click Link to Register";

    transporter.sendMail(
      mailOptions(
        email,
        name,
        token,
        subject,
        emailIntro,
        emailLink,
        buttonInstructions,
        buttonText
      ),
      (error, info) => {
        if (error) {
          return "Error occurred:", error;
        } else {
          res.send({ message: "Email sent successfully", success: true });
        }
      }
    );
  }
  //Delete user account entirely from the database
  async deleteUserAccount(req, res) {
    let user = await userServices.findCustomerByQbId(req.params.id);
    if (!user) return res.status(404).send(errorMessage("user"));

    const id = user._id;

    if (user.isAdmin)
      return badReqResponse(res, "You can not delete an admin account");

    await userServices.softDeleteUser(id);

    user = _.pick(user, propertiesToPick);

    res.send(successMessage(MESSAGES.DELETED, user));
  }
}

module.exports = new Customer();
