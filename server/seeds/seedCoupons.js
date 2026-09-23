import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Market from '../models/Market.js';
import Coupon from '../models/Coupon.js';
import CouponMarket from '../models/CouponMarket.js';
import CampaignCoupon from '../models/CampaignCoupon.js';

dotenv.config({ path: './.env' });

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Clearing existing coupon collections...');

    await Market.deleteMany();
    await Coupon.deleteMany();
    await CouponMarket.deleteMany();
    await CampaignCoupon.deleteMany();

    // 1. Markets
    const markets = [
      { _id: 'market_ae', code: 'AE', name: 'United Arab Emirates', currency_code: 'AED' },
      { _id: 'market_sa', code: 'SA', name: 'Saudi Arabia', currency_code: 'SAR' },
    ];
    await Market.insertMany(markets);

    // 2. Coupon from sample plan
    const coupon = await Coupon.create({
      _id: 'coupon_travel10',
      code: 'TRAVEL10',
      title: '10% Off Baby Travel',
      offer_description: 'Get 10% off selected baby travel products',
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      minimum_spend: 200,
      maximum_discount: 80,
      start_at: new Date('2026-09-07T00:00:00Z'),
      end_at: new Date('2026-09-14T23:59:59Z'),
      status: 'SCHEDULED',
      owner_id: 'user_moni',
      redemption_count: 142,
      max_redemptions: 200,
      created_by: 'user_moni',
    });

    // 3. Coupon Market relation
    await CouponMarket.create({
      _id: 'coupon_market_ae',
      coupon_id: coupon._id,
      market_id: 'market_ae',
    });

    // 4. Campaign Coupon relation
    await CampaignCoupon.create({
      _id: 'campaign_coupon_travel',
      campaign_id: 'campaign_safe_travel',
      coupon_id: coupon._id,
      touchpoint: 'Campaign Page Hero Banner',
      notes: 'Coupon code displayed below the Safe Travel hero banner',
    });

    console.log('Coupon data successfully seeded!');
    process.exit();
  } catch (error) {
    console.error(`Error with data seeding: ${error.message}`);
    process.exit(1);
  }
};

seedData();