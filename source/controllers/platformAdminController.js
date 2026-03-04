// controllers/platformAdminController.js

const { PlatformAdministrator, User, Notification } = require('../database');

// Helper: ensure request is from an authenticated platform administrator
function ensurePlatformAdmin(req, res) {
  if (!req.session || !req.session.platformAdmin) {
    res.status(401).json({ success: false, error: 'Unauthorized: platform administrator login required' });
    return null;
  }
  return req.session.platformAdmin;
}

// POST /platform-admin/login
exports.loginPlatformAdmin = async (req, res) => {
  const { email, passkey, adminId } = req.body || {};

  if (!email || !passkey || !adminId) {
    return res.status(400).json({ success: false, error: 'Email, passkey and admin ID are required' });
  }

  try {
    const admin = await PlatformAdministrator.findOne({
      email: email.toLowerCase().trim(),
      adminId: adminId.trim(),
    }).lean();

    if (!admin || admin.passkey !== passkey) {
      return res.status(401).json({ success: false, error: 'Invalid administrator credentials' });
    }

    req.session.platformAdmin = {
      id: admin._id.toString(),
      email: admin.email,
      adminId: admin.adminId,
    };

    req.session.save(err => {
      if (err) {
        console.error('Error saving platform admin session:', err);
        return res.status(500).json({ success: false, error: 'Failed to create admin session' });
      }

      return res.status(200).json({
        success: true,
        message: 'Platform administrator login successful',
        admin: {
          id: admin._id.toString(),
          email: admin.email,
          adminId: admin.adminId,
        },
        redirectPath: '/platform-admin',
      });
    });
  } catch (err) {
    console.error('Platform admin login error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error during login' });
  }
};

// GET /platform-admin/recruiters
// Returns recruiters and their document verification status
exports.getRecruitersForVerification = async (req, res) => {
  const admin = ensurePlatformAdmin(req, res);
  if (!admin) return;

  try {
    // If there is only one platform admin, ensure all recruiters are assigned to them
    const adminsCount = await PlatformAdministrator.countDocuments();
    if (adminsCount === 1) {
      await User.updateMany(
        { role: 'recruiter', assignedPlatformAdminId: null },
        { assignedPlatformAdminId: admin.id }
      );
    }

    const recruiters = await User.find({
      role: 'recruiter',
      assignedPlatformAdminId: admin.id,
    })
      .select('name email companyName companyDocumentUrl recruiterVerified recruiterVerificationMessage createdAt assignedPlatformAdminId')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, recruiters });
  } catch (err) {
    console.error('Error fetching recruiters for verification:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch recruiters' });
  }
};

// POST /platform-admin/recruiters/:id/verify
// Body: { status: 'verified' | 'reupload', message?: string }
exports.updateRecruiterVerification = async (req, res) => {
  const admin = ensurePlatformAdmin(req, res);
  if (!admin) return;

  const recruiterId = req.params.id;
  const { status, message } = req.body || {};

  if (!status || !['verified', 'reupload'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid verification status' });
  }

  try {
    const recruiter = await User.findById(recruiterId);
    if (!recruiter || recruiter.role !== 'recruiter') {
      return res.status(404).json({ success: false, error: 'Recruiter not found' });
    }

    if (status === 'verified') {
      recruiter.recruiterVerified = true;
      recruiter.recruiterVerificationMessage = message || '';
    } else {
      recruiter.recruiterVerified = false;
      recruiter.recruiterVerificationMessage = message || 'Please re-upload your company verification document.';
    }

    await recruiter.save();

    // Notify recruiter of the decision
    try {
      await Notification.create({
        user_id: recruiter._id,
        message:
          status === 'verified'
            ? 'Your company verification document has been approved. You can now create job postings.'
            : `Your company verification document requires an update. ${recruiter.recruiterVerificationMessage}`,
        type: 'other',
        is_read: false,
      });
    } catch (notifErr) {
      console.error('Failed to create recruiter verification notification:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      recruiter: {
        id: recruiter._id.toString(),
        name: recruiter.name,
        email: recruiter.email,
        companyName: recruiter.companyName,
        companyDocumentUrl: recruiter.companyDocumentUrl,
        recruiterVerified: recruiter.recruiterVerified,
        recruiterVerificationMessage: recruiter.recruiterVerificationMessage,
      },
    });
  } catch (err) {
    console.error('Error updating recruiter verification:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update recruiter verification' });
  }
};

// GET /platform-admin/summary
// Returns task counts for the logged-in platform administrator
exports.getPlatformAdminSummary = async (req, res) => {
  const admin = ensurePlatformAdmin(req, res);
  if (!admin) return;

  try {
    const adminsCount = await PlatformAdministrator.countDocuments();
    if (adminsCount === 1) {
      await User.updateMany(
        { role: 'recruiter', assignedPlatformAdminId: null },
        { assignedPlatformAdminId: admin.id }
      );
    }

    const totalAssigned = await User.countDocuments({
      role: 'recruiter',
      assignedPlatformAdminId: admin.id,
    });

    const completedTasks = await User.countDocuments({
      role: 'recruiter',
      assignedPlatformAdminId: admin.id,
      recruiterVerified: true,
    });

    const newTasks = await User.countDocuments({
      role: 'recruiter',
      assignedPlatformAdminId: admin.id,
      recruiterVerified: false,
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalAssigned,
        completedTasks,
        newTasks,
      },
    });
  } catch (err) {
    console.error('Error fetching platform admin summary:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch dashboard summary' });
  }
};
