// controllers/paymentController.js

const Stripe = require('stripe');
const { Project, ProjectMember, Channel, UserMetrics, Notification } = require('../database');
const mongoose = require('mongoose');
const { topicNormalizationMap } = require('../config/constants');

const PROJECT_PRICE_PAISE = 9900; // Rs 99
const EXTENSION_PRICE_PAISE = 4900; // Rs 49
const mockPaymentStore = new Map();

const hasLikelyStripeKeys = () => {
    const secret = process.env.STRIPE_SECRET_KEY || '';
    const publishable = process.env.STRIPE_PUBLISHABLE_KEY || '';
    const secretLooksValid = secret.startsWith('sk_') && !secret.includes('XXXX') && !secret.includes('your_');
    const pubLooksValid = publishable.startsWith('pk_') && !publishable.includes('XXXX') && !publishable.includes('your_');
    return secretLooksValid && pubLooksValid;
};

const shouldUseMockPayments = () => {
    const envOverride = String(process.env.MOCK_PAYMENTS || '').toLowerCase();
    if (envOverride === 'true') return true;
    if (envOverride === 'false') return false;
    return !hasLikelyStripeKeys();
};

const getStripe = () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key.startsWith('sk_test_XXXX') || key.includes('your_')) {
        throw new Error('Stripe secret key not configured. Set STRIPE_SECRET_KEY in .env');
    }
    return new Stripe(key, { apiVersion: '2023-10-16' });
};

const parseDateOrNull = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

const isProjectExpiredByDeadline = (project) => {
    if (!project?.deadline) return false;
    if (project.status === 'completed') return false;
    return new Date(project.deadline).getTime() <= Date.now();
};

