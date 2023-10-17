const Joi = require("joi");

function validate(customer) {
  const schema = Joi.object({
    DisplayName: Joi.string().required(),
    PrimaryEmailAddr: Joi.object({
      Address: Joi.string().email().required(),
    }).required(),
    PrimaryPhone: Joi.object({
      FreeFormNumber: Joi.string()
        .pattern(/^[0-9]{3}-[0-9]{3}-[0-9]{4}$/)
        .required(),
    }).required(),
    BillAddr: Joi.object({
      Line1: Joi.string().required(),
      City: Joi.string().required(),
      Country: Joi.string().required(),
      PostalCode: Joi.string().required(),
    }).required(),
    CompanyName: Joi.string().min(3).max(255).required(),
    Notes: Joi.string(),
    password: Joi.string(),
  });

  return schema.validate(customer);
}

function validatePatch(customer) {
  const schema = Joi.object({
    DisplayName: Joi.string(),
    PrimaryEmailAddr: Joi.object({
      Address: Joi.string().email().required(),
    }),
    PrimaryPhone: Joi.object({
      FreeFormNumber: Joi.string()
        .pattern(/^[0-9]{3}-[0-9]{3}-[0-9]{4}$/)
        .required(),
    }).required(),
    BillAddr: Joi.object({
      Line1: Joi.string().required(),
      City: Joi.string().required(),
      Country: Joi.string().required(),
      PostalCode: Joi.string().required(),
    }),
    CompanyName: Joi.string().min(3).max(255),
    Notes: Joi.string(),
  });

  return schema.validate(customer);
}

function validateInvitationEmail(customer) {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().max(255).required(),
  });

  return schema.validate(customer);
}

exports.validate = validate;
exports.validatePatch = validatePatch;
exports.validateInvitationEmail = validateInvitationEmail;
