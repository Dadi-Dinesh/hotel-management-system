const { verifyCustomerAccess } = require("../services/customerAccess");
function customerAccess({ allowClosed = false } = {}) {
  return async (req, res, next) => {
    try {
      const sessionId = req.params.id || req.body?.sessionId;
      if (!sessionId) return res.status(400).json({ success: false, message: "Session is required." });
      req.customerContext = await verifyCustomerAccess(req.headers["x-customer-access"] || req.body?.customerAccess, sessionId, { allowClosed });
      next();
    } catch (error) {
      res.status(error.status || 403).json({ success: false, message: error.status ? error.message : "Customer access denied." });
    }
  };
}
module.exports = { customerAccess };
