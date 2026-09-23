import express from 'express';
import Campaign from '../models/Campaign.js';
import CampaignWorkstream from '../models/CampaignWorkstream.js';
import WorkstreamTemplate from '../models/WorkstreamTemplate.js';

const router = express.Router();

// GET /api/campaigns - Fetch campaigns from MongoDB with dynamic progress
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ created_at: -1 }).lean();

    const campaignsWithProgress = await Promise.all(
      campaigns.map(async (campaign) => {
        const campaignId = campaign._id || campaign.id;

        const workstreams = await CampaignWorkstream.find({
          campaign_id: campaignId,
          status: 'ACTIVE',
        }).lean();

        let totalSubTasks = 0;
        let completedSubTasks = 0;

        workstreams.forEach((ws) => {
          if (Array.isArray(ws.sub_tasks)) {
            totalSubTasks += ws.sub_tasks.length;
            completedSubTasks += ws.sub_tasks.filter((st) => st.is_completed).length;
          }
        });

        return {
          id: campaignId,
          _id: campaignId,
          title: campaign.title,
          type: campaign.type,
          dateRange: campaign.dateRange,
          markets: campaign.markets,
          status: campaign.status,
          objective: campaign.objective,
          owner: campaign.owner,
          proofsCount: campaign.proofsCount || 0,
          totalTasks: totalSubTasks,
          completedTasks: completedSubTasks,
        };
      })
    );

    res.json(campaignsWithProgress);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ message: 'Failed to fetch campaigns from database', error: error.message });
  }
});

// POST /api/campaigns - Save campaign to MongoDB
router.post('/', async (req, res) => {
  try {
    const { title, type, dateRange, markets, objective, owner, selectedTemplateIds } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Campaign title is required' });
    }

    const campaignId = `campaign_${title.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

    const createdCampaignDoc = await Campaign.create({
      _id: campaignId,
      title: title.trim(),
      type: type || 'Awareness campaign',
      dateRange: dateRange || 'TBD',
      markets: markets || 'AE + KSA',
      status: 'Planning',
      objective: objective || '',
      owner: owner || 'Monishan · Onsite',
    });

    let templatesToApply = [];
    if (Array.isArray(selectedTemplateIds) && selectedTemplateIds.length > 0) {
      templatesToApply = await WorkstreamTemplate.find({ _id: { $in: selectedTemplateIds } }).lean();
    }

    if (templatesToApply.length > 0) {
      const workstreamDocs = templatesToApply.map((tmpl, idx) => ({
        _id: `ws_${campaignId}_${idx + 1}`,
        campaign_id: campaignId,
        name: tmpl.name,
        description: tmpl.description || '',
        status: 'ACTIVE',
        display_order: idx + 1,
        sub_tasks: (tmpl.sub_tasks || []).map((subTitle, subIdx) => ({
          _id: `sub_${campaignId}_${idx + 1}_${subIdx + 1}`,
          title: subTitle,
          is_completed: false,
          link: '',
        })),
      }));

      await CampaignWorkstream.insertMany(workstreamDocs);
    }

    res.status(201).json({
      id: createdCampaignDoc._id,
      _id: createdCampaignDoc._id,
      title: createdCampaignDoc.title,
      type: createdCampaignDoc.type,
      dateRange: createdCampaignDoc.dateRange,
      markets: createdCampaignDoc.markets,
      status: createdCampaignDoc.status,
      objective: createdCampaignDoc.objective,
      owner: createdCampaignDoc.owner,
      proofsCount: 0,
      totalTasks: 0,
      completedTasks: 0,
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(400).json({ message: error.message || 'Failed to create campaign' });
  }
});

// PUT /api/campaigns/:id - Update existing campaign metadata (Updated Mongoose deprecation warning)
router.put('/:id', async (req, res) => {
  try {
    const campaignId = decodeURIComponent(req.params.id);
    const { title, type, dateRange, markets, status, objective, owner } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Campaign title is required' });
    }

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      campaignId,
      {
        title: title.trim(),
        type: type || 'Awareness campaign',
        dateRange: dateRange || 'TBD',
        markets: markets || 'AE + KSA',
        status: status || 'Planning',
        objective: objective || '',
        owner: owner || 'Monishan · Onsite',
      },
      { returnDocument: 'after', runValidators: true } // Replaced `{ new: true }` to fix Mongoose warning
    );

    if (!updatedCampaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({
      id: updatedCampaign._id,
      _id: updatedCampaign._id,
      title: updatedCampaign.title,
      type: updatedCampaign.type,
      dateRange: updatedCampaign.dateRange,
      markets: updatedCampaign.markets,
      status: updatedCampaign.status,
      objective: updatedCampaign.objective,
      owner: updatedCampaign.owner,
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(400).json({ message: error.message || 'Failed to update campaign' });
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req, res) => {
  try {
    const campaignId = decodeURIComponent(req.params.id);
    await Campaign.findByIdAndDelete(campaignId);
    await CampaignWorkstream.deleteMany({ campaign_id: campaignId });
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ message: 'Failed to delete campaign', error: error.message });
  }
});

export default router;