import express from 'express';
import Coupon from '../models/Coupon.js';
import CouponMarket from '../models/CouponMarket.js';

const router = express.Router();

// GET /api/coupons - Fetch all coupons with proper market filtering
router.get('/', async (req, res) => {
  try {
    const { region } = req.query; // e.g. "AE Only", "SA Only", "AE + SA"

    // Fetch all non-deleted coupons sorted by newest first
    const coupons = await Coupon.find({ deleted_at: null }).sort({ created_at: -1 }).lean();

    // Enrich coupon objects with linked markets
    const enrichedCoupons = await Promise.all(
      coupons.map(async (coupon) => {
        const marketLinks = await CouponMarket.find({ coupon_id: coupon._id }).lean();
        
        // Extract codes (e.g. "market_ae" -> "AE", "market_sa" -> "SA")
        const marketCodes = marketLinks.map((m) => {
          const rawId = m.market_id || '';
          return rawId.replace(/^market_/i, '').toUpperCase();
        });

        // Determine Market Badge text
        const hasAE = marketCodes.includes('AE');
        const hasSA = marketCodes.includes('SA');

        let marketDisplay = 'Global';
        if (hasAE && hasSA) {
          marketDisplay = 'AE & SA';
        } else if (hasAE) {
          marketDisplay = 'AE';
        } else if (hasSA) {
          marketDisplay = 'SA';
        }

        return {
          id: coupon._id,
          code: coupon.code,
          status: coupon.status,
          category: coupon.category_name,
          market: marketDisplay,
          hasAE,
          hasSA,
          mainText: coupon.title,
          discountType: coupon.discount_type,
          discountValue: coupon.discount_value,
          maxDiscount: coupon.maximum_discount ? `${coupon.maximum_discount}` : '0',
          minOrder: coupon.minimum_spend ? `${coupon.minimum_spend}` : '0',
          campaign: coupon.campaign_id || 'BAU',
          rawStartDate: coupon.start_at ? new Date(coupon.start_at).toISOString().split('T')[0] : '',
          rawEndDate: coupon.end_at ? new Date(coupon.end_at).toISOString().split('T')[0] : '',
          startDate: new Date(coupon.start_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
          endDate: new Date(coupon.end_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        };
      })
    );

    // Filter based on selected region selector
    let filteredData = enrichedCoupons;

    if (region === 'AE Only') {
      filteredData = enrichedCoupons.filter((c) => c.hasAE);
    } else if (region === 'SA Only') {
      filteredData = enrichedCoupons.filter((c) => c.hasSA);
    }

    res.json(filteredData);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ message: 'Error retrieving coupons', error: error.message });
  }
});

// POST /api/coupons - Save New Coupon
router.post('/', async (req, res) => {
  try {
    const {
      code,
      title,
      category_name,
      discount_type,
      discount_value,
      minimum_spend,
      maximum_discount,
      start_at,
      end_at,
      status,
      markets, // Array e.g., ["market_ae", "market_sa"]
      campaign_id,
    } = req.body;

    const cleanCode = code.toUpperCase().trim();
    const couponId = `coupon_${cleanCode.toLowerCase()}_${Date.now()}`;

    const newCoupon = await Coupon.create({
      _id: couponId,
      code: cleanCode,
      title,
      category_name: category_name || 'General',
      discount_type: discount_type || 'PERCENTAGE',
      discount_value: Number(discount_value),
      minimum_spend: Number(minimum_spend) || 0,
      maximum_discount: Number(maximum_discount) || 0,
      start_at: new Date(start_at),
      end_at: new Date(end_at),
      status: status || 'PLANNED',
      campaign_id: campaign_id && campaign_id.trim() !== '' ? campaign_id.trim() : null,
    });

    if (markets && markets.length > 0) {
      const marketDocs = markets.map((mId) => ({
        _id: `cm_${cleanCode.toLowerCase()}_${mId}_${Date.now()}`,
        coupon_id: couponId,
        market_id: mId.toLowerCase().startsWith('market_') ? mId.toLowerCase() : `market_${mId.toLowerCase()}`,
      }));
      await CouponMarket.insertMany(marketDocs);
    }

    res.status(201).json({ message: 'Coupon saved successfully', coupon: newCoupon });
  } catch (error) {
    console.error('Error saving coupon:', error);
    res.status(400).json({ message: 'Failed to save coupon', error: error.message });
  }
});

// PUT /api/coupons/:id - Update existing coupon
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      title,
      category_name,
      discount_type,
      discount_value,
      minimum_spend,
      maximum_discount,
      start_at,
      end_at,
      status,
      markets,
      campaign_id,
    } = req.body;

    const cleanCode = code.toUpperCase().trim();

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      {
        code: cleanCode,
        title,
        category_name: category_name || 'General',
        discount_type: discount_type || 'PERCENTAGE',
        discount_value: Number(discount_value),
        minimum_spend: Number(minimum_spend) || 0,
        maximum_discount: Number(maximum_discount) || 0,
        start_at: new Date(start_at),
        end_at: new Date(end_at),
        status: status || 'PLANNED',
        campaign_id: campaign_id && campaign_id.trim() !== '' ? campaign_id.trim() : null,
      },
      { new: true }
    );

    if (markets && markets.length > 0) {
      await CouponMarket.deleteMany({ coupon_id: id });
      const marketDocs = markets.map((mId) => ({
        _id: `cm_${cleanCode.toLowerCase()}_${mId}_${Date.now()}`,
        coupon_id: id,
        market_id: mId.toLowerCase().startsWith('market_') ? mId.toLowerCase() : `market_${mId.toLowerCase()}`,
      }));
      await CouponMarket.insertMany(marketDocs);
    }

    res.json({ message: 'Coupon updated successfully', coupon: updatedCoupon });
  } catch (error) {
    console.error('Update error:', error);
    res.status(400).json({ message: 'Failed to update coupon', error: error.message });
  }
});

// DELETE /api/coupons/:id - Remove coupon
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Coupon.findByIdAndDelete(id);
    await CouponMarket.deleteMany({ coupon_id: id });
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Failed to delete coupon', error: error.message });
  }
});

export default router;