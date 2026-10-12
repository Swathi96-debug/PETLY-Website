// In-memory TTL Cache for verified PIN codes (24 hour TTL)
const pinCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Clean expired cache entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [pin, entry] of pinCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      pinCache.delete(pin);
    }
  }
}, 60 * 60 * 1000).unref();

/**
 * @desc    Lookup and verify Indian Postal PIN code
 * @route   GET /api/location/pincode/:pincode
 * @access  Public
 */
export const lookupPincode = async (req, res, next) => {
  try {
    const { pincode } = req.params;
    const cleanPin = (pincode || '').trim();

    // 1. Strict 6-digit numeric check
    if (!/^\d{6}$/.test(cleanPin)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PIN code format. Must be exactly 6 numeric digits.',
      });
    }

    // 2. Cache check
    const cached = pinCache.get(cleanPin);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return res.status(200).json({
        success: true,
        source: 'cache',
        ...cached.data,
      });
    }

    // 3. Query official India Postal PIN API with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    let externalRes;
    try {
      externalRes = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        return res.status(503).json({
          success: false,
          message: 'Postal verification service timed out. Please try again.',
        });
      }
      return res.status(503).json({
        success: false,
        message: 'Postal verification service is temporarily unreachable. Please try again.',
      });
    }
    clearTimeout(timeout);

    if (!externalRes.ok) {
      return res.status(502).json({
        success: false,
        message: 'Failed to contact postal directory service.',
      });
    }

    const data = await externalRes.json();
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Unable to verify this PIN code. Please check and try again.',
      });
    }

    const firstResult = data[0];
    if (firstResult.Status !== 'Success' || !Array.isArray(firstResult.PostOffice) || firstResult.PostOffice.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Unable to verify this PIN code. No postal records found.',
      });
    }

    const postOffices = firstResult.PostOffice;
    const state = postOffices[0].State || '';
    const district = postOffices[0].District || '';
    const division = postOffices[0].Division || '';
    const region = postOffices[0].Region || '';

    // Extract unique, sanitized Area / Post Office names
    const areaNames = [...new Set(postOffices.map((po) => (po.Name || '').trim()).filter(Boolean))];

    const verifiedData = {
      pincode: cleanPin,
      state,
      district,
      division,
      region,
      areas: areaNames,
      postOffices: postOffices.map((po) => ({
        name: (po.Name || '').trim(),
        branchType: po.BranchType,
        deliveryStatus: po.DeliveryStatus,
        circle: po.Circle,
        district: po.District,
        state: po.State,
        pincode: po.Pincode,
      })),
    };

    // Store in cache
    pinCache.set(cleanPin, {
      timestamp: Date.now(),
      data: verifiedData,
    });

    return res.status(200).json({
      success: true,
      source: 'live',
      ...verifiedData,
    });
  } catch (error) {
    next(error);
  }
};
