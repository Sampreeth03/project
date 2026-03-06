// controllers/paymentController.js  (Stripe)

const Stripe = require('stripe');
const { Project, ProjectMember, Channel, UserMetrics, Notification } = require('../database');
const mongoose = require('mongoose');
const { topicNormalizationMap } = require('../config/constants');

// ── Lazy Stripe instance (loads only when keys are in .env) ───────────────────
const getStripe = () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key.startsWith('sk_test_XXXX')) {
        throw new Error('Stripe secret key not configured. Set STRIPE_SECRET_KEY in .env');
    }
    return new Stripe(key, { apiVersion: '2023-10-16' });
};

const PROJECT_PRICE_PAISE = 9900; // ₹99 (Stripe uses paise for INR)

// ─────────────────────────────────────────────────────────────────────────────
// 1.  POST /api/payment/create-order
//     Creates a Stripe PaymentIntent; project data stored in metadata.
// ─────────────────────────────────────────────────────────────────────────────
exports.createOrder = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { title, description, capacity, topic, deadline } = req.body;

    if (!title || !description || !capacity || !topic || !deadline) {
        return res.status(400).json({ success: false, error: 'All project fields are required' });
    }

    try {
        const stripe = getStripe();

        const paymentIntent = await stripe.paymentIntents.create({
            amount:   PROJECT_PRICE_PAISE,
            currency: 'inr',
            // Store all project data in PaymentIntent metadata (no session required)
            metadata: { userId: req.user.id, title, description, capacity: String(capacity), topic, deadline },
        });

        return res.json({
            success:         true,
            clientSecret:    paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            publishableKey:  process.env.STRIPE_PUBLISHABLE_KEY,
        });
    } catch (err) {
        console.error('Stripe create-order error:', err.message);
        return res.status(500).json({ success: false, error: err.message || 'Failed to create payment' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2.  POST /api/payment/verify
//     Retrieves PaymentIntent from Stripe, checks status === 'succeeded',
//     then creates the project.
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyAndCreateProject = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
        return res.status(400).json({ success: false, error: 'Missing paymentIntentId' });
    }

    try {
        const stripe = getStripe();
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (intent.status !== 'succeeded') {
            return res.status(400).json({
                success: false,
                error: `Payment not completed. Status: ${intent.status}`,
            });
        }

        // Sanity check: payment belongs to this user
        if (intent.metadata.userId !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Payment mismatch' });
        }

        const userId = req.user.id;
        // Read project data from PaymentIntent metadata (stored at creation time)
        const { title, description, capacity, topic, deadline } = intent.metadata;

        if (!title || !description || !capacity || !topic || !deadline) {
            return res.status(400).json({ success: false, error: 'Incomplete project data in payment metadata' });
        }
        const normalizedTopic = topicNormalizationMap[topic.toLowerCase()] || topic;

        const project = await Project.create({
            user_id:    new mongoose.Types.ObjectId(userId),
            title, description, capacity,
            topic:      normalizedTopic,
            deadline,
            status:     'active',
            created_at: new Date(),
        });

        await ProjectMember.create({
            project_id: project._id,
            user_id:    new mongoose.Types.ObjectId(userId),
            joined_at:  new Date(),
        });

        for (const name of ['general', 'announcements']) {
            await Channel.create({
                project_id:  project._id,
                name,
                created_by:  new mongoose.Types.ObjectId(userId),
                created_at:  new Date(),
            });
        }

        await UserMetrics.findOneAndUpdate(
            { user_id: new mongoose.Types.ObjectId(userId) },
            { $inc: { active_projects: 1, total_collaborations: 1, leadership_roles: 1 } },
            { upsert: true }
        );

        await Notification.create({
            user_id: new mongoose.Types.ObjectId(userId),
            message: `Project "${title}" created after payment.`,
            type:    'project_creation',
        });

        return res.json({ success: true, message: 'Payment verified. Project created!', projectId: project._id });
    } catch (err) {
        console.error('Stripe verify error:', err.message);
        return res.status(500).json({ success: false, error: err.message || 'Verification failed' });
    }
};
