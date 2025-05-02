/**
 * Validation Middleware
 * Provides request data validation functions
 */

const { validationErrorResponse } = require('../controllers/baseController');

/**
 * Validate required fields in request body
 * @param {Array} fields - Array of required field names
 * @returns {Function} Middleware function
 */
const validateRequiredFields = (fields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    fields.forEach(field => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length > 0) {
      return validationErrorResponse(res, {
        message: 'Missing required fields',
        fields: missingFields
      });
    }
    
    next();
  };
};

/**
 * Validate ID parameter is a number
 * @param {string} paramName - The parameter name to validate (default: 'id')
 * @returns {Function} Middleware function
 */
const validateIdParam = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return validationErrorResponse(res, {
        message: `Missing ${paramName} parameter`,
        param: paramName
      });
    }
    
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      return validationErrorResponse(res, {
        message: `Invalid ${paramName} parameter, must be a number`,
        param: paramName,
        value: id
      });
    }
    
    // Convert the parameter to a number for convenience in controllers
    req.params[paramName] = parsedId;
    
    next();
  };
};

/**
 * Validate email format
 * @param {string} fieldName - The field name to validate (default: 'email')
 * @returns {Function} Middleware function
 */
const validateEmail = (fieldName = 'email') => {
  return (req, res, next) => {
    const email = req.body[fieldName];
    
    if (!email) {
      // If email is not provided, just continue
      return next();
    }
    
    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return validationErrorResponse(res, {
        message: 'Invalid email format',
        field: fieldName,
        value: email
      });
    }
    
    next();
  };
};

/**
 * Validate array field in request body
 * @param {string} fieldName - The array field name to validate
 * @param {Object} options - Options for validation
 * @returns {Function} Middleware function
 */
const validateArrayField = (fieldName, options = {}) => {
  return (req, res, next) => {
    const array = req.body[fieldName];
    
    // Check if field exists
    if (!array) {
      if (options.required) {
        return validationErrorResponse(res, {
          message: `${fieldName} is required and must be an array`,
          field: fieldName
        });
      }
      return next();
    }
    
    // Check if it's an array
    if (!Array.isArray(array)) {
      return validationErrorResponse(res, {
        message: `${fieldName} must be an array`,
        field: fieldName,
        value: array
      });
    }
    
    // Check if array is not empty
    if (options.nonEmpty && array.length === 0) {
      return validationErrorResponse(res, {
        message: `${fieldName} cannot be empty`,
        field: fieldName
      });
    }
    
    // Check min length
    if (options.minLength && array.length < options.minLength) {
      return validationErrorResponse(res, {
        message: `${fieldName} must have at least ${options.minLength} items`,
        field: fieldName,
        value: array.length
      });
    }
    
    // Check max length
    if (options.maxLength && array.length > options.maxLength) {
      return validationErrorResponse(res, {
        message: `${fieldName} cannot have more than ${options.maxLength} items`,
        field: fieldName,
        value: array.length
      });
    }
    
    next();
  };
};

/**
 * Validate a field has a specific value from a list of allowed values
 * @param {string} fieldName - The field name to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {Object} options - Options for validation
 * @returns {Function} Middleware function
 */
const validateAllowedValues = (fieldName, allowedValues, options = {}) => {
  return (req, res, next) => {
    const value = req.body[fieldName];
    
    // Check if field exists
    if (value === undefined) {
      if (options.required) {
        return validationErrorResponse(res, {
          message: `${fieldName} is required`,
          field: fieldName
        });
      }
      return next();
    }
    
    // Check if value is in allowed values
    if (!allowedValues.includes(value)) {
      return validationErrorResponse(res, {
        message: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        field: fieldName,
        value: value,
        allowedValues: allowedValues
      });
    }
    
    next();
  };
};

module.exports = {
  validateRequiredFields,
  validateIdParam,
  validateEmail,
  validateArrayField,
  validateAllowedValues
}; 