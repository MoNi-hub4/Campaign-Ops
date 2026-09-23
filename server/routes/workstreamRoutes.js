import express from 'express';
import WorkstreamTemplate from '../models/WorkstreamTemplate.js';
import CampaignWorkstream from '../models/CampaignWorkstream.js';

const router = express.Router();

/* ==========================================================================
   1. GLOBAL WORKSTREAM TEMPLATE ROUTES
   ========================================================================== */

router.get('/templates', async (req, res) => {
  try {
    const templates = await WorkstreamTemplate.find({ is_active: true }).sort({ display_order: 1 }).lean();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch templates', error: error.message });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const { name, description, sub_tasks } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Workstream name is required' });

    const cleanId = `template_${name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const cleanSubTasks = Array.isArray(sub_tasks)
      ? sub_tasks.map((st) => (typeof st === 'string' ? st.trim() : '')).filter((st) => st !== '')
      : [];

    const newTemplate = await WorkstreamTemplate.create({
      _id: cleanId,
      name: name.trim(),
      description: description ? description.trim() : '',
      sub_tasks: cleanSubTasks,
    });

    res.status(201).json(newTemplate);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to save template' });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const templateId = decodeURIComponent(req.params.id);
    const { name, description, sub_tasks } = req.body;

    const cleanSubTasks = Array.isArray(sub_tasks)
      ? sub_tasks.map((st) => (typeof st === 'string' ? st.trim() : '')).filter((st) => st !== '')
      : [];

    const updatedTemplate = await WorkstreamTemplate.findByIdAndUpdate(
      templateId,
      {
        name: name.trim(),
        description: description ? description.trim() : '',
        sub_tasks: cleanSubTasks,
      },
      { returnDocument: 'after', runValidators: true } // Updated option to suppress Mongoose warning
    );

    if (!updatedTemplate) return res.status(404).json({ message: 'Template not found' });
    res.json(updatedTemplate);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to update template' });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const templateId = decodeURIComponent(req.params.id);
    const deleted = await WorkstreamTemplate.findByIdAndDelete(templateId);
    if (!deleted) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete template', error: error.message });
  }
});

/* ==========================================================================
   2. CAMPAIGN WORKSTREAM ROUTES
   ========================================================================== */

router.get('/:campaignId', async (req, res) => {
  try {
    const campaignId = decodeURIComponent(req.params.campaignId);
    const workstreams = await CampaignWorkstream.find({ campaign_id: campaignId })
      .sort({ display_order: 1 })
      .lean();

    res.json(workstreams);
  } catch (error) {
    res.status(500).json({ message: 'Error loading campaign workstreams', error: error.message });
  }
});

router.post('/:campaignId', async (req, res) => {
  try {
    const campaignId = decodeURIComponent(req.params.campaignId);
    const { name, description, sub_tasks } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ message: 'Workstream name is required' });

    const cleanId = `ws_${campaignId}_custom_${Date.now()}`;
    const formattedSubtasks = Array.isArray(sub_tasks)
      ? sub_tasks
          .map((st) => (typeof st === 'string' ? st.trim() : ''))
          .filter((st) => st !== '')
          .map((title, idx) => ({
            _id: `sub_${cleanId}_${idx + 1}`,
            title,
            is_completed: false,
            link: '',
          }))
      : [];

    const newWorkstream = await CampaignWorkstream.create({
      _id: cleanId,
      campaign_id: campaignId,
      name: name.trim(),
      description: description ? description.trim() : '',
      status: 'ACTIVE',
      display_order: Date.now(),
      sub_tasks: formattedSubtasks,
    });

    res.status(201).json(newWorkstream);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to add workstream' });
  }
});

router.post('/:id/duplicate', async (req, res) => {
  try {
    const workstreamId = decodeURIComponent(req.params.id);
    const original = await CampaignWorkstream.findById(workstreamId).lean();

    if (!original) return res.status(404).json({ message: 'Workstream not found' });

    const newWorkstreamId = `ws_${original.campaign_id}_copy_${Date.now()}`;
    const duplicatedSubtasks = (original.sub_tasks || []).map((st, idx) => ({
      _id: `sub_${newWorkstreamId}_${idx + 1}`,
      title: st.title,
      is_completed: false,
      link: st.link || '',
    }));

    const duplicatedDoc = await CampaignWorkstream.create({
      _id: newWorkstreamId,
      campaign_id: original.campaign_id,
      name: `${original.name} (Copy)`,
      description: original.description || '',
      status: 'ACTIVE',
      display_order: Date.now(),
      sub_tasks: duplicatedSubtasks,
    });

    res.status(201).json(duplicatedDoc);
  } catch (error) {
    res.status(500).json({ message: 'Failed to duplicate workstream', error: error.message });
  }
});

router.patch('/:id/name', async (req, res) => {
  try {
    const workstreamId = decodeURIComponent(req.params.id);
    const { name } = req.body;

    const updated = await CampaignWorkstream.findByIdAndUpdate(
      workstreamId,
      { name: name.trim() },
      { returnDocument: 'after' } // Updated option to suppress Mongoose warning
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update workstream name', error: error.message });
  }
});

router.patch('/:workstreamId/subtasks/:subtaskId', async (req, res) => {
  try {
    const workstreamId = decodeURIComponent(req.params.workstreamId);
    const subtaskId = decodeURIComponent(req.params.subtaskId);
    const { is_completed, link } = req.body;

    const workstream = await CampaignWorkstream.findById(workstreamId);
    if (!workstream) return res.status(404).json({ message: 'Workstream not found' });

    const subTask = workstream.sub_tasks.id(subtaskId);
    if (!subTask) return res.status(404).json({ message: 'Sub-task not found' });

    if (typeof is_completed === 'boolean') subTask.is_completed = is_completed;
    if (typeof link === 'string') subTask.link = link.trim();

    await workstream.save();
    res.json(workstream);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update subtask', error: error.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const workstreamId = decodeURIComponent(req.params.id);
    const updated = await CampaignWorkstream.findByIdAndUpdate(
      workstreamId, 
      { status: req.body.status }, 
      { returnDocument: 'after' } // Updated option
    );
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update status', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const workstreamId = decodeURIComponent(req.params.id);
    await CampaignWorkstream.findByIdAndDelete(workstreamId);
    res.json({ message: 'Workstream deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete workstream', error: error.message });
  }
});

export default router;