const createMockIntent = (metadata, amount) => {
    const id = `mock_pi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const intent = {
        id,
        status: 'succeeded',
        amount,
        currency: 'inr',
        metadata,
        client_secret: `mock_secret_${id}`,
    };
    mockPaymentStore.set(id, intent);
    return intent;
};

const getPaymentIntent = async (paymentIntentId) => {
    if (paymentIntentId.startsWith('mock_pi_')) {
        return mockPaymentStore.get(paymentIntentId) || null;
    }

    const stripe = getStripe();
    return stripe.paymentIntents.retrieve(paymentIntentId);
};

const createProjectAfterPayment = async ({ userId, title, description, capacity, topic, deadline }) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const normalizedTopic = topicNormalizationMap[String(topic).toLowerCase()] || topic;

    const project = await Project.create({
        user_id: userObjectId,
        title,
        description,
        capacity: Number(capacity),
        topic: normalizedTopic,
        deadline,
        status: 'active',
        created_at: new Date(),
    });

    await ProjectMember.create({
        project_id: project._id,
        user_id: userObjectId,
        joined_at: new Date(),
    });

    for (const name of ['general', 'announcements']) {
        await Channel.create({
            project_id: project._id,
            name,
            created_by: userObjectId,
            created_at: new Date(),
        });
    }

    await UserMetrics.findOneAndUpdate(
        { user_id: userObjectId },
        {
            $inc: {
                active_projects: 1,
                total_collaborations: 1,
                leadership_roles: 1,
                projects_created_lifetime: 1,
            },
        },
        { upsert: true }
    );

    await Notification.create({
        user_id: userObjectId,
        message: `Project "${title}" created after payment.`,
        type: 'project_creation',
    });

    return project;
};

exports.createOrder = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
        title,
        description,
        capacity,
        topic,
        deadline,
        paymentType,
        projectId,
        newDeadline,
    } = req.body;

    const userId = req.user.id;

    try {
        let metadata;
        let amount;

        if (paymentType === 'project_extension') {
            if (!projectId || !newDeadline) {
                return res.status(400).json({ success: false, error: 'projectId and newDeadline are required for extension payment' });
            }

            const project = await Project.findById(projectId);
            if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
            if (project.user_id.toString() !== userId) return res.status(403).json({ success: false, error: 'Only creator can extend deadline' });
            if (project.status === 'completed') return res.status(400).json({ success: false, error: 'Completed projects cannot be extended' });
            if (!isProjectExpiredByDeadline(project)) {
                return res.status(400).json({ success: false, error: 'Only expired projects can be extended.' });
            }

            const parsedNewDeadline = parseDateOrNull(newDeadline);
            if (!parsedNewDeadline || parsedNewDeadline.getTime() <= Date.now()) {
                return res.status(400).json({ success: false, error: 'New deadline must be a valid future date' });
            }

            metadata = {
                userId,
                paymentType: 'project_extension',
                projectId: String(projectId),
                newDeadline: parsedNewDeadline.toISOString(),
            };
            amount = EXTENSION_PRICE_PAISE;
        } else {
            if (!title || !description || !capacity || !topic || !deadline) {
                return res.status(400).json({ success: false, error: 'All project fields are required' });
            }

            metadata = {
                userId,
                paymentType: 'project_creation',
                title,
                description,
                capacity: String(capacity),
                topic,
                deadline,
            };
            amount = PROJECT_PRICE_PAISE;
        }

        const useMock = shouldUseMockPayments();

        let paymentIntent;
        let mockMode = useMock;
        if (mockMode) {
            paymentIntent = createMockIntent(metadata, amount);
        } else {
            try {
                const stripe = getStripe();
                paymentIntent = await stripe.paymentIntents.create({
                    amount,
                    currency: 'inr',
                    metadata,
                    automatic_payment_methods: {
                        enabled: true,
                    },
                });
            } catch (stripeErr) {
                // Graceful fallback for invalid/misconfigured keys during local development.
                if ((stripeErr.message || '').toLowerCase().includes('invalid api key')) {
                    console.warn('Stripe key invalid. Falling back to mock payments for this request.');
                    paymentIntent = createMockIntent(metadata, amount);
                    mockMode = true;
                } else {
                    throw stripeErr;
                }
            }
        }

        return res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
            mockMode,
            amount,
            paymentType: metadata.paymentType,
        });
    } catch (err) {
        console.error('create-order error:', err.message);
        return res.status(500).json({ success: false, error: err.message || 'Failed to create payment' });
    }
};

exports.verifyAndCreateProject = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
        return res.status(400).json({ success: false, error: 'Missing paymentIntentId' });
    }

    try {
        const intent = await getPaymentIntent(paymentIntentId);
        if (!intent) {
            return res.status(404).json({ success: false, error: 'Payment intent not found' });
        }

        if (intent.status !== 'succeeded') {
            return res.status(400).json({
                success: false,
                error: `Payment not completed. Status: ${intent.status}`,
            });
        }

        if (intent.metadata.userId !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Payment mismatch' });
        }

        const paymentType = intent.metadata.paymentType || 'project_creation';

        if (paymentType === 'project_extension') {
            const projectId = intent.metadata.projectId;
            const newDeadline = parseDateOrNull(intent.metadata.newDeadline);
            if (!projectId || !newDeadline) {
                return res.status(400).json({ success: false, error: 'Incomplete extension data in payment metadata' });
            }

            const project = await Project.findById(projectId);
            if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
            if (project.user_id.toString() !== req.user.id) return res.status(403).json({ success: false, error: 'Only creator can extend deadline' });
            if (project.status === 'completed') return res.status(400).json({ success: false, error: 'Completed projects cannot be extended' });
            if (!isProjectExpiredByDeadline(project)) {
                return res.status(400).json({ success: false, error: 'Only expired projects can be extended.' });
            }

            project.deadline = newDeadline;
            await project.save();

            const userObjectId = new mongoose.Types.ObjectId(req.user.id);
            await UserMetrics.findOneAndUpdate(
                { user_id: userObjectId },
                { $inc: { project_deadline_extensions_paid: 1 } },
                { upsert: true }
            );

            await Notification.create({
                user_id: userObjectId,
                message: `Deadline extended to ${newDeadline.toISOString().slice(0, 10)} for project "${project.title}".`,
                type: 'project_creation',
            });

            return res.json({
                success: true,
                purpose: 'project_extension',
                message: 'Payment verified. Project deadline extended!',
                projectId: project._id,
                deadline: project.deadline,
            });
        }

        const { title, description, capacity, topic, deadline } = intent.metadata;
        if (!title || !description || !capacity || !topic || !deadline) {
            return res.status(400).json({ success: false, error: 'Incomplete project data in payment metadata' });
        }

        const project = await createProjectAfterPayment({
            userId: req.user.id,
            title,
            description,
            capacity,
            topic,
            deadline,
        });

        return res.json({
            success: true,
            purpose: 'project_creation',
            message: 'Payment verified. Project created!',
            projectId: project._id,
        });
    } catch (err) {
        console.error('verify error:', err.message);
        return res.status(500).json({ success: false, error: err.message || 'Verification failed' });
    }
};